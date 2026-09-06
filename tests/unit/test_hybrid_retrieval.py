from app.ingestion.metadata import Chunk, ChunkMetadata
from app.models.cohere_client import CohereClient
from app.retrieval.bm25 import BM25Index
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.vector_store import QdrantVectorStore

def test_bm25_search():
    bm = BM25Index()
    meta1 = ChunkMetadata(document_id='doc1', document_title='FlashAttention', filename='fa.pdf', page_number=1)
    meta2 = ChunkMetadata(document_id='doc2', document_title='Medusa', filename='med.pdf', page_number=1)
    c1 = Chunk(chunk_id='1', text='FlashAttention computes exact softmax in SRAM using tiling.', metadata=meta1)
    c2 = Chunk(chunk_id='2', text='Medusa uses multiple decoding heads for parallel tokens.', metadata=meta2)
    bm.add_chunks([c1, c2])
    # Unscoped search must return []
    assert bm.search(query='SRAM tiling softmax', top_k=2) == []
    # Scoped search returns doc1
    res = bm.search(query='SRAM tiling softmax', top_k=2, allowed_document_ids=['doc1'])
    assert len(res) >= 1
    assert res[0].metadata.document_title == 'FlashAttention'

def test_hybrid_retriever_pipeline(mock_cohere_client: CohereClient):
    vs = QdrantVectorStore(location=':memory:', collection_name='hybrid_test')
    bm = BM25Index()
    meta1 = ChunkMetadata(document_id='doc1', document_title='Speculative', filename='sp.pdf', page_number=1)
    c1 = Chunk(chunk_id='11111111-1111-1111-1111-111111111111', text='Speculative decoding uses a draft model.', metadata=meta1, embedding=mock_cohere_client.embed(['Speculative'])[0])
    vs.add_chunks([c1])
    bm.add_chunks([c1])
    retriever = HybridRetriever(vector_store=vs, bm25_index=bm, cohere_client=mock_cohere_client)
    # Unscoped retrieve must return empty
    unscoped_candidates, unscoped_reranked = retriever.retrieve(query='speculative draft', top_k=5, rerank_top_k=2)
    assert len(unscoped_candidates) == 0
    assert len(unscoped_reranked) == 0
    # Scoped retrieve returns doc1
    candidates, reranked = retriever.retrieve(query='speculative draft', top_k=5, rerank_top_k=2, allowed_document_ids=['doc1'])
    assert len(candidates) >= 1
    assert len(reranked) >= 1
    assert reranked[0].metadata.document_title == 'Speculative'

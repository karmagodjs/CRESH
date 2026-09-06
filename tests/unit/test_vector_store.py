from app.ingestion.metadata import Chunk, ChunkMetadata
from app.models.cohere_client import CohereClient
from app.retrieval.vector_store import QdrantVectorStore

def test_qdrant_vector_store_crud(in_memory_vector_store: QdrantVectorStore, mock_cohere_client: CohereClient):
    meta1 = ChunkMetadata(document_id='doc1', document_title='Doc 1', filename='doc1.pdf', page_number=1)
    meta2 = ChunkMetadata(document_id='doc2', document_title='Doc 2', filename='doc2.pdf', page_number=1)
    c1 = Chunk(chunk_id='11111111-1111-1111-1111-111111111111', text='Text 1', metadata=meta1, embedding=mock_cohere_client.embed(['Text 1'])[0])
    c2 = Chunk(chunk_id='22222222-2222-2222-2222-222222222222', text='Text 2', metadata=meta2, embedding=mock_cohere_client.embed(['Text 2'])[0])
    count_added = in_memory_vector_store.add_chunks([c1, c2])
    assert count_added == 2
    assert in_memory_vector_store.count() == 2
    q_vec = mock_cohere_client.embed(['Query'])[0]
    # Unscoped similarity_search must return []
    assert in_memory_vector_store.similarity_search(query_vector=q_vec, top_k=2) == []
    # Scoped similarity_search returns results
    results = in_memory_vector_store.similarity_search(query_vector=q_vec, top_k=2, allowed_document_ids=['doc1', 'doc2'])
    assert len(results) == 2
    deleted = in_memory_vector_store.delete_document('doc1')
    assert deleted is True
    health = in_memory_vector_store.health_check()
    assert health['status'] == 'healthy'

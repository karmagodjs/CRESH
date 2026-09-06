from app.agent.graph import get_research_graph
from app.ingestion.metadata import Chunk, ChunkMetadata
from app.models.cohere_client import get_cohere_client
from app.retrieval.bm25 import get_bm25_index
from app.retrieval.vector_store import get_vector_store

def test_full_agent_workflow():
    client = get_cohere_client()
    vs = get_vector_store()
    bm = get_bm25_index()
    text = 'Speculative decoding uses a draft model to predict tokens.'
    meta = ChunkMetadata(document_id='doc_int_1', document_title='Speculative Decoding Paper', filename='sd.pdf', page_number=2)
    c = Chunk(chunk_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', text=text, metadata=meta, embedding=client.embed([text])[0])
    vs.add_chunks([c])
    bm.add_chunks([c])
    graph = get_research_graph()
    initial_state = {'query': 'How does speculative decoding work?', 'original_query': 'How does speculative decoding work?', 'query_type': 'factual', 'is_complex': False, 'sub_questions': [], 'current_document_ids': ['doc_int_1'], 'retrieved_documents': [], 'reranked_documents': [], 'evidence': [], 'evidence_sufficient': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 2, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {'allowed_document_ids': ['doc_int_1'], 'document_id': 'doc_int_1'}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
    final_state = graph.invoke(initial_state)
    assert len(final_state['answer']) > 0
    assert 'Query Analysis' in final_state['execution_trace']
    assert any('Cohere Rerank' in step for step in final_state['execution_trace'])
    assert 'Confidence / Grounding Check' in final_state['execution_trace']
    assert final_state['confidence'] >= 0.7

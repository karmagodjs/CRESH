import pytest
from pathlib import Path
from app.agent.graph import get_research_graph
from app.api.routes_documents import ingest_document_safely
from app.ingestion.parser import PDFParser
from app.retrieval.bm25 import get_bm25_index
from app.retrieval.vector_store import get_vector_store

@pytest.fixture(scope='module')
def setup_bert_and_medusa():
    vs = get_vector_store()
    bm = get_bm25_index()
    parser = PDFParser()
    bert_pdf_path = Path('data/sample_papers/1810.04805v2.pdf')
    assert bert_pdf_path.exists(), 'BERT PDF not found'
    with open(bert_pdf_path, 'rb') as fp:
        bert_bytes = fp.read()
    bert_doc = ingest_document_safely(file_bytes=bert_bytes, filename='1810.04805v2.pdf')

    medusa_pdf_path = Path('data/sample_papers/medusa_decoding.pdf')
    with open(medusa_pdf_path, 'rb') as fp:
        medusa_bytes = fp.read()
    medusa_doc = ingest_document_safely(file_bytes=medusa_bytes, filename='medusa_decoding.pdf')

    return {'bert': bert_doc, 'medusa': medusa_doc, 'bert_id': bert_doc.document_id, 'medusa_id': medusa_doc.document_id}

def test_regression_bert_vs_medusa_isolation(setup_bert_and_medusa):
    bert_id = setup_bert_and_medusa['bert_id']
    graph = get_research_graph()
    initial_state = {'query': 'What is this paper about?', 'original_query': 'What is this paper about?', 'query_type': 'factual', 'is_complex': False, 'sub_questions': [], 'current_document_ids': [bert_id], 'retrieved_documents': [], 'retrieved_chunks': [], 'reranked_documents': [], 'reranked_chunks': [], 'validated_evidence': [], 'evidence': [], 'evidence_sufficient': True, 'grounded': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 2, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {'allowed_document_ids': [bert_id], 'document_id': bert_id}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
    final_state = graph.invoke(initial_state)

    retrieved = final_state.get('retrieved_documents', [])
    assert len(retrieved) > 0
    for r in retrieved:
        doc_id = r.get('metadata', {}).get('document_id')
        assert doc_id == bert_id, f'Contamination: got {doc_id} vs {bert_id}'
        doc_name = r.get('metadata', {}).get('document_title', '').lower()
        assert 'medusa' not in doc_name
        assert 'speculative' not in doc_name

    citations = final_state.get('citations', [])
    assert len(citations) > 0
    for c in citations:
        assert c['document_id'] == bert_id
        assert 'medusa' not in c['document_title'].lower()

    answer = final_state.get('answer', '')
    assert 'BERT' in answer or 'bidirectional' in answer.lower()
    assert 'medusa' not in answer.lower()
    assert final_state['confidence'] >= 0.7

def test_masked_language_modeling_query(setup_bert_and_medusa):
    bert_id = setup_bert_and_medusa['bert_id']
    graph = get_research_graph()
    initial_state = {'query': 'What is the role of Masked Language Modeling in BERT?', 'original_query': 'What is the role of Masked Language Modeling in BERT?', 'query_type': 'factual', 'is_complex': False, 'sub_questions': [], 'current_document_ids': [bert_id], 'retrieved_documents': [], 'retrieved_chunks': [], 'reranked_documents': [], 'reranked_chunks': [], 'validated_evidence': [], 'evidence': [], 'evidence_sufficient': True, 'grounded': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 2, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {'allowed_document_ids': [bert_id], 'document_id': bert_id}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
    final_state = graph.invoke(initial_state)

    answer = final_state.get('answer', '')
    assert len(answer) > 0
    assert any(k in answer.lower() for k in ['masked language model', 'mlm', 'mask', 'pre-training', 'bert'])
    citations = final_state.get('citations', [])
    assert len(citations) > 0
    for c in citations:
        assert c['document_id'] == bert_id

def test_negative_test_medusa_on_bert(setup_bert_and_medusa):
    bert_id = setup_bert_and_medusa['bert_id']
    graph = get_research_graph()
    initial_state = {'query': 'According to this paper, what is Medusa decoding?', 'original_query': 'According to this paper, what is Medusa decoding?', 'query_type': 'factual', 'is_complex': False, 'sub_questions': [], 'current_document_ids': [bert_id], 'retrieved_documents': [], 'retrieved_chunks': [], 'reranked_documents': [], 'reranked_chunks': [], 'validated_evidence': [], 'evidence': [], 'evidence_sufficient': True, 'grounded': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 1, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {'allowed_document_ids': [bert_id], 'document_id': bert_id}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
    final_state = graph.invoke(initial_state)

    answer = final_state.get('answer', '').lower()
    assert "insufficient evidence" in answer or "don't have sufficient evidence" in answer
    assert final_state.get('evidence_sufficient') is False
    assert final_state.get('grounded') is False
    assert final_state.get('confidence') == 0.0
    assert len(final_state.get('citations', [])) == 0

def test_cross_document_retrieval_with_both_selected(setup_bert_and_medusa):
    bert_id = setup_bert_and_medusa['bert_id']
    medusa_id = setup_bert_and_medusa['medusa_id']
    graph = get_research_graph()
    initial_state = {'query': 'Compare the pre-training architecture of BERT with the decoding heads of Medusa.', 'original_query': 'Compare the pre-training architecture of BERT with the decoding heads of Medusa.', 'query_type': 'comparative', 'is_complex': True, 'sub_questions': ['What is the pre-training architecture of BERT?', 'What are the decoding heads of Medusa?'], 'current_document_ids': [bert_id, medusa_id], 'retrieved_documents': [], 'retrieved_chunks': [], 'reranked_documents': [], 'reranked_chunks': [], 'validated_evidence': [], 'evidence': [], 'evidence_sufficient': True, 'grounded': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 2, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {'allowed_document_ids': [bert_id, medusa_id]}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
    final_state = graph.invoke(initial_state)

    retrieved = final_state.get('retrieved_documents', [])
    retrieved_doc_ids = {r.get('metadata', {}).get('document_id') for r in retrieved}
    assert bert_id in retrieved_doc_ids
    assert medusa_id in retrieved_doc_ids

    citations = final_state.get('citations', [])
    assert len(citations) >= 1
    for c in citations:
        assert c['document_id'] in {bert_id, medusa_id}

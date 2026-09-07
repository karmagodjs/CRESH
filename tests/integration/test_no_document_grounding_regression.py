import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.agent.graph import get_research_graph
from app.api.routes_documents import ingest_document_safely
from app.ingestion.parser import PDFParser
from app.main import app
from app.models.cohere_client import get_cohere_client
from app.retrieval.bm25 import get_bm25_index
from app.retrieval.vector_store import get_vector_store

NO_DOC_REFUSAL = "No document is currently selected. Please upload a document before asking questions."
INSUFFICIENT_EVIDENCE_REFUSAL = "I don't have sufficient evidence in the selected document to answer this question."

@pytest.fixture(scope="module")
def setup_bert_and_medusa():
    vs = get_vector_store()
    bm = get_bm25_index()
    parser = PDFParser()
    cohere_client = get_cohere_client()

    bert_pdf_path = Path("data/sample_papers/1810.04805v2.pdf")
    assert bert_pdf_path.exists(), "BERT PDF not found"
    with open(bert_pdf_path, "rb") as fp:
        bert_bytes = fp.read()
    bert_doc = ingest_document_safely(file_bytes=bert_bytes, filename="1810.04805v2.pdf")

    medusa_pdf_path = Path("data/sample_papers/medusa_decoding.pdf")
    assert medusa_pdf_path.exists(), "Medusa PDF not found"
    with open(medusa_pdf_path, "rb") as fp:
        medusa_bytes = fp.read()
    medusa_doc = ingest_document_safely(file_bytes=medusa_bytes, filename="medusa_decoding.pdf")

    return {
        "bert": bert_doc,
        "medusa": medusa_doc,
        "bert_id": bert_doc.document_id,
        "medusa_id": medusa_doc.document_id,
    }

def make_initial_state(query: str, document_ids=None):
    doc_ids = document_ids or []
    return {
        "query": query,
        "original_query": query,
        "query_type": "factual",
        "is_complex": False,
        "sub_questions": [],
        "current_document_ids": doc_ids,
        "retrieved_documents": [],
        "retrieved_chunks": [],
        "reranked_documents": [],
        "reranked_chunks": [],
        "validated_evidence": [],
        "evidence": [],
        "evidence_sufficient": True,
        "grounded": True,
        "retrieval_attempt": 1,
        "max_retrieval_attempts": 2,
        "missing_evidence_summary": "",
        "answer": "",
        "key_points": [],
        "citations": [],
        "grounding": {},
        "confidence": 0.0,
        "regeneration_attempt": 0,
        "max_regeneration_attempts": 2,
        "metadata": {
            "allowed_document_ids": doc_ids,
            "document_id": doc_ids[0] if len(doc_ids) == 1 else None,
        } if doc_ids else {},
        "errors": [],
        "latency": {},
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "execution_trace": [],
    }

def test_a_no_document_selected_bert_query(setup_bert_and_medusa):

    client = get_cohere_client()
    client.reset_generation_call_count()

    graph = get_research_graph()
    initial_state = make_initial_state("What is BERT?", document_ids=[])
    final_state = graph.invoke(initial_state)

    assert final_state["answer"] == NO_DOC_REFUSAL
    assert final_state["confidence"] == 0.0
    assert final_state.get("grounding_status") == "BLOCKED"
    assert final_state.get("document_scope_valid") is False
    assert final_state.get("answerable") is False
    assert final_state["evidence"] == []
    assert final_state["citations"] == []
    assert final_state.get("retrieved_documents", []) == []
    assert client.generation_call_count == 0
    assert "Blocked (No Document Selected)" in final_state.get("execution_trace", [])
    assert "Generation (Cohere Command)" not in final_state.get("execution_trace", [])

def test_b_no_document_selected_medusa_query(setup_bert_and_medusa):

    client = get_cohere_client()
    client.reset_generation_call_count()

    graph = get_research_graph()
    initial_state = make_initial_state("What is Medusa decoding?", document_ids=[])
    final_state = graph.invoke(initial_state)

    assert final_state["answer"] == NO_DOC_REFUSAL
    assert final_state["confidence"] == 0.0
    assert final_state.get("grounding_status") == "BLOCKED"
    assert final_state.get("document_scope_valid") is False
    assert final_state["evidence"] == []
    assert final_state["citations"] == []
    assert client.generation_call_count == 0

def test_c_no_document_selected_python_query(setup_bert_and_medusa):

    client = get_cohere_client()
    client.reset_generation_call_count()

    graph = get_research_graph()
    initial_state = make_initial_state("What is Python?", document_ids=[])
    final_state = graph.invoke(initial_state)

    assert final_state["answer"] == NO_DOC_REFUSAL
    assert final_state["confidence"] == 0.0
    assert final_state.get("grounding_status") == "BLOCKED"
    assert final_state.get("document_scope_valid") is False
    assert final_state["evidence"] == []
    assert final_state["citations"] == []
    assert client.generation_call_count == 0

def test_d_bert_selected_mlm_query(setup_bert_and_medusa):

    bert_id = setup_bert_and_medusa["bert_id"]
    client = get_cohere_client()
    client.reset_generation_call_count()

    graph = get_research_graph()
    initial_state = make_initial_state("What is Masked Language Modeling in BERT?", document_ids=[bert_id])
    final_state = graph.invoke(initial_state)

    answer = final_state.get("answer", "")
    assert len(answer) > 0
    assert NO_DOC_REFUSAL not in answer
    assert any(k in answer.lower() for k in ["masked", "mlm", "token", "predict", "pre-training"])
    assert final_state["confidence"] >= 0.8
    assert final_state.get("grounding_status") == "GROUNDED"
    assert final_state.get("document_scope_valid") is True

    citations = final_state.get("citations", [])
    assert len(citations) > 0
    for c in citations:
        assert c["document_id"] == bert_id
        assert "medusa" not in c.get("document_title", "").lower()

    assert client.generation_call_count >= 1

def test_e_bert_selected_medusa_query_negative(setup_bert_and_medusa):

    bert_id = setup_bert_and_medusa["bert_id"]
    graph = get_research_graph()
    initial_state = make_initial_state("What is Medusa decoding?", document_ids=[bert_id])
    final_state = graph.invoke(initial_state)

    answer = final_state.get("answer", "").lower()
    assert "insufficient evidence" in answer or "don't have sufficient evidence" in answer
    assert final_state["confidence"] == 0.0
    assert final_state.get("grounding_status") in ["INSUFFICIENT", "INSUFFICIENT_EVIDENCE"]
    assert len(final_state.get("citations", [])) == 0

    assert "multiple decoding heads" not in answer
    assert "speculative decoding" not in answer

def test_f_session_reset_deselection(setup_bert_and_medusa):

    bert_id = setup_bert_and_medusa["bert_id"]
    client = get_cohere_client()
    graph = get_research_graph()

    state_step1 = make_initial_state("What is BERT?", document_ids=[bert_id])
    res_step1 = graph.invoke(state_step1)
    assert len(res_step1["answer"]) > 0
    assert res_step1["confidence"] > 0.0

    client.reset_generation_call_count()
    state_step2 = make_initial_state("What is BERT?", document_ids=[])
    res_step2 = graph.invoke(state_step2)

    assert res_step2["answer"] == NO_DOC_REFUSAL
    assert res_step2["confidence"] == 0.0
    assert res_step2.get("grounding_status") == "BLOCKED"
    assert res_step2.get("document_scope_valid") is False
    assert res_step2["evidence"] == []
    assert res_step2["citations"] == []
    assert client.generation_call_count == 0

def test_g_ingestion_without_selection(setup_bert_and_medusa):

    client = get_cohere_client()
    client.reset_generation_call_count()
    graph = get_research_graph()

    state_no_doc = make_initial_state("What is Medusa?", document_ids=[])
    res_no_doc = graph.invoke(state_no_doc)

    assert res_no_doc["answer"] == NO_DOC_REFUSAL
    assert res_no_doc["confidence"] == 0.0
    assert res_no_doc.get("grounding_status") == "BLOCKED"
    assert res_no_doc.get("document_scope_valid") is False
    assert res_no_doc["evidence"] == []
    assert res_no_doc["citations"] == []
    assert client.generation_call_count == 0

def test_h_document_isolation_sanity(setup_bert_and_medusa):

    bert_id = setup_bert_and_medusa["bert_id"]
    medusa_id = setup_bert_and_medusa["medusa_id"]
    graph = get_research_graph()

    state = make_initial_state("What is BERT?", document_ids=[bert_id])
    res = graph.invoke(state)

    retrieved = res.get("retrieved_documents", [])
    assert len(retrieved) > 0

    for r in retrieved:
        doc_id = r.get("metadata", {}).get("document_id") if isinstance(r, dict) else r.metadata.document_id
        assert doc_id == bert_id, f"Cross-document leak detected: {doc_id} != {bert_id}"
        assert doc_id != medusa_id

    for chunk in res.get("retrieved_chunks", []):
        doc_id = chunk.get("metadata", {}).get("document_id") if isinstance(chunk, dict) else chunk.metadata.document_id
        assert doc_id == bert_id
        assert doc_id != medusa_id

    for chunk in res.get("reranked_chunks", []):
        doc_id = chunk.get("metadata", {}).get("document_id") if isinstance(chunk, dict) else chunk.metadata.document_id
        assert doc_id == bert_id
        assert doc_id != medusa_id

    for cit in res.get("citations", []):
        assert cit["document_id"] == bert_id
        assert cit["document_id"] != medusa_id

def test_api_no_document_selected():

    client = TestClient(app)
    cohere_client = get_cohere_client()
    cohere_client.reset_generation_call_count()

    response = client.post("/query", json={"query": "What is BERT?", "selected_document_ids": []})
    assert response.status_code == 200
    data = response.json()

    assert data["answer"] == NO_DOC_REFUSAL
    assert data["confidence"] == 0.0
    assert data["grounding_status"] == "BLOCKED"
    assert data["document_scope_valid"] is False
    assert data["answerable"] is False
    assert data["citations"] == []
    assert data["candidate_passages"] == []
    assert data["reranked_passages"] == []
    assert cohere_client.generation_call_count == 0

    response2 = client.post("/query", json={"query": "What is Medusa?", "allowed_document_ids": []})
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["answer"] == NO_DOC_REFUSAL
    assert data2["confidence"] == 0.0
    assert data2["grounding_status"] == "BLOCKED"
    assert cohere_client.generation_call_count == 0

import pytest
from app.agent.graph import get_research_graph
from app.retrieval.hybrid import HybridRetriever


def test_no_document_selected_safety():
    graph = get_research_graph()
    state = {
        "query": "What is BERT?",
        "original_query": "What is BERT?",
        "current_document_ids": [],
        "metadata": {"allowed_document_ids": []},
        "retrieved_documents": [],
        "retrieved_chunks": [],
        "reranked_documents": [],
        "citations": [],
        "latency": {},
        "timings_ms": {},
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "execution_trace": []
    }
    result = graph.invoke(state)
    assert result["document_scope_valid"] is False
    assert result["grounding_status"] == "BLOCKED"
    assert "No document is currently selected" in result["answer"]
    assert len(result["retrieved_documents"]) == 0
    assert len(result["reranked_documents"]) == 0
    assert len(result["citations"]) == 0


def test_strict_document_scoped_hybrid_retrieval():
    retriever = HybridRetriever()
    allowed_doc_id = "fe0ee73b-2daf-5064-be62-873a3d615a5a"
    candidates, _ = retriever.retrieve(
        query="Masked Language Modeling",
        top_k=10,
        allowed_document_ids=[allowed_doc_id]
    )
    for c in candidates:
        assert c.metadata.document_id == allowed_doc_id


def test_citation_document_scope_enforcement():
    graph = get_research_graph()
    allowed_doc_id = "fe0ee73b-2daf-5064-be62-873a3d615a5a"
    state = {
        "query": "What does BERT stand for?",
        "original_query": "What does BERT stand for?",
        "current_document_ids": [allowed_doc_id],
        "metadata": {"allowed_document_ids": [allowed_doc_id]},
        "latency": {},
        "timings_ms": {},
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "execution_trace": []
    }
    result = graph.invoke(state)
    for c in result.get("citations", []):
        assert c["document_id"] == allowed_doc_id

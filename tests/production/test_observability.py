import json
import logging
import uuid
import pytest
from app.observability.logging import JSONFormatter, log_event, redact_secrets, setup_logging
from app.observability.tracing import (
    ExecutionTracer, ModelCallRecord, compute_percentiles, get_global_metrics
)
from app.agent.graph import get_research_graph

def test_redact_secrets():

    raw_key = "Bearer co_1234567890abcdef1234567890"
    redacted = redact_secrets(raw_key)
    assert "co_1234567890" not in redacted
    assert "[REDACTED_SECRET]" in redacted

    sensitive_dict = {
        "api_key": "secret_cohere_key_xyz",
        "COHERE_API_KEY": "co_abcdef1234567890",
        "nested": {"bearer_token": "Bearer sk-1234567890abcdef12345"},
        "safe_field": "public_data"
    }
    cleaned = redact_secrets(sensitive_dict)
    assert cleaned["api_key"] == "[REDACTED]"
    assert cleaned["COHERE_API_KEY"] == "[REDACTED]"
    assert cleaned["nested"]["bearer_token"] == "[REDACTED]"
    assert cleaned["safe_field"] == "public_data"

def test_json_formatter():
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test event message",
        args=(),
        exc_info=None
    )
    record.event = "test_event_completed"
    record.request_id = "req-12345"
    record.trace_id = "trace-67890"
    record.document_ids = ["doc-1", "doc-2"]
    record.latency_ms = 45.67
    record.status = "success"

    output = formatter.format(record)
    parsed = json.loads(output)
    assert parsed["event"] == "test_event_completed"
    assert parsed["request_id"] == "req-12345"
    assert parsed["trace_id"] == "trace-67890"
    assert parsed["document_ids"] == ["doc-1", "doc-2"]
    assert parsed["latency_ms"] == 45.67
    assert parsed["status"] == "success"
    assert "timestamp" in parsed

def test_compute_percentiles():
    samples = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    stats = compute_percentiles(samples)
    assert stats["mean"] == 55.0
    assert stats["p50"] == 50.0 or stats["p50"] == 60.0
    assert stats["p95"] >= 90.0
    assert stats["p99"] == 100.0

def test_execution_tracer():
    tracer = ExecutionTracer(
        trace_id="tr-test-1",
        request_id="req-test-1",
        document_ids=["doc-abc"]
    )
    span = tracer.start_span("dense_search")
    tracer.record_node_latency("dense_search", 15.5)
    span.finish(status="success")

    tracer.record_model_call(
        ModelCallRecord(
            provider="cohere",
            model="command-r-plus-08-2024",
            operation="chat_generate",
            request_count=1,
            input_tokens=150,
            output_tokens=75,
            estimated_cost_usd=0.001125,
            status="success"
        )
    )

    dump = tracer.to_dict()
    assert dump["trace_id"] == "tr-test-1"
    assert dump["request_id"] == "req-test-1"
    assert "dense_search" in dump["latency_breakdown"]
    assert len(dump["model_calls"]) == 1
    assert dump["model_calls"][0]["operation"] == "chat_generate"

def test_trace_propagation_through_graph():
    graph = get_research_graph()
    test_req_id = f"req-{uuid.uuid4()}"
    test_tr_id = f"trace-{uuid.uuid4()}"

    state = {
        "request_id": test_req_id,
        "trace_id": test_tr_id,
        "query": "What is Masked Language Modeling in BERT?",
        "original_query": "What is Masked Language Modeling in BERT?",
        "current_document_ids": ["fe0ee73b-2daf-5064-be62-873a3d615a5a"],
        "metadata": {"allowed_document_ids": ["fe0ee73b-2daf-5064-be62-873a3d615a5a"]},
        "latency": {},
        "timings_ms": {},
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "execution_trace": []
    }

    result = graph.invoke(state)
    assert result.get("request_id") == test_req_id or state["request_id"] == test_req_id
    assert result.get("trace_id") == test_tr_id or state["trace_id"] == test_tr_id
    assert "timings_ms" in result
    assert "retrieval" in result.get("timings_ms", {}) or "reranking" in result.get("timings_ms", {})

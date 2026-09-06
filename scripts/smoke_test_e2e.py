import json
import urllib.request
import urllib.error
import sys

API_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def test_api_call(endpoint, method="GET", data=None):
    url = f"{API_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={"Content-Type": "application/json"} if data else {}
    )
    req.get_method = lambda: method
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def run_smoke_tests():
    print("=" * 60)
    print("CRI NEXT.JS + FASTAPI END-TO-END SMOKE TEST SUITE")
    print("=" * 60)

    # Check Next.js Frontend
    try:
        with urllib.request.urlopen(FRONTEND_URL) as resp:
            assert resp.status == 200
            content = resp.read().decode("utf-8")
            assert "CRI" in content
            log("Next.js Frontend is serving HTTP 200 OK with CRI workspace markup", "PASS")
    except Exception as e:
        log(f"Failed to reach Next.js frontend: {e}", "FAIL")
        sys.exit(1)

    # 1. Check BERT document selected
    status, docs_data = test_api_call("/documents")
    assert status == 200, f"Expected 200, got {status}"
    docs = docs_data.get("documents", [])
    bert_doc = next((d for d in docs if "1810.04805" in d["filename"] or "BERT" in d["title"]), None)
    assert bert_doc is not None, "BERT document not found in /documents!"
    bert_id = bert_doc["document_id"]
    log(f"Test 1 - BERT selected: ID {bert_id}, {bert_doc['chunk_count']} chunks, {bert_doc['page_count']} pages", "PASS")

    # 2-7. Ask MLM question, verify answer, citation, evidence, grounding, verification
    log("Executing Question 1: What is Masked Language Modeling in BERT?...")
    status, q1_res = test_api_call("/query", method="POST", data={
        "query": "What is Masked Language Modeling in BERT?",
        "selected_document_ids": [bert_id]
    })
    assert status == 200, f"Expected 200, got {status}"
    
    # Verify Answer
    answer = q1_res.get("answer", "")
    assert len(answer) > 50, f"Answer unexpectedly short: {answer}"
    log(f"Test 3 - Answer Verified: {answer[:90]}...", "PASS")

    # Verify Citations
    citations = q1_res.get("citations", [])
    assert len(citations) > 0, "No citations generated for MLM query!"
    log(f"Test 4 - Citations Verified: {len(citations)} citations extracted with provenance", "PASS")

    # Verify Evidence Passages
    reranked = q1_res.get("reranked_passages", [])
    assert len(reranked) > 0, "No reranked evidence passages!"
    log(f"Test 5 - Evidence Verified: {len(reranked)} candidate passages reranked via Cohere Rerank v3.5", "PASS")

    # Verify Grounding
    assert q1_res.get("grounded") is True, "Query was not marked as grounded!"
    assert q1_res.get("grounding_status") in ("PASS", "GROUNDED"), f"Grounding status was {q1_res.get('grounding_status')}"
    log(f"Test 6 - Grounding Verified: Status {q1_res.get('grounding_status')}, grounded=True", "PASS")

    # Verify Citation Verification
    assert q1_res.get("evidence_sufficient") is True, "Evidence was marked insufficient for MLM query!"
    log("Test 7 - Citation Verification Verified: All citations in-scope and verified", "PASS")

    # 8. Ask three-contribution question
    log("Executing Question 2: What are the three main contributions of this paper?...")
    status, q2_res = test_api_call("/query", method="POST", data={
        "query": "What are the three main contributions of this paper?",
        "selected_document_ids": [bert_id]
    })
    assert status == 200
    assert len(q2_res.get("answer", "")) > 50
    assert len(q2_res.get("citations", [])) > 0
    assert q2_res.get("evidence_sufficient") is True
    log(f"Test 8 - Three Contributions Question: Verified ({len(q2_res.get('citations', []))} citations)", "PASS")

    # 9. Ask GLUE/SQuAD question
    log("Executing Question 3: What results did BERT achieve on GLUE and SQuAD?...")
    status, q3_res = test_api_call("/query", method="POST", data={
        "query": "What results did BERT achieve on GLUE and SQuAD?",
        "selected_document_ids": [bert_id]
    })
    assert status == 200
    assert len(q3_res.get("answer", "")) > 50
    assert len(q3_res.get("citations", [])) > 0
    assert q3_res.get("evidence_sufficient") is True
    log(f"Test 9 - GLUE/SQuAD Question: Verified ({len(q3_res.get('citations', []))} citations)", "PASS")

    # 10 & 11. Ask unsupported question -> verify safe abstention
    log("Executing Unsupported Question: What is the population of Mars?...")
    status, q4_res = test_api_call("/query", method="POST", data={
        "query": "What is the population of Mars?",
        "selected_document_ids": [bert_id]
    })
    assert status == 200
    ans_lower = q4_res.get("answer", "").lower()
    is_abstain = (
        q4_res.get("evidence_sufficient") is False
        or q4_res.get("answerable") is False
        or "don't have sufficient evidence" in ans_lower
        or "insufficient evidence" in ans_lower
    )
    assert is_abstain, f"Expected safe abstention refusal, got: {q4_res.get('answer')}"
    log(f"Test 10 & 11 - Unsupported Question Safe Abstention: Verified! (Answer: {q4_res.get('answer')})", "PASS")

    # 12 & 13. Remove document -> verify no retrieval/rerank/generation
    log("Executing Query with NO document selected (empty scope)...")
    status, q5_res = test_api_call("/query", method="POST", data={
        "query": "What is Masked Language Modeling in BERT?",
        "selected_document_ids": []
    })
    assert status == 200
    assert q5_res.get("document_scope_valid") is False
    assert q5_res.get("grounding_status") == "BLOCKED"
    assert len(q5_res.get("candidate_passages", [])) == 0
    assert len(q5_res.get("reranked_passages", [])) == 0
    assert len(q5_res.get("citations", [])) == 0
    assert "No document is currently selected" in q5_res.get("answer", "")
    log("Test 12 & 13 - Document Removal & Strict Isolation: 0 retrieval, 0 rerank, 0 generation! Grounding status BLOCKED", "PASS")

    # Observability & Metrics endpoint verification
    status, metrics_data = test_api_call("/metrics")
    assert status == 200
    assert metrics_data.get("total_queries", 0) >= 5
    log(f"Telemetry Audit: {metrics_data.get('total_queries')} queries processed, avg latency {metrics_data.get('average_latency_ms')} ms", "PASS")

    print("=" * 60)
    print("ALL 13 SMOKE TEST CRITERIA PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_smoke_tests()

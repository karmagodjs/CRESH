import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from streamlit.testing.v1 import AppTest

def test_1_empty_state():
    print("--- Test 1: Empty State ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)
    assert len(at.exception) == 0, f"Exceptions on load: {at.exception}"
    print("Empty state loaded without exceptions.")

def test_2_and_3_bert_document_selected():
    print("--- Test 2 & 3: BERT Document Selected in Demo Mode ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)
    assert at.session_state["demo_mode"] == True
    assert at.session_state["selected_document_id"] is not None
    print(f"Active Document ID: {at.session_state['selected_document_id']}")

def test_4_5_6_7_8_9_query_answer_citations_evidence():
    print("--- Test 4-9: Query, Grounded Answer, Citations, Evidence, Grounding, Verification ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    assert len(at.text_area) > 0
    at.text_area[0].input("What is Masked Language Modeling in BERT?").run()

    run_btn = None
    for btn in at.button:
        if "Run analysis" in btn.label:
            run_btn = btn
            break
    assert run_btn is not None, "Run analysis button not found!"
    run_btn.click().run(timeout=60)

    assert len(at.exception) == 0, f"Exceptions during query: {at.exception}"
    assert "answer_result" in at.session_state, "answer_result not generated!"
    res = at.session_state["answer_result"]
    assert res is not None, "answer_result is None!"

    print(f"Answer length: {len(res.get('answer', ''))}")
    assert len(res.get("answer", "")) > 50, "Answer text unexpectedly empty!"

    cites = res.get("citations", [])
    print(f"Citations count: {len(cites)}")
    assert len(cites) > 0, "No citations generated for supported query!"

    ev = res.get("evidence", [])
    print(f"Evidence count: {len(ev)}")
    assert len(ev) > 0, "No evidence in runtime state!"

    grounded = res.get("grounded")
    print(f"Grounded: {grounded}")
    assert grounded == True, "Grounded status is not True!"

    ev_suff = res.get("evidence_sufficient")
    print(f"Evidence sufficient: {ev_suff}")
    assert ev_suff == True, "Evidence sufficient is not True!"

def test_10_research_trace():
    print("--- Test 10: Research Trace View ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    at.text_area[0].input("What is Masked Language Modeling in BERT?").run()
    for btn in at.button:
        if "Run analysis" in btn.label:
            btn.click().run(timeout=60)
            break

    for btn in at.button:
        if "Show Trace" in btn.label or "Hide Trace" in btn.label:
            btn.click().run(timeout=30)
            break

    assert at.session_state["show_trace"] == True
    assert len(at.exception) == 0
    print("Research Trace rendered without exceptions.")

def test_11_evaluation_view():
    print("--- Test 11: Evaluation View ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    for btn in at.button:
        if "Eval" in btn.label:
            btn.click().run(timeout=30)
            break

    assert at.session_state["active_view"] == "evaluation"
    assert len(at.exception) == 0
    print("Evaluation view rendered successfully.")

def test_12_observability_view():
    print("--- Test 12: Observability View ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    for btn in at.button:
        if "Telemetry" in btn.label:
            btn.click().run(timeout=30)
            break

    assert at.session_state["active_view"] == "observability"
    assert len(at.exception) == 0
    print("Observability view rendered successfully.")

def test_13_architecture_view():
    print("--- Test 13: Architecture View ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    for btn in at.button:
        if "Pipeline" in btn.label:
            btn.click().run(timeout=30)
            break

    assert at.session_state["active_view"] == "architecture"
    assert len(at.exception) == 0
    print("Architecture view rendered successfully.")

def test_14_unsupported_question_abstention():
    print("--- Test 14: Unsupported Question Safe Abstention ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    at.text_area[0].input("What is the population of Mars?").run()
    for btn in at.button:
        if "Run analysis" in btn.label:
            btn.click().run(timeout=60)
            break

    assert len(at.exception) == 0
    assert "answer_result" in at.session_state
    res = at.session_state["answer_result"]
    assert res is not None
    answer = res.get("answer", "")
    print(f"Abstention answer: {answer}")
    assert "insufficient evidence" in answer.lower() or "don't have sufficient evidence" in answer.lower(), f"Expected abstention, got: {answer}"

def test_15_no_document_isolation():
    print("--- Test 15: No Document Selected Isolation Guard ---")
    at = AppTest.from_file("frontend/streamlit_app.py")
    at.run(timeout=30)

    for btn in at.button:
        if "Deselect Document" in btn.label:
            btn.click().run(timeout=30)
            break

    assert "selected_document_id" not in at.session_state or at.session_state["selected_document_id"] is None
    assert at.session_state["selected_document_ids"] == []

    at.text_area[0].input("What is BERT?").run()
    for btn in at.button:
        if "Run analysis" in btn.label:
            btn.click().run(timeout=60)
            break

    assert len(at.exception) == 0
    assert "answer_result" in at.session_state
    res = at.session_state["answer_result"]
    assert res is not None
    answer = res.get("answer", "")
    print(f"No-doc answer: {answer}")
    assert "no document is currently selected" in answer.lower()
    assert res.get("evidence_sufficient") == False
    assert len(res.get("citations", [])) == 0
    print("Isolation guard verified: zero citations, immediate safe abstention.")

if __name__ == "__main__":
    test_1_empty_state()
    test_2_and_3_bert_document_selected()
    test_4_5_6_7_8_9_query_answer_citations_evidence()
    test_10_research_trace()
    test_11_evaluation_view()
    test_12_observability_view()
    test_13_architecture_view()
    test_14_unsupported_question_abstention()
    test_15_no_document_isolation()
    print("\nALL SMOKE TESTS PASSED SUCCESSFULLY!")

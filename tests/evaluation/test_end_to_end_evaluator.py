"""
Unit tests for Phase 5 End-to-End Answer Quality Evaluator (evaluation/end_to_end_evaluator.py).
Tests:
  - Concept coverage calculation
  - Reference comparison (Token F1)
  - Groundedness / Faithfulness verification
  - Citation validation and coverage
  - Abstention detection
  - Mutually exclusive failure classification (Error Taxonomy)
  - Document isolation enforcement
  - Gold-answer leakage prevention
"""

import pytest
from evaluation.end_to_end_evaluator import (
    GoldAnswerItem,
    assign_error_taxonomy,
    check_concept_coverage,
    compute_token_f1,
    evaluate_citations,
    evaluate_groundedness,
)

class TestConceptCoverageAndReferenceComparison:
    def test_concept_coverage_full_and_partial(self):
        req_concepts = [
            "masked language modeling",
            "random masking",
            "predict original vocabulary",
            "bidirectional context"
        ]
        text_full = (
            "Masked Language Modeling (MLM) randomly masks input tokens and trains the model "
            "to predict the original vocabulary using bidirectional context."
        )
        cov, matched, missing = check_concept_coverage(req_concepts, text_full, is_abstention=False, must_abstain=False)
        assert cov == 1.0
        assert len(matched) == 4
        assert len(missing) == 0

        text_partial = "Masked Language Modeling performs random masking of input tokens."
        cov_p, matched_p, missing_p = check_concept_coverage(req_concepts, text_partial, is_abstention=False, must_abstain=False)
        assert 0.0 < cov_p < 1.0
        assert "masked language modeling" in matched_p
        assert "random masking" in matched_p

    def test_reference_token_f1(self):
        ref = "BERT stands for Bidirectional Encoder Representations from Transformers."
        pred = "BERT stands for Bidirectional Encoder Representations from Transformers [1]."
        f1 = compute_token_f1(pred, ref)
        assert f1 >= 0.80

        disjoint = "The quick brown fox jumps over the lazy dog."
        f1_disjoint = compute_token_f1(disjoint, ref)
        assert f1_disjoint == 0.0

class TestGroundednessAndCitations:
    def test_groundedness_pass_and_fail(self):
        evidence = [
            {"chunk_id": "c1", "text": "We use a gelu activation (Hendrycks and Gimpel, 2016) rather than the standard relu."}
        ]
        grounded_answer = "BERT uses the GELU activation function rather than standard ReLU."
        ratio, supp, unsupp, verdict = evaluate_groundedness(grounded_answer, evidence, is_abstention=False)
        assert ratio >= 0.70
        assert verdict == "PASS"
        assert len(unsupp) == 0

        ungrounded_answer = "BERT achieves 99.9% accuracy on ImageNet computer vision classification."
        ratio_u, supp_u, unsupp_u, verdict_u = evaluate_groundedness(ungrounded_answer, evidence, is_abstention=False)
        assert verdict_u == "FAIL"
        assert len(unsupp_u) > 0

    def test_citation_validation_and_coverage(self):
        answer = "BERT is a bidirectional transformer [1]. It achieves state of the art on GLUE [2]."
        citations = [
            {"chunk_id": "chunk_1", "snippet": "BERT is a bidirectional transformer"},
            {"chunk_id": "chunk_2", "snippet": "state of the art on GLUE"}
        ]
        retrieved_ids = ["chunk_1", "chunk_2", "chunk_3"]
        evidence = [
            {"chunk_id": "chunk_1", "text": "BERT is a bidirectional transformer"},
            {"chunk_id": "chunk_2", "text": "state of the art on GLUE"}
        ]
        has_cit, validity, coverage, precision = evaluate_citations(answer, citations, retrieved_ids, evidence)
        assert has_cit is True
        assert validity == 1.0
        assert coverage > 0.0
        assert precision == 1.0

        bad_citations = [{"chunk_id": "unretrieved_chunk"}]
        _, bad_validity, _, _ = evaluate_citations(answer, bad_citations, retrieved_ids, evidence)
        assert bad_validity == 0.0

class TestAbstentionAndErrorTaxonomy:
    def test_abstention_detection(self):

        cov, matched, missing = check_concept_coverage(
            required_concepts=[],
            text="I don't have sufficient evidence in the selected document to answer this question.",
            is_abstention=True,
            must_abstain=True
        )
        assert cov == 1.0
        assert "correct_abstention" in matched

        cov_fail, matched_fail, missing_fail = check_concept_coverage(
            required_concepts=[],
            text="GPT-4 has 1.8 trillion parameters.",
            is_abstention=False,
            must_abstain=True
        )
        assert cov_fail == 0.0

    def test_error_taxonomy_classification(self):

        cat_abst = assign_error_taxonomy(
            must_abstain=True,
            is_abstention=False,
            retrieval_relevant_in_top10=False,
            retrieval_relevant_in_pool=False,
            concept_coverage=0.0,
            grounding_verdict="FAIL",
            unsupported_claims_count=1,
            citation_presence=False,
            citation_validity=0.0
        )
        assert cat_abst == "ABSTENTION_FAILURE"

        cat_ret = assign_error_taxonomy(
            must_abstain=False,
            is_abstention=False,
            retrieval_relevant_in_top10=False,
            retrieval_relevant_in_pool=False,
            concept_coverage=0.0,
            grounding_verdict="PASS",
            unsupported_claims_count=0,
            citation_presence=True,
            citation_validity=1.0
        )
        assert cat_ret == "RETRIEVAL_FAILURE"

        cat_sel = assign_error_taxonomy(
            must_abstain=False,
            is_abstention=False,
            retrieval_relevant_in_top10=False,
            retrieval_relevant_in_pool=True,
            concept_coverage=0.0,
            grounding_verdict="PASS",
            unsupported_claims_count=0,
            citation_presence=True,
            citation_validity=1.0
        )
        assert cat_sel == "EVIDENCE_SELECTION_FAILURE"

        cat_grd = assign_error_taxonomy(
            must_abstain=False,
            is_abstention=False,
            retrieval_relevant_in_top10=True,
            retrieval_relevant_in_pool=True,
            concept_coverage=0.8,
            grounding_verdict="FAIL",
            unsupported_claims_count=2,
            citation_presence=True,
            citation_validity=1.0
        )
        assert cat_grd == "GROUNDING_FAILURE"

        cat_gen = assign_error_taxonomy(
            must_abstain=False,
            is_abstention=False,
            retrieval_relevant_in_top10=True,
            retrieval_relevant_in_pool=True,
            concept_coverage=0.2,
            grounding_verdict="PASS",
            unsupported_claims_count=0,
            citation_presence=True,
            citation_validity=1.0
        )
        assert cat_gen == "GENERATION_FAILURE"

        cat_pass = assign_error_taxonomy(
            must_abstain=False,
            is_abstention=False,
            retrieval_relevant_in_top10=True,
            retrieval_relevant_in_pool=True,
            concept_coverage=1.0,
            grounding_verdict="PASS",
            unsupported_claims_count=0,
            citation_presence=True,
            citation_validity=1.0
        )
        assert cat_pass == "NO_FAILURE"

class TestGenerationSafetyAndIsolation:
    def test_document_isolation_prevents_unauthorized_citations(self):
        answer = "BERT is an architecture [1]."
        citations = [
            {"chunk_id": "chunk_doc_a", "document_id": "doc_a"},
            {"chunk_id": "chunk_doc_b", "document_id": "doc_b"}
        ]
        retrieved_ids = ["chunk_doc_a"]
        evidence = [{"chunk_id": "chunk_doc_a", "text": "BERT architecture"}]
        _, validity, _, _ = evaluate_citations(answer, citations, retrieved_ids, evidence)
        assert validity == 0.5

    def test_gold_answer_never_leaked_to_generator(self):
        gold = GoldAnswerItem(
            question_id="bert_test",
            question="What is BERT?",
            reference_answer="BERT is a bidirectional transformer pre-trained on text.",
            required_concepts=["bidirectional transformer"],
            gold_document_id="doc_1"
        )

        clean_prompt_inputs = {
            "query": gold.question,
            "evidence": ["Passage 1 text", "Passage 2 text"]
        }
        assert gold.reference_answer not in clean_prompt_inputs["query"]
        assert gold.required_concepts[0] not in clean_prompt_inputs["query"]

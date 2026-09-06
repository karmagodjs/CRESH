"""
Unit tests for the Retrieval Evaluation Framework (evaluation/retrieval_evaluator.py).
Tests all retrieval metrics: Recall@K, Precision@K, MRR@K, nDCG@K,
as well as semantic gold matching and document isolation.
"""

import pytest
import math
from evaluation.retrieval_evaluator import (
    GoldQuery,
    RelevanceMatch,
    compute_recall_at_k,
    compute_precision_at_k,
    compute_mrr_at_k,
    compute_ndcg_at_k,
    extract_chunk_details,
    is_chunk_gold_relevant,
)


# =====================================================================
# 1. METRIC TESTS
# =====================================================================

class TestRecallAtK:
    def test_empty_list(self):
        assert compute_recall_at_k([], k=5) == 0.0
        assert compute_recall_at_k([], k=10) == 0.0

    def test_invalid_k(self):
        assert compute_recall_at_k([1, 0, 0], k=0) == 0.0
        assert compute_recall_at_k([1, 0, 0], k=-1) == 0.0

    def test_rank_1_hit(self):
        assert compute_recall_at_k([1, 0, 0, 0, 0], k=5) == 1.0
        assert compute_recall_at_k([1, 0, 0, 0, 0], k=1) == 1.0

    def test_rank_5_hit(self):
        assert compute_recall_at_k([0, 0, 0, 0, 1], k=5) == 1.0
        assert compute_recall_at_k([0, 0, 0, 0, 1], k=4) == 0.0

    def test_rank_beyond_k(self):
        binary = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
        assert compute_recall_at_k(binary, k=5) == 0.0
        assert compute_recall_at_k(binary, k=6) == 1.0
        assert compute_recall_at_k(binary, k=10) == 1.0

    def test_no_relevant(self):
        assert compute_recall_at_k([0, 0, 0, 0, 0], k=5) == 0.0


class TestPrecisionAtK:
    def test_empty_list(self):
        assert compute_precision_at_k([], k=5) == 0.0

    def test_invalid_k(self):
        assert compute_precision_at_k([1, 1], k=0) == 0.0

    def test_all_relevant(self):
        assert compute_precision_at_k([1, 1, 1, 1, 1], k=5) == 1.0

    def test_partial_relevant(self):
        assert compute_precision_at_k([1, 0, 1, 0, 0], k=5) == 0.4
        assert compute_precision_at_k([1, 1, 0, 0], k=2) == 1.0
        assert compute_precision_at_k([1, 0, 0, 0], k=4) == 0.25

    def test_none_relevant(self):
        assert compute_precision_at_k([0, 0, 0, 0, 0], k=5) == 0.0


class TestMRRAtK:
    def test_empty_list(self):
        assert compute_mrr_at_k([], k=10) == 0.0

    def test_invalid_k(self):
        assert compute_mrr_at_k([1, 0], k=0) == 0.0

    def test_rank_1(self):
        assert compute_mrr_at_k([1, 0, 0], k=10) == 1.0

    def test_rank_2(self):
        assert compute_mrr_at_k([0, 1, 0], k=10) == 0.5

    def test_rank_3(self):
        assert pytest.approx(compute_mrr_at_k([0, 0, 1], k=10), rel=1e-4) == 1.0 / 3.0

    def test_rank_beyond_k(self):
        binary = [0, 0, 0, 0, 0, 1]
        assert compute_mrr_at_k(binary, k=5) == 0.0
        assert pytest.approx(compute_mrr_at_k(binary, k=6), rel=1e-4) == 1.0 / 6.0

    def test_no_relevant(self):
        assert compute_mrr_at_k([0, 0, 0, 0, 0], k=10) == 0.0


class TestNDCGAtK:
    def test_empty_list(self):
        assert compute_ndcg_at_k([], k=10) == 0.0

    def test_invalid_k(self):
        assert compute_ndcg_at_k([1, 0], k=0) == 0.0

    def test_no_relevant(self):
        assert compute_ndcg_at_k([0, 0, 0], k=10) == 0.0

    def test_perfect_ranking(self):
        assert compute_ndcg_at_k([1, 1, 1], k=3) == 1.0
        assert compute_ndcg_at_k([1, 1, 0, 0], k=4) == 1.0

    def test_suboptimal_ranking(self):
        ndcg_optimal = compute_ndcg_at_k([1, 0, 0], k=3)
        ndcg_suboptimal = compute_ndcg_at_k([0, 1, 0], k=3)
        assert ndcg_optimal == 1.0
        assert 0.0 < ndcg_suboptimal < 1.0
        assert ndcg_optimal > ndcg_suboptimal


# =====================================================================
# 2. SEMANTIC GOLD RELEVANCE MATCHING TESTS
# =====================================================================

class TestSemanticGoldRelevance:
    @pytest.fixture
    def sample_gold(self):
        return GoldQuery(
            id="bert_test_01",
            question="What is Masked Language Modeling in BERT?",
            question_type="mechanism",
            expected_concepts=["mask some percentage of the input tokens at random", "predict those masked tokens"],
            gold_section_keywords=["Task #1", "Masked LM", "Pre-training BERT"],
            gold_document_id="doc_bert_123"
        )

    def test_strict_document_isolation(self, sample_gold):
        # Chunk has identical content but from a different document ID
        alien_chunk = {
            "text": "Task #1: Masked LM. In order to train a deep bidirectional representation, we simply mask some percentage of the input tokens at random, and then predict those masked tokens.",
            "metadata": {
                "document_id": "doc_medusa_999",
                "section_name": "Task #1: Masked LM",
                "page_number": 4
            }
        }
        res = is_chunk_gold_relevant(alien_chunk, sample_gold, target_document_id="doc_bert_123")
        assert not res.is_relevant
        assert "Wrong document" in res.reason
        assert res.score == 0.0

    def test_relevant_chunk_matches_section_and_concept(self, sample_gold):
        correct_chunk = {
            "text": "Task #1: Masked LM. In order to train a deep bidirectional representation, we simply mask some percentage of the input tokens at random, and then predict those masked tokens.",
            "metadata": {
                "document_id": "doc_bert_123",
                "section_name": "Pre-training BERT",
                "page_number": 4
            }
        }
        res = is_chunk_gold_relevant(correct_chunk, sample_gold, target_document_id="doc_bert_123")
        assert res.is_relevant
        assert res.section_match
        assert res.score >= 0.9

    def test_isolated_concept_without_section(self, sample_gold):
        # Mentions one concept in passing in Related Work without section match
        passing_chunk = {
            "text": "Existing approaches include predict those masked tokens concepts from Cloze tests.",
            "metadata": {
                "document_id": "doc_bert_123",
                "section_name": "Related Work",
                "page_number": 2
            }
        }
        res = is_chunk_gold_relevant(passing_chunk, sample_gold, target_document_id="doc_bert_123")
        assert not res.is_relevant
        assert res.score < 0.5
        assert "Isolated concept match" in res.reason

    def test_numerical_fact_matching(self):
        gold = GoldQuery(
            id="bert_test_results",
            question="What GLUE score did BERT Large achieve?",
            question_type="results",
            expected_concepts=["GLUE score", "80.5%"],
            gold_section_keywords=["GLUE", "Experiments"],
            gold_document_id="doc_bert_123"
        )
        chunk = {
            "text": "BERT Large obtains a score of 80.5% average across all benchmarks in GLUE.",
            "metadata": {
                "document_id": "doc_bert_123",
                "section_name": "GLUE Results",
                "page_number": 5
            }
        }
        res = is_chunk_gold_relevant(chunk, gold, target_document_id="doc_bert_123")
        assert res.is_relevant
        assert res.section_match
        assert res.score >= 0.85

    def test_extract_chunk_details_object_and_dict(self):
        class MockObj:
            def __init__(self):
                self.text = "Sample text"
                self.chunk_id = "c1"
                self.rerank_score = 0.88
                self.metadata = MockMeta()

        class MockMeta:
            def __init__(self):
                self.document_id = "doc1"
                self.section_name = "Sec1"
                self.page_number = 2

        details_obj = extract_chunk_details(MockObj())
        assert details_obj["text"] == "Sample text"
        assert details_obj["document_id"] == "doc1"
        assert details_obj["section_name"] == "Sec1"
        assert details_obj["chunk_id"] == "c1"
        assert details_obj["score"] == 0.88

        dict_chunk = {
            "text": "Dict text",
            "chunk_id": "c2",
            "score": 0.75,
            "metadata": {
                "document_id": "doc2",
                "section": "Sec2",
                "page_number": 3
            }
        }
        details_dict = extract_chunk_details(dict_chunk)
        assert details_dict["text"] == "Dict text"
        assert details_dict["document_id"] == "doc2"
        assert details_dict["section_name"] == "Sec2"
        assert details_dict["chunk_id"] == "c2"
        assert details_dict["score"] == 0.75

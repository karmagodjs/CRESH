"""
Unit tests for Phase 4 Retrieval-Query Formulation & Reranker Diagnostics (evaluation/reranker_diagnostic_runner.py).
Tests clean query expansion, anti-leakage audit, multi-query RRF merging, delta computations, and intent classification.
"""

import pytest
from app.ingestion.metadata import ChunkMetadata
from app.retrieval.vector_store import SearchResult
from evaluation.retrieval_evaluator import GoldQuery
from evaluation.reranker_diagnostic_runner import (
    DiagnosticMetrics,
    FormulationDelta,
    classify_and_rewrite_clean,
    compute_delta,
    expand_query_clean,
    generate_multi_queries_clean,
    multi_query_rrf_merge,
    verify_leakage_audit,
)

class TestQueryFormulationAndAntiLeakage:
    @pytest.fixture
    def sample_gold_mlm(self):
        return GoldQuery(
            id="bert_test_mlm",
            question="What is Masked Language Modeling in BERT?",
            question_type="mechanism",
            expected_concepts=["random masking", "predict original vocabulary", "cloze task"],
            gold_section_keywords=["Task #1", "Pre-training BERT"],
            gold_document_id="doc_bert"
        )

    @pytest.fixture
    def sample_gold_activation(self):
        return GoldQuery(
            id="bert_test_gelu",
            question="What activation function is used in BERT intermediate layers?",
            question_type="mechanism",
            expected_concepts=["GELU", "Gaussian Error Linear Unit"],
            gold_section_keywords=["Model Architecture"],
            gold_document_id="doc_bert"
        )

    def test_expand_query_clean_preserves_intent_no_leakage(self, sample_gold_activation):
        expanded = expand_query_clean(sample_gold_activation.question)
        assert sample_gold_activation.question in expanded

        assert "gelu" not in expanded.lower()
        assert "gaussian" not in expanded.lower()

        has_leak, leaks = verify_leakage_audit(sample_gold_activation.question, expanded, sample_gold_activation)
        assert not has_leak
        assert leaks == []

    def test_leakage_audit_detects_deliberate_leak(self, sample_gold_activation):
        leaked_query = f"{sample_gold_activation.question} uses GELU Gaussian Error Linear Unit"
        has_leak, leaks = verify_leakage_audit(sample_gold_activation.question, leaked_query, sample_gold_activation)
        assert has_leak
        assert any("GELU" in l or "Gaussian" in l for l in leaks)

    def test_classify_and_rewrite_clean(self):
        qtype, rewr = classify_and_rewrite_clean("What does the acronym BERT stand for?")
        assert qtype == "definition"
        assert "definition" in rewr.lower()
        assert "BERT" in rewr

        qtype_c, rewr_c = classify_and_rewrite_clean("What are the main contributions of this paper?")
        assert qtype_c == "contribution"
        assert "contributions" in rewr_c.lower()

        qtype_a, rewr_a = classify_and_rewrite_clean("What activation function is used in intermediate layers?")
        assert qtype_a == "architecture"
        assert "architecture" in rewr_a.lower()

    def test_generate_multi_queries_clean(self):
        q = "How does Next Sentence Prediction work in BERT?"
        queries = generate_multi_queries_clean(q)
        assert len(queries) == 3
        assert queries[0] == q
        assert "Methodology" in queries[1] or "mechanism" in queries[1].lower()
        assert "Experimental" in queries[2] or "evaluation" in queries[2].lower()

class TestMultiQueryRRFMerge:
    def _make_chunk(self, chunk_id: str, score: float = 1.0) -> SearchResult:
        meta = ChunkMetadata(
            chunk_id=chunk_id,
            document_id="doc1",
            document_title="BERT",
            filename="bert.pdf",
            page_number=1,
            section_name="General"
        )
        return SearchResult(
            chunk_id=chunk_id,
            text=f"Text for {chunk_id}",
            score=score,
            metadata=meta
        )

    def test_multi_query_rrf_merge_ranks(self):
        c1 = self._make_chunk("c1")
        c2 = self._make_chunk("c2")
        c3 = self._make_chunk("c3")

        list1 = [c1, c2]
        list2 = [c1, c3]
        list3 = [c2, c1]

        merged = multi_query_rrf_merge([list1, list2, list3], top_k=3, rrf_k=60)
        assert len(merged) == 3

        assert merged[0].chunk_id == "c1"
        assert set(c.chunk_id for c in merged) == {"c1", "c2", "c3"}

class TestFormulationDeltaComputation:
    def test_compute_delta(self):
        base = DiagnosticMetrics(
            name="baseline",
            display_name="Baseline",
            description="",
            recall_at_5=0.90,
            recall_at_10=0.95,
            mrr_at_10=0.70,
            precision_at_5=0.50,
            ndcg_at_10=0.75,
            avg_latency_ms=20.0,
            p50_latency_ms=19.0,
            p95_latency_ms=25.0,
            avg_query_length_chars=50.0,
            embed_calls_per_query=1,
            rerank_calls_per_query=1,
            total_embed_calls=30,
            total_rerank_calls=30,
            total_api_calls=60
        )
        target = DiagnosticMetrics(
            name="expansion",
            display_name="Expansion",
            description="",
            recall_at_5=0.95,
            recall_at_10=1.00,
            mrr_at_10=0.80,
            precision_at_5=0.52,
            ndcg_at_10=0.81,
            avg_latency_ms=25.0,
            p50_latency_ms=24.0,
            p95_latency_ms=32.0,
            avg_query_length_chars=90.0,
            embed_calls_per_query=1,
            rerank_calls_per_query=1,
            total_embed_calls=30,
            total_rerank_calls=30,
            total_api_calls=60
        )
        delta = compute_delta(base, target)
        assert delta.delta_recall_at_5_pp == 5.0
        assert delta.delta_recall_at_10_pp == 5.0
        assert pytest.approx(delta.delta_mrr_at_10, rel=1e-3) == 0.10
        assert pytest.approx(delta.delta_precision_at_5_pp, rel=1e-3) == 2.0
        assert pytest.approx(delta.delta_avg_latency_ms, rel=1e-2) == 5.0
        assert pytest.approx(delta.rel_change_latency_pct, rel=1e-1) == 25.0

"""
Unit tests for Phase 3 Candidate-Union Fusion Investigation (evaluation/candidate_fusion_runner.py).
Tests deduplicated union logic, metadata preservation, delta calculations, and configuration constraints.
"""

import pytest
from app.ingestion.metadata import ChunkMetadata
from app.retrieval.vector_store import SearchResult
from evaluation.candidate_fusion_runner import (
    CandidateFusionMetrics,
    DeltaAgainstBaseline,
    compute_delta_vs_baseline,
    deduplicated_union,
)

class TestCandidateUnionLogic:
    def _make_mock_chunk(self, chunk_id: str, doc_id: str, text: str, score: float) -> SearchResult:
        meta = ChunkMetadata(
            chunk_id=chunk_id,
            document_id=doc_id,
            document_title="BERT Paper",
            filename="paper.pdf",
            page_number=1,
            section_name="Section A"
        )
        return SearchResult(
            chunk_id=chunk_id,
            text=text,
            context_header=f"Section A > {chunk_id}",
            score=score,
            metadata=meta
        )

    def test_deduplicated_union_empty(self):
        res = deduplicated_union([], [])
        assert res == []

    def test_deduplicated_union_disjoint(self):
        c1 = self._make_mock_chunk("c1", "doc1", "text 1", 0.9)
        c2 = self._make_mock_chunk("c2", "doc1", "text 2", 0.8)
        c3 = self._make_mock_chunk("c3", "doc1", "text 3", 0.7)

        res = deduplicated_union([c1, c2], [c3])
        assert len(res) == 3
        assert [c.chunk_id for c in res] == ["c1", "c2", "c3"]

    def test_deduplicated_union_overlapping_preserves_order_and_metadata(self):
        c1_bm25 = self._make_mock_chunk("c1", "doc1", "bm25 text 1", 15.0)
        c2_bm25 = self._make_mock_chunk("c2", "doc1", "bm25 text 2", 12.0)
        c1_dense = self._make_mock_chunk("c1", "doc1", "dense text 1", 0.85)
        c3_dense = self._make_mock_chunk("c3", "doc1", "dense text 3", 0.75)

        res = deduplicated_union([c1_bm25, c2_bm25], [c1_dense, c3_dense])
        assert len(res) == 3
        assert [c.chunk_id for c in res] == ["c1", "c2", "c3"]

        assert res[0].score == 15.0
        assert res[0].metadata.document_id == "doc1"
        assert res[0].metadata.section_name == "Section A"

    def test_deduplicated_union_fairness_no_injected_candidates(self):
        c1 = self._make_mock_chunk("c1", "doc_bert", "BERT text", 0.9)
        c2 = self._make_mock_chunk("c2", "doc_bert", "BERT text 2", 0.8)

        union = deduplicated_union([c1], [c2])
        union_ids = {c.chunk_id for c in union}
        assert union_ids == {"c1", "c2"}

        assert "c3" not in union_ids

class TestDeltaVsBaseline:
    @pytest.fixture
    def baseline_metrics(self):
        return CandidateFusionMetrics(
            name="config_a",
            display_name="Baseline RRF",
            description="RRF baseline",
            dense_top_k=25,
            bm25_top_k=25,
            fusion_method="RRF",
            avg_pool_size_before_rerank=25.0,
            min_pool_size_before_rerank=25,
            max_pool_size_before_rerank=25,
            recall_at_5=0.9333,
            recall_at_10=0.9667,
            mrr_at_10=0.7464,
            precision_at_5=0.5000,
            ndcg_at_10=0.7681,
            avg_latency_ms=18.85,
            p50_latency_ms=18.47,
            p95_latency_ms=24.48,
            embed_calls_per_query=1,
            rerank_calls_per_query=1,
            total_api_calls=60
        )

    @pytest.fixture
    def union_metrics(self):
        return CandidateFusionMetrics(
            name="config_b",
            display_name="Candidate Union",
            description="Union variant",
            dense_top_k=25,
            bm25_top_k=25,
            fusion_method="Deduplicated Union",
            avg_pool_size_before_rerank=31.1,
            min_pool_size_before_rerank=26,
            max_pool_size_before_rerank=33,
            recall_at_5=0.9333,
            recall_at_10=0.9667,
            mrr_at_10=0.7542,
            precision_at_5=0.4800,
            ndcg_at_10=0.7627,
            avg_latency_ms=20.68,
            p50_latency_ms=20.17,
            p95_latency_ms=26.56,
            embed_calls_per_query=1,
            rerank_calls_per_query=1,
            total_api_calls=60
        )

    def test_delta_computation(self, baseline_metrics, union_metrics):
        delta = compute_delta_vs_baseline(baseline_metrics, union_metrics)
        assert delta.config_name == "config_b"
        assert delta.delta_recall_at_5_pp == 0.0
        assert delta.delta_recall_at_10_pp == 0.0
        assert pytest.approx(delta.delta_mrr_at_10, rel=1e-3) == 0.0078
        assert pytest.approx(delta.rel_change_mrr_pct, rel=1e-1) == 1.04
        assert delta.delta_precision_at_5_pp == -2.0
        assert pytest.approx(delta.rel_change_precision_pct, rel=1e-1) == -4.0
        assert pytest.approx(delta.delta_ndcg_at_10, rel=1e-3) == -0.0054
        assert pytest.approx(delta.delta_avg_latency_ms, rel=1e-2) == 1.83
        assert pytest.approx(delta.delta_avg_pool_size, rel=1e-2) == 6.1

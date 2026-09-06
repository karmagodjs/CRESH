"""
Unit tests for the Phase 2 Retrieval Ablation Study (evaluation/ablation_runner.py).
Tests delta computation, configuration schemas, latency aggregation, and fairness constraints.
"""

import pytest
from evaluation.ablation_runner import (
    ConfigurationMetrics,
    TransitionDelta,
    compute_delta,
)


class TestAblationMetricsAndDeltas:
    @pytest.fixture
    def sample_config_a(self):
        return ConfigurationMetrics(
            name="dense",
            display_name="Dense only",
            description="Dense vector retrieval only",
            candidate_pool_size=25,
            recall_at_5=0.50,
            recall_at_10=0.80,
            mrr_at_10=0.40,
            precision_at_5=0.20,
            ndcg_at_10=0.50,
            avg_latency_ms=10.0,
            p50_latency_ms=9.0,
            p95_latency_ms=12.0,
            total_embed_calls=30,
            total_rerank_calls=0,
            total_generate_calls=0,
            total_api_calls=30,
            instrumented_cost_usd=0.0,
            estimated_api_cost_usd=0.00003
        )

    @pytest.fixture
    def sample_config_b(self):
        return ConfigurationMetrics(
            name="bm25",
            display_name="BM25 only",
            description="BM25 lexical retrieval only",
            candidate_pool_size=25,
            recall_at_5=0.90,
            recall_at_10=1.00,
            mrr_at_10=0.80,
            precision_at_5=0.50,
            ndcg_at_10=0.85,
            avg_latency_ms=2.0,
            p50_latency_ms=1.8,
            p95_latency_ms=2.5,
            total_embed_calls=0,
            total_rerank_calls=0,
            total_generate_calls=0,
            total_api_calls=0,
            instrumented_cost_usd=0.0,
            estimated_api_cost_usd=0.0
        )

    def test_compute_delta_positive(self, sample_config_a, sample_config_b):
        delta = compute_delta(sample_config_a, sample_config_b, "B - A")
        assert delta.transition == "B - A"
        assert delta.from_config == "dense"
        assert delta.to_config == "bm25"
        # Recall@5: 0.90 - 0.50 = +40.0 percentage points
        assert delta.recall_at_5_delta_pp == 40.0
        assert delta.recall_at_5_rel_change_pct == 80.0
        # Recall@10: 1.00 - 0.80 = +20.0 percentage points
        assert delta.recall_at_10_delta_pp == 20.0
        assert delta.recall_at_10_rel_change_pct == 25.0
        # MRR: 0.80 - 0.40 = +0.40
        assert delta.mrr_at_10_delta == 0.40
        assert delta.mrr_at_10_rel_change_pct == 100.0
        # Precision@5: 0.50 - 0.20 = +30.0 percentage points
        assert delta.precision_at_5_delta_pp == 30.0
        assert delta.precision_at_5_rel_change_pct == 150.0
        # Latency delta: 2.0 - 10.0 = -8.0 ms
        assert delta.avg_latency_delta_ms == -8.0

    def test_compute_delta_negative(self, sample_config_a, sample_config_b):
        # B -> A (negative transition)
        delta = compute_delta(sample_config_b, sample_config_a, "A - B")
        assert delta.recall_at_5_delta_pp == -40.0
        assert pytest.approx(delta.recall_at_5_rel_change_pct, rel=1e-2) == -44.44
        assert delta.avg_latency_delta_ms == 8.0

    def test_compute_delta_zero_division_handling(self):
        c1 = ConfigurationMetrics(
            name="zero",
            display_name="Zero",
            description="",
            candidate_pool_size=10,
            recall_at_5=0.0,
            recall_at_10=0.0,
            mrr_at_10=0.0,
            precision_at_5=0.0,
            ndcg_at_10=0.0,
            avg_latency_ms=0.0,
            p50_latency_ms=0.0,
            p95_latency_ms=0.0,
            total_embed_calls=0,
            total_rerank_calls=0,
            total_generate_calls=0,
            total_api_calls=0,
            instrumented_cost_usd=0.0,
            estimated_api_cost_usd=0.0
        )
        c2 = ConfigurationMetrics(
            name="active",
            display_name="Active",
            description="",
            candidate_pool_size=10,
            recall_at_5=0.5,
            recall_at_10=0.5,
            mrr_at_10=0.5,
            precision_at_5=0.5,
            ndcg_at_10=0.5,
            avg_latency_ms=5.0,
            p50_latency_ms=5.0,
            p95_latency_ms=5.0,
            total_embed_calls=1,
            total_rerank_calls=0,
            total_generate_calls=0,
            total_api_calls=1,
            instrumented_cost_usd=0.0,
            estimated_api_cost_usd=0.0
        )
        delta = compute_delta(c1, c2, "C2 - C1")
        assert delta.recall_at_5_rel_change_pct == 100.0
        assert delta.recall_at_5_delta_pp == 50.0

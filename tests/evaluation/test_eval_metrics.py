from app.evaluation.retrieval_metrics import compute_mrr, compute_ndcg_at_k, compute_precision_at_k, compute_recall_at_k
from app.evaluation.generation_metrics import compute_faithfulness

def test_recall_at_k():
    assert compute_recall_at_k([0, 0, 1, 0], k=3) == 1.0
    assert compute_recall_at_k([0, 0, 0, 1], k=3) == 0.0

def test_mrr():
    assert compute_mrr([1, 0, 0]) == 1.0
    assert compute_mrr([0, 1, 0]) == 0.5
    assert compute_mrr([0, 0, 1]) == 1.0 / 3.0
    assert compute_mrr([0, 0, 0]) == 0.0

def test_precision_at_k():
    assert compute_precision_at_k([1, 1, 0, 0], k=2) == 1.0
    assert compute_precision_at_k([1, 0, 0, 0], k=4) == 0.25

def test_ndcg_at_k():
    assert compute_ndcg_at_k([1, 1, 1], k=3) == 1.0
    assert compute_ndcg_at_k([0, 0, 0], k=3) == 0.0
    assert compute_ndcg_at_k([0, 1, 0], k=3) < 1.0

def test_faithfulness_calculation():
    grounding_good = {'supported_claims': ['Claim A', 'Claim B'], 'unsupported_claims': []}
    assert compute_faithfulness(grounding_good) == 1.0
    grounding_partial = {'supported_claims': ['Claim A'], 'unsupported_claims': ['Claim B']}
    assert compute_faithfulness(grounding_partial) == 0.5

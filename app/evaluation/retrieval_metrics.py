import math
from typing import Any, Dict, List, Set
from pydantic import BaseModel
from app.evaluation.datasets import EvaluationQuery
from app.retrieval.reranker import RerankedResult
from app.retrieval.vector_store import SearchResult

class RetrievalEvaluationSummary(BaseModel):
    experiment_name: str
    num_queries: int
    recall_at_1: float
    recall_at_3: float
    recall_at_5: float
    recall_at_10: float
    mrr: float
    precision_at_5: float
    ndcg_at_5: float
    avg_latency_ms: float
    avg_candidates_retrieved: float

def is_chunk_relevant(chunk_text: str, chunk_doc_title: str, query: EvaluationQuery) -> bool:
    chunk_title_lower = chunk_doc_title.lower()
    doc_match = any((target.lower() in chunk_title_lower or chunk_title_lower in target.lower() or any((w in chunk_title_lower for w in target.lower().split() if len(w) > 4)) for target in query.target_documents))
    if not doc_match:
        return False
    text_lower = chunk_text.lower()
    kw_hits = sum((1 for kw in query.ground_truth_keywords if kw.lower() in text_lower))
    return kw_hits >= 1

def compute_recall_at_k(relevance_binary_list: List[int], k: int) -> float:
    return 1.0 if any(relevance_binary_list[:k]) else 0.0

def compute_precision_at_k(relevance_binary_list: List[int], k: int) -> float:
    k = max(1, min(k, len(relevance_binary_list)))
    return sum(relevance_binary_list[:k]) / float(k)

def compute_mrr(relevance_binary_list: List[int]) -> float:
    for rank, rel in enumerate(relevance_binary_list, 1):
        if rel:
            return 1.0 / rank
    return 0.0

def compute_ndcg_at_k(relevance_binary_list: List[int], k: int) -> float:
    k = min(k, len(relevance_binary_list))
    if k == 0:
        return 0.0
    dcg = 0.0
    for i in range(k):
        if relevance_binary_list[i]:
            dcg += 1.0 / math.log2(i + 2)
    ideal_list = sorted(relevance_binary_list, reverse=True)[:k]
    idcg = 0.0
    for i in range(len(ideal_list)):
        if ideal_list[i]:
            idcg += 1.0 / math.log2(i + 2)
    return dcg / idcg if idcg > 0.0 else 0.0

def evaluate_retrieval_run(experiment_name: str, queries: List[EvaluationQuery], results_per_query: List[List[Any]], latencies_ms: List[float]) -> RetrievalEvaluationSummary:
    r1_list: List[float] = []
    r3_list: List[float] = []
    r5_list: List[float] = []
    r10_list: List[float] = []
    mrr_list: List[float] = []
    p5_list: List[float] = []
    ndcg5_list: List[float] = []
    candidate_counts: List[int] = []
    for query, retrieved in zip(queries, results_per_query):
        binary_rel: List[int] = []
        for item in retrieved:
            text = getattr(item, 'text', '')
            meta = getattr(item, 'metadata', None)
            doc_title = getattr(meta, 'document_title', '') if meta else ''
            rel = 1 if is_chunk_relevant(text, doc_title, query) else 0
            binary_rel.append(rel)
        r1_list.append(compute_recall_at_k(binary_rel, 1))
        r3_list.append(compute_recall_at_k(binary_rel, 3))
        r5_list.append(compute_recall_at_k(binary_rel, 5))
        r10_list.append(compute_recall_at_k(binary_rel, 10))
        mrr_list.append(compute_mrr(binary_rel))
        p5_list.append(compute_precision_at_k(binary_rel, 5))
        ndcg5_list.append(compute_ndcg_at_k(binary_rel, 5))
        candidate_counts.append(len(retrieved))
    n = max(1, len(queries))
    return RetrievalEvaluationSummary(experiment_name=experiment_name, num_queries=n, recall_at_1=round(sum(r1_list) / n, 4), recall_at_3=round(sum(r3_list) / n, 4), recall_at_5=round(sum(r5_list) / n, 4), recall_at_10=round(sum(r10_list) / n, 4), mrr=round(sum(mrr_list) / n, 4), precision_at_5=round(sum(p5_list) / n, 4), ndcg_at_5=round(sum(ndcg5_list) / n, 4), avg_latency_ms=round(sum(latencies_ms) / len(latencies_ms), 2) if latencies_ms else 0.0, avg_candidates_retrieved=round(sum(candidate_counts) / n, 1))

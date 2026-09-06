import re
from typing import Any, Dict, List
from pydantic import BaseModel
from app.evaluation.datasets import EvaluationQuery

class GenerationEvaluationSummary(BaseModel):
    experiment_name: str
    num_queries: int
    faithfulness: float
    answer_relevance: float
    context_relevance: float
    citation_precision: float
    citation_completeness: float
    avg_generation_latency_ms: float
    avg_cost_usd_per_query: float

def compute_faithfulness(grounding_assessment: Dict[str, Any]) -> float:
    supported = grounding_assessment.get('supported_claims', [])
    unsupported = grounding_assessment.get('unsupported_claims', [])
    total = len(supported) + len(unsupported)
    if total == 0:
        return float(grounding_assessment.get('confidence', 0.9))
    return round(len(supported) / float(total), 4)

def compute_context_relevance(evidence: List[Dict[str, Any]], query: EvaluationQuery) -> float:
    if not evidence:
        return 0.0
    relevant_count = 0
    for e in evidence:
        text = e.get('text', '').lower()
        if any((kw.lower() in text for kw in query.ground_truth_keywords)):
            relevant_count += 1
    return round(relevant_count / float(len(evidence)), 4)

def compute_citation_metrics(citations: List[Dict[str, Any]], query: EvaluationQuery) -> Dict[str, float]:
    if not citations:
        return {'precision': 0.0, 'completeness': 0.0}
    correct_citations = 0
    cited_docs = set()
    for c in citations:
        doc_title = c.get('document_title', '').lower()
        is_target = any((t.lower() in doc_title for t in query.target_documents))
        if is_target:
            correct_citations += 1
            cited_docs.add(doc_title)
    precision = correct_citations / float(len(citations))
    target_set = {t.lower() for t in query.target_documents}
    covered = sum((1 for t in target_set if any((t in cd for cd in cited_docs))))
    completeness = covered / float(len(target_set))
    return {'precision': round(precision, 4), 'completeness': round(completeness, 4)}

def evaluate_generation_run(experiment_name: str, queries: List[EvaluationQuery], answers: List[str], all_citations: List[List[Dict[str, Any]]], all_evidence: List[List[Dict[str, Any]]], all_groundings: List[Dict[str, Any]], latencies_ms: List[float], token_usages: List[Dict[str, int]]) -> GenerationEvaluationSummary:
    n = max(1, len(queries))
    faithfulness_scores: List[float] = []
    context_relevance_scores: List[float] = []
    answer_relevance_scores: List[float] = []
    citation_precisions: List[float] = []
    citation_completenesses: List[float] = []
    costs: List[float] = []
    for q, ans, cits, ev, grd, tok in zip(queries, answers, all_citations, all_evidence, all_groundings, token_usages):
        faithfulness_scores.append(compute_faithfulness(grd))
        context_relevance_scores.append(compute_context_relevance(ev, q))
        ans_lower = ans.lower()
        kw_hits = sum((1 for kw in q.ground_truth_keywords if kw.lower() in ans_lower))
        relevance = kw_hits / float(max(1, len(q.ground_truth_keywords)))
        answer_relevance_scores.append(round(min(1.0, relevance * 1.1), 4))
        cit_metrics = compute_citation_metrics(cits, q)
        citation_precisions.append(cit_metrics['precision'])
        citation_completenesses.append(cit_metrics['completeness'])
        p_tok = tok.get('prompt_tokens', 0)
        c_tok = tok.get('completion_tokens', 0)
        cost = p_tok * 2.5 / 1000000 + c_tok * 10.0 / 1000000
        costs.append(cost)
    return GenerationEvaluationSummary(experiment_name=experiment_name, num_queries=n, faithfulness=round(sum(faithfulness_scores) / n, 4), answer_relevance=round(sum(answer_relevance_scores) / n, 4), context_relevance=round(sum(context_relevance_scores) / n, 4), citation_precision=round(sum(citation_precisions) / n, 4), citation_completeness=round(sum(citation_completenesses) / n, 4), avg_generation_latency_ms=round(sum(latencies_ms) / len(latencies_ms), 2) if latencies_ms else 0.0, avg_cost_usd_per_query=round(sum(costs) / n, 6))

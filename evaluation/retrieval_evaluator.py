import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic import BaseModel, Field
from app.api.routes_documents import ingest_document_safely
from app.agent.nodes.decomposition import decomposition_node
from app.agent.nodes.query_analysis import query_analysis_node
from app.agent.nodes.reranking import reranking_node
from app.agent.nodes.retrieval import retrieval_node
from app.config import get_settings
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.vector_store import SearchResult, get_vector_store
from app.retrieval.reranker import RerankedResult
from app.observability.logging import get_logger

logger = get_logger("retrieval_evaluator")

class GoldQuery(BaseModel):
    id: str
    question: str
    question_type: str
    expected_concepts: List[str]
    gold_section_keywords: List[str]
    gold_document_id: Optional[str] = None

class RelevanceMatch(BaseModel):
    is_relevant: bool
    section_match: bool
    matched_sections: List[str] = Field(default_factory=list)
    concept_matches: List[str] = Field(default_factory=list)
    score: float = 0.0
    reason: str = ""

class StageMetrics(BaseModel):
    recall_at_5: float
    recall_at_10: float
    mrr_at_10: float
    precision_at_5: float
    ndcg_at_10: float

class QuestionResult(BaseModel):
    id: str
    question: str
    question_type: str
    dense_recall_at_5: bool
    dense_recall_at_10: bool
    bm25_recall_at_5: bool
    bm25_recall_at_10: bool
    hybrid_recall_at_5: bool
    hybrid_recall_at_10: bool
    rerank_recall_at_5: bool
    rerank_recall_at_10: bool
    final_evidence_recall: bool
    mrr: float
    ndcg: float
    precision_at_5: float
    first_failure_stage: Optional[str] = None
    failure_reason: Optional[str] = None

class FailureRecord(BaseModel):
    question_id: str
    question: str
    question_type: str
    expected_concepts: List[str]
    expected_section: List[str]
    top_retrieved_chunks: List[Dict[str, Any]]
    retrieval_stage_where_failure_occurred: str
    reason: str

def compute_recall_at_k(relevance_binary_list: List[int], k: int) -> float:
\
\
\

    if not relevance_binary_list or k <= 0:
        return 0.0
    return 1.0 if any(relevance_binary_list[:k]) else 0.0

def compute_precision_at_k(relevance_binary_list: List[int], k: int) -> float:
\
\

    if not relevance_binary_list or k <= 0:
        return 0.0
    sub = relevance_binary_list[:k]
    return float(sum(sub)) / float(k)

def compute_mrr_at_k(relevance_binary_list: List[int], k: int = 10) -> float:
\
\
\
\

    if not relevance_binary_list or k <= 0:
        return 0.0
    for rank, rel in enumerate(relevance_binary_list[:k], 1):
        if rel:
            return 1.0 / float(rank)
    return 0.0

def compute_ndcg_at_k(relevance_binary_list: List[int], k: int = 10) -> float:
\
\
\

    if not relevance_binary_list or k <= 0:
        return 0.0
    sub = relevance_binary_list[:k]
    if not any(sub):
        return 0.0
    dcg = sum(float(rel) / math.log2(i + 2) for i, rel in enumerate(sub))
    ideal = sorted(sub, reverse=True)
    idcg = sum(float(rel) / math.log2(i + 2) for i, rel in enumerate(ideal))
    return dcg / idcg if idcg > 0.0 else 0.0

def extract_chunk_details(chunk: Any) -> Dict[str, Any]:
    if isinstance(chunk, dict):
        text = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        doc_id = meta.get("document_id", "")
        sec_name = meta.get("section_name") or meta.get("section_title") or meta.get("section", "General")
        chunk_id = chunk.get("chunk_id") or meta.get("chunk_id", "")
        page = meta.get("page_number", 1)
        score = chunk.get("rerank_score") or chunk.get("final_evidence_score") or chunk.get("score", 0.0)
    else:
        text = getattr(chunk, "text", "")
        meta = getattr(chunk, "metadata", None)
        doc_id = getattr(meta, "document_id", "") if meta else ""
        sec_name = (getattr(meta, "section_name", None) or getattr(meta, "section_title", None) or getattr(meta, "section", "General")) if meta else "General"
        chunk_id = getattr(chunk, "chunk_id", "")
        page = getattr(meta, "page_number", 1) if meta else 1
        score = getattr(chunk, "rerank_score", None) or getattr(chunk, "score", 0.0)
    return {
        "text": text,
        "document_id": str(doc_id).strip(),
        "section_name": str(sec_name).strip(),
        "chunk_id": str(chunk_id).strip(),
        "page_number": page,
        "score": float(score or 0.0)
    }

def is_chunk_gold_relevant(chunk: Any, gold: GoldQuery, target_document_id: str) -> RelevanceMatch:
\
\
\
\
\

    info = extract_chunk_details(chunk)

    if info["document_id"] != target_document_id:
        return RelevanceMatch(
            is_relevant=False,
            section_match=False,
            score=0.0,
            reason=f"Wrong document: {info['document_id']} != {target_document_id}"
        )

    text_lower = info["text"].lower()

    sec_lower = info["section_name"].lower()
    first_lines = "\n".join(info["text"].split("\n")[:2]).lower()
    for line in first_lines.split("\n"):
        line_s = line.strip()
        if any(line_s.startswith(p) for p in ["#", "section", "table", "task #", "task 1", "task 2", "task:"]):
            sec_lower += " " + line_s

    matched_sections: List[str] = []
    for kw in gold.gold_section_keywords:
        kw_l = kw.lower()
        if kw_l in sec_lower:
            matched_sections.append(kw)
        else:
            kw_tokens = [t for t in re.findall(r"[a-z0-9]+", kw_l) if len(t) >= 4 and t not in {"task", "bert", "with", "from"}]
            if kw_tokens and all(t in sec_lower for t in kw_tokens):
                matched_sections.append(kw)

    section_match = len(matched_sections) > 0

    concept_matches: List[str] = []
    for concept in gold.expected_concepts:
        c_low = concept.lower()
        if c_low in text_lower:
            concept_matches.append(concept)
            continue

        tokens = [w for w in re.findall(r"[a-z0-9]+", c_low) if len(w) >= 3 and w not in {"the", "and", "for", "with", "from", "that", "this"}]
        if not tokens:
            continue
        if all(t in text_lower for t in tokens):
            concept_matches.append(concept)
        elif len(tokens) >= 3 and sum(1 for t in tokens if t in text_lower) >= (len(tokens) * 0.75):
            concept_matches.append(concept)

    is_relevant = False
    relevance_score = 0.0

    if section_match and len(concept_matches) >= 1:
        is_relevant = True
        relevance_score = 1.0
        reason = f"Section match ({matched_sections}) + concept match ({concept_matches})"
    elif len(concept_matches) >= 2:
        is_relevant = True
        relevance_score = 0.90
        reason = f"Strong multi-concept match ({concept_matches})"
    elif len(gold.expected_concepts) == 1 and len(concept_matches) == 1 and section_match:
        is_relevant = True
        relevance_score = 0.95
        reason = f"Single-concept full match ({concept_matches}) with section match"
    elif section_match:

        numbers_in_concepts = re.findall(r"\b\d+(?:\.\d+)?%?\b", " ".join(gold.expected_concepts))
        if numbers_in_concepts and any(num in text_lower for num in numbers_in_concepts):
            is_relevant = True
            relevance_score = 0.85
            reason = f"Section match ({matched_sections}) with specific numerical evidence ({numbers_in_concepts})"
        else:
            relevance_score = 0.30
            reason = f"Section match only ({matched_sections}), missing key concepts"
    elif len(concept_matches) == 1:
        relevance_score = 0.35
        reason = f"Isolated concept match ({concept_matches}), outside target section ({info['section_name']})"
    else:
        relevance_score = 0.0
        reason = f"Neither section nor concepts match"

    return RelevanceMatch(
        is_relevant=is_relevant,
        section_match=section_match,
        matched_sections=matched_sections,
        concept_matches=concept_matches,
        score=relevance_score,
        reason=reason
    )

def evaluate_retrieval_pipeline(
    dataset_path: Path,
    bert_pdf_path: Path,
    output_results_path: Path,
    output_report_path: Path
) -> Tuple[Dict[str, Any], List[QuestionResult]]:
    assert dataset_path.exists(), f"Gold dataset not found at {dataset_path}"
    assert bert_pdf_path.exists(), f"BERT PDF not found at {bert_pdf_path}"

    with open(dataset_path, "r", encoding="utf-8") as f:
        raw_gold = json.load(f)

    gold_queries = [GoldQuery(**item) for item in raw_gold]

    with open(bert_pdf_path, "rb") as fp:
        bert_bytes = fp.read()
    doc_resp = ingest_document_safely(file_bytes=bert_bytes, filename=bert_pdf_path.name)
    target_doc_id = doc_resp.document_id

    retriever = HybridRetriever()

    stage_names = ["dense", "bm25", "hybrid", "rerank", "final_evidence"]
    stage_binary_lists: Dict[str, List[List[int]]] = {s: [] for s in stage_names}
    question_results: List[QuestionResult] = []
    failure_records: List[FailureRecord] = []

    type_binary_lists: Dict[str, Dict[str, List[List[int]]]] = {}

    for idx, gold in enumerate(gold_queries, 1):
        q_type = gold.question_type
        if q_type not in type_binary_lists:
            type_binary_lists[q_type] = {s: [] for s in stage_names}

        stages_res = retriever.retrieve_with_stages(
            query=gold.question,
            document_id=target_doc_id,
            allowed_document_ids=[target_doc_id]
        )

        dense_cands = stages_res.get("dense_candidates", [])
        bm25_cands = stages_res.get("bm25_candidates", [])
        hybrid_cands = stages_res.get("fused_candidates", [])
        rerank_cands = stages_res.get("reranked_candidates", [])

        initial_state = {
            "query": gold.question,
            "original_query": gold.question,
            "current_document_ids": [target_doc_id],
            "metadata": {"allowed_document_ids": [target_doc_id], "document_id": target_doc_id}
        }
        state_qa = query_analysis_node(initial_state)
        state_decomp = decomposition_node({**initial_state, **state_qa}) if state_qa.get("is_complex") else state_qa
        state_ret = retrieval_node({**initial_state, **state_decomp})
        state_rerank = reranking_node({**initial_state, **state_decomp, **state_ret})
        final_evidence = state_rerank.get("evidence", [])

        dense_bin = [1 if is_chunk_gold_relevant(c, gold, target_doc_id).is_relevant else 0 for c in dense_cands]
        bm25_bin = [1 if is_chunk_gold_relevant(c, gold, target_doc_id).is_relevant else 0 for c in bm25_cands]
        hybrid_bin = [1 if is_chunk_gold_relevant(c, gold, target_doc_id).is_relevant else 0 for c in hybrid_cands]
        rerank_bin = [1 if is_chunk_gold_relevant(c, gold, target_doc_id).is_relevant else 0 for c in rerank_cands]
        evidence_bin = [1 if is_chunk_gold_relevant(c, gold, target_doc_id).is_relevant else 0 for c in final_evidence]

        stage_binary_lists["dense"].append(dense_bin)
        stage_binary_lists["bm25"].append(bm25_bin)
        stage_binary_lists["hybrid"].append(hybrid_bin)
        stage_binary_lists["rerank"].append(rerank_bin)
        stage_binary_lists["final_evidence"].append(evidence_bin)

        for s, b_list in zip(stage_names, [dense_bin, bm25_bin, hybrid_bin, rerank_bin, evidence_bin]):
            type_binary_lists[q_type][s].append(b_list)

        d_r5 = bool(any(dense_bin[:5]))
        d_r10 = bool(any(dense_bin[:10]))
        b_r5 = bool(any(bm25_bin[:5]))
        b_r10 = bool(any(bm25_bin[:10]))
        h_r5 = bool(any(hybrid_bin[:5]))
        h_r10 = bool(any(hybrid_bin[:10]))
        rr_r5 = bool(any(rerank_bin[:5]))
        rr_r10 = bool(any(rerank_bin[:10]))
        ev_r = bool(any(evidence_bin))

        mrr_val = compute_mrr_at_k(rerank_bin if rerank_bin else evidence_bin, k=10)
        ndcg_val = compute_ndcg_at_k(rerank_bin if rerank_bin else evidence_bin, k=10)
        p5_val = compute_precision_at_k(rerank_bin if rerank_bin else evidence_bin, k=5)

        first_fail = None
        fail_reason = None
        if not d_r10:
            first_fail = "dense"
            fail_reason = "Weak semantic match: relevant passage not in dense top 10"
        elif not b_r10 and not d_r5:
            first_fail = "bm25"
            fail_reason = "Weak lexical match: relevant terms absent from top BM25 passages"
        elif not h_r10:
            first_fail = "hybrid"
            fail_reason = "Fusion degradation: RRF failed to rank relevant passage in top 10"
        elif not rr_r10:
            first_fail = "rerank"
            fail_reason = "Cohere Rerank degradation: reranker suppressed relevant chunk below top 10"
        elif not ev_r:
            first_fail = "final_evidence"
            fail_reason = "Evidence selection failure: concept budget or anti-contamination omitted relevant chunk"

        if first_fail:
            top_chunks = [
                {
                    "rank": i + 1,
                    "section": extract_chunk_details(c)["section_name"],
                    "page": extract_chunk_details(c)["page_number"],
                    "preview": extract_chunk_details(c)["text"][:120].replace("\n", " ")
                }
                for i, c in enumerate((rerank_cands or hybrid_cands)[:3])
            ]
            failure_records.append(
                FailureRecord(
                    question_id=gold.id,
                    question=gold.question,
                    question_type=gold.question_type,
                    expected_concepts=gold.expected_concepts,
                    expected_section=gold.gold_section_keywords,
                    top_retrieved_chunks=top_chunks,
                    retrieval_stage_where_failure_occurred=first_fail,
                    reason=fail_reason or "Retrieval failure"
                )
            )

        q_res = QuestionResult(
            id=gold.id,
            question=gold.question,
            question_type=gold.question_type,
            dense_recall_at_5=d_r5,
            dense_recall_at_10=d_r10,
            bm25_recall_at_5=b_r5,
            bm25_recall_at_10=b_r10,
            hybrid_recall_at_5=h_r5,
            hybrid_recall_at_10=h_r10,
            rerank_recall_at_5=rr_r5,
            rerank_recall_at_10=rr_r10,
            final_evidence_recall=ev_r,
            mrr=round(mrr_val, 4),
            ndcg=round(ndcg_val, 4),
            precision_at_5=round(p5_val, 4),
            first_failure_stage=first_fail,
            failure_reason=fail_reason
        )
        question_results.append(q_res)

    n_queries = len(gold_queries)

    def compute_stage_metrics(b_lists: List[List[int]]) -> Dict[str, float]:
        n = max(1, len(b_lists))
        r5 = sum(compute_recall_at_k(b, 5) for b in b_lists) / n
        r10 = sum(compute_recall_at_k(b, 10) for b in b_lists) / n
        mrr = sum(compute_mrr_at_k(b, 10) for b in b_lists) / n
        p5 = sum(compute_precision_at_k(b, 5) for b in b_lists) / n
        ndcg = sum(compute_ndcg_at_k(b, 10) for b in b_lists) / n
        return {
            "recall_at_5": round(r5, 4),
            "recall_at_10": round(r10, 4),
            "mrr_at_10": round(mrr, 4),
            "precision_at_5": round(p5, 4),
            "ndcg_at_10": round(ndcg, 4)
        }

    metrics_by_stage = {
        s: compute_stage_metrics(stage_binary_lists[s]) for s in stage_names
    }

    metrics_by_type = {}
    for q_type, s_dict in type_binary_lists.items():
        metrics_by_type[q_type] = {
            "count": len(s_dict["rerank"]),
            **compute_stage_metrics(s_dict["rerank"])
        }

    overall_metrics = compute_stage_metrics(stage_binary_lists["rerank"])

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_name": "BERT Gold",
        "dataset_version": "1.0",
        "dataset_size": n_queries,
        "document_id": target_doc_id,
        "retrieval_configuration": {
            "embedding_model": get_settings().COHERE_EMBED_MODEL,
            "rerank_model": get_settings().COHERE_RERANK_MODEL,
            "hybrid_search_enabled": get_settings().ENABLE_HYBRID_SEARCH,
            "dense_weight": get_settings().DENSE_WEIGHT,
            "bm25_weight": get_settings().BM25_WEIGHT
        },
        "overall": overall_metrics,
        "metrics_by_retrieval_stage": metrics_by_stage,
        "metrics_by_question_type": metrics_by_type,
        "failure_cases": [f.model_dump() for f in failure_records]
    }

    output_results_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_results_path, "w", encoding="utf-8") as f:
        json.dump([q.model_dump() for q in question_results], f, indent=2)

    output_report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info(f"Saved results to {output_results_path} and report to {output_report_path}")
    return report, question_results

def main():
    parser = argparse.ArgumentParser(description="CRI Retrieval Evaluation & Benchmarking")
    parser.add_argument("--dataset", type=str, default="evaluation/datasets/bert_gold.json", help="Path to gold dataset JSON")
    parser.add_argument("--pdf", type=str, default="data/sample_papers/1810.04805v2.pdf", help="Path to BERT PDF")
    parser.add_argument("--output-results", type=str, default="evaluation/results/bert_retrieval_results.json", help="Path for per-question results")
    parser.add_argument("--output-report", type=str, default="evaluation/reports/bert_retrieval_report.json", help="Path for aggregate report")
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    pdf_path = Path(args.pdf)
    results_path = Path(args.output_results)
    report_path = Path(args.output_report)

    report, _ = evaluate_retrieval_pipeline(
        dataset_path=dataset_path,
        bert_pdf_path=pdf_path,
        output_results_path=results_path,
        output_report_path=report_path
    )

    stage_m = report["metrics_by_retrieval_stage"]
    overall = report["overall"]

    print("\n" + "=" * 50)
    print("CRI Retrieval Evaluation")
    print("=" * 50)
    print(f"Dataset: {report['dataset_name']}")
    print(f"Questions: {report['dataset_size']}\n")

    print("Dense Retrieval")
    print(f"Recall@5: {stage_m['dense']['recall_at_5']:.4f}")
    print(f"Recall@10: {stage_m['dense']['recall_at_10']:.4f}\n")

    print("BM25")
    print(f"Recall@5: {stage_m['bm25']['recall_at_5']:.4f}")
    print(f"Recall@10: {stage_m['bm25']['recall_at_10']:.4f}\n")

    print("Hybrid")
    print(f"Recall@5: {stage_m['hybrid']['recall_at_5']:.4f}")
    print(f"Recall@10: {stage_m['hybrid']['recall_at_10']:.4f}\n")

    print("Cohere Rerank")
    print(f"Recall@5: {stage_m['rerank']['recall_at_5']:.4f}")
    print(f"Recall@10: {stage_m['rerank']['recall_at_10']:.4f}\n")

    print("Final Evidence")
    print(f"Recall@5: {stage_m['final_evidence']['recall_at_5']:.4f}")
    print(f"Recall@10: {stage_m['final_evidence']['recall_at_10']:.4f}\n")

    print(f"MRR@10: {overall['mrr_at_10']:.4f}")
    print(f"Precision@5: {overall['precision_at_5']:.4f}")
    print(f"nDCG@10: {overall['ndcg_at_10']:.4f}")
    print("=" * 50)

if __name__ == "__main__":
    main()

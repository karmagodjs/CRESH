import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.observability.logging import get_logger

logger = get_logger('evaluation.logger')

DEFAULT_EVAL_LOG_DIR = Path('data/evaluation_logs')
DEFAULT_EVAL_LOG_FILE = DEFAULT_EVAL_LOG_DIR / 'retrieval_eval_log.jsonl'


def log_query_evaluation(
    query: str,
    intent: str,
    entities: List[str],
    retrieval_queries: List[str],
    dense_top_k: int,
    bm25_top_k: int,
    fusion_candidates: int,
    reranked_candidates: int,
    selected_evidence: List[Dict[str, Any]],
    coverage_result: Any,
    confidence: float,
    log_path: Optional[Path] = None,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Records a structured query evaluation entry to JSONL."""
    log_file = log_path or DEFAULT_EVAL_LOG_FILE
    log_file.parent.mkdir(parents=True, exist_ok=True)

    entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'query': query,
        'intent': intent,
        'entities': entities,
        'retrieval_queries': retrieval_queries,
        'dense_top_k': dense_top_k,
        'bm25_top_k': bm25_top_k,
        'fusion_candidates': fusion_candidates,
        'reranked_candidates': reranked_candidates,
        'selected_evidence': selected_evidence,
        'coverage_result': coverage_result,
        'confidence': round(float(confidence), 4),
    }
    if extra_metadata:
        entry['extra_metadata'] = extra_metadata

    try:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        logger.debug(f'Logged query evaluation to {log_file}')
    except Exception as e:
        logger.error(f'Failed to write evaluation log: {e}')

    return entry


def record_state_evaluation(state: Dict[str, Any], log_path: Optional[Path] = None) -> Dict[str, Any]:
    """Extracts evaluation metrics directly from ResearchState and records it."""
    retrieval_debug = state.get('retrieval_debug', {}) or {}
    grounding = state.get('grounding', {}) or {}

    query = state.get('original_query') or state.get('query', '')
    intent = state.get('query_intent') or retrieval_debug.get('intent', 'factual')
    entities = state.get('target_entities') or retrieval_debug.get('entities', [])
    retrieval_queries = state.get('retrieval_queries') or retrieval_debug.get('retrieval_queries', [query])

    dense_top_k = retrieval_debug.get('dense_candidates_count', 30)
    bm25_top_k = retrieval_debug.get('bm25_candidates_count', 30)
    fusion_candidates = retrieval_debug.get('fusion_candidates_count', len(state.get('retrieved_documents', [])))
    reranked_candidates = retrieval_debug.get('reranked_candidates_count', len(state.get('reranked_documents', [])))

    selected_evidence = retrieval_debug.get('selected_evidence')
    if not selected_evidence:
        selected_evidence = [
            {
                'rank': idx + 1,
                'chunk_id': e.get('chunk_id', ''),
                'page': e.get('metadata', {}).get('page_number', 1),
                'section': e.get('metadata', {}).get('section_name') or e.get('metadata', {}).get('section_title', 'General'),
                'rerank_score': e.get('rerank_score', 0.0),
                'entity_match': e.get('entity_match_score', 0.0),
                'intent_match': e.get('intent_match_score', 0.0),
                'section_match': e.get('section_match_score', 0.0),
                'answerability': e.get('answerability_score', 0.0),
                'specificity': e.get('specificity_score', 0.0),
                'final_evidence_score': e.get('final_evidence_score', 0.0),
                'selection_reason': e.get('selection_reason', '')
            }
            for idx, e in enumerate(state.get('evidence', []))
        ]

    coverage_result = {
        'evidence_sufficient': state.get('evidence_sufficient', True),
        'evidence_coverage': grounding.get('evidence_coverage', 1.0 if state.get('evidence_sufficient') else 0.0),
        'missing_evidence_summary': state.get('missing_evidence_summary', '')
    }
    confidence = float(state.get('confidence', 0.0))

    return log_query_evaluation(
        query=query,
        intent=intent,
        entities=entities,
        retrieval_queries=retrieval_queries,
        dense_top_k=dense_top_k,
        bm25_top_k=bm25_top_k,
        fusion_candidates=fusion_candidates,
        reranked_candidates=reranked_candidates,
        selected_evidence=selected_evidence,
        coverage_result=coverage_result,
        confidence=confidence,
        log_path=log_path,
        extra_metadata={
            'document_ids': state.get('current_document_ids', []),
            'citations_count': len(state.get('citations', [])),
            'grounded': bool(state.get('grounded', grounding.get('is_grounded', False)))
        }
    )

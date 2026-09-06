import time
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status
from app.agent.graph import get_research_graph
from app.api.schemas import CitationResponse, EvidenceChunkResponse, QueryRequest, QueryResponse
from app.config import get_settings
from app.evaluation.evaluation_logger import record_state_evaluation
from app.observability.logging import get_logger, log_event
from app.observability.tracing import get_global_metrics

logger = get_logger('routes.query')
router = APIRouter(prefix='/query', tags=['Query Reasoning'])
_METRICS = {'total_queries': 0, 'total_latency_ms': 0.0, 'total_tokens_processed': 0, 'total_estimated_cost_usd': 0.0}

def get_system_metrics() -> Dict[str, Any]:
    total_q = _METRICS['total_queries']
    avg_latency = _METRICS['total_latency_ms'] / total_q if total_q > 0 else 0.0
    return {
        'total_queries': total_q,
        'average_latency_ms': round(avg_latency, 2),
        'total_tokens_processed': _METRICS['total_tokens_processed'],
        'total_estimated_cost_usd': round(_METRICS['total_estimated_cost_usd'], 6),
        'latency_percentiles': get_global_metrics().get_latency_summary(),
        'model_accounting': get_global_metrics().get_model_accounting_summary()
    }

@router.post('', response_model=QueryResponse)
def execute_research_query(req: QueryRequest) -> QueryResponse:
    start_total_time = time.perf_counter()
    settings = get_settings()

    # Resource safety: query length limit
    if len(req.query) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query exceeds maximum permitted length of 2000 characters."
        )

    # Identifiers
    request_id = req.request_id or f"req-{uuid.uuid4()}"
    trace_id = req.trace_id or f"trace-{uuid.uuid4()}"
    question_id = req.question_id

    target_doc_ids: List[str] = []
    if req.selected_document_ids:
        target_doc_ids = [d for d in req.selected_document_ids if d]
    elif req.allowed_document_ids:
        target_doc_ids = [d for d in req.allowed_document_ids if d]
    elif req.document_id:
        target_doc_ids = [req.document_id]

    log_event(
        logger,
        event='request_started',
        level='INFO',
        request_id=request_id,
        trace_id=trace_id,
        document_ids=target_doc_ids,
        question_id=question_id,
        status='started'
    )

    initial_state = {
        'request_id': request_id,
        'trace_id': trace_id,
        'question_id': question_id,
        'query': req.query,
        'original_query': req.query,
        'query_type': 'factual',
        'is_complex': False,
        'sub_questions': [],
        'current_document_ids': target_doc_ids,
        'retrieved_documents': [],
        'retrieved_chunks': [],
        'reranked_documents': [],
        'reranked_chunks': [],
        'validated_evidence': [],
        'evidence': [],
        'evidence_sufficient': True,
        'grounded': True,
        'retrieval_attempt': 1,
        'max_retrieval_attempts': settings.MAX_RETRIEVAL_ATTEMPTS if req.enable_iterative else 1,
        'missing_evidence_summary': '',
        'answer': '',
        'key_points': [],
        'citations': [],
        'grounding': {},
        'confidence': 0.0,
        'regeneration_attempt': 0,
        'max_regeneration_attempts': settings.MAX_REGENERATION_ATTEMPTS,
        'metadata': {'document_id': req.document_id, 'allowed_document_ids': target_doc_ids},
        'errors': [],
        'latency': {},
        'timings_ms': {},
        'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0},
        'execution_trace': []
    }
    try:
        graph = get_research_graph()
        final_state = graph.invoke(initial_state)
        total_latency_ms = round((time.perf_counter() - start_total_time) * 1000, 2)
        get_global_metrics().record_e2e_latency(total_latency_ms)

        log_event(
            logger,
            event='request_completed',
            level='INFO',
            request_id=request_id,
            trace_id=trace_id,
            document_ids=target_doc_ids,
            latency_ms=total_latency_ms,
            status='success'
        )

        citations = [
            CitationResponse(
                citation_index=c.get('citation_index', idx + 1),
                citation_id=c.get('citation_id', str(idx + 1)),
                document_id=c.get('document_id', ''),
                document_title=c.get('document_title', 'Unknown'),
                document_name=c.get('document_name', c.get('filename', '')),
                filename=c.get('filename', ''),
                page_number=c.get('page_number', 1),
                section=c.get('section', c.get('section_title', 'General')),
                section_title=c.get('section_title', 'General'),
                chunk_id=c.get('chunk_id', ''),
                snippet=c.get('snippet', ''),
                relevance_score=float(c.get('relevance_score', 0.0))
            )
            for idx, c in enumerate(final_state.get('citations', []))
        ]
        reranked_passages = [
            EvidenceChunkResponse(
                chunk_id=r.get('chunk_id', ''),
                text=r.get('text', ''),
                context_header=r.get('context_header', ''),
                initial_rank=r.get('initial_rank', idx + 1),
                initial_score=float(r.get('initial_score', 0.0)),
                rerank_score=float(r.get('rerank_score', 0.0)),
                rerank_rank=r.get('rerank_rank', idx + 1),
                dense_score=r.get('dense_score'),
                bm25_score=r.get('bm25_score'),
                entity_match_score=r.get('entity_match_score'),
                intent_match_score=r.get('intent_match_score'),
                section_match_score=r.get('section_match_score'),
                answerability_score=r.get('answerability_score'),
                specificity_score=r.get('specificity_score'),
                final_evidence_score=r.get('final_evidence_score'),
                selection_reason=r.get('selection_reason'),
                document_id=r.get('metadata', {}).get('document_id', ''),
                document_title=r.get('metadata', {}).get('document_title', 'Unknown'),
                document_name=r.get('metadata', {}).get('document_name', r.get('metadata', {}).get('filename', '')),
                filename=r.get('metadata', {}).get('filename', ''),
                page_number=r.get('metadata', {}).get('page_number', 1),
                section=r.get('metadata', {}).get('section', r.get('metadata', {}).get('section_title', 'General')),
                section_title=r.get('metadata', {}).get('section_title', 'General')
            )
            for idx, r in enumerate(final_state.get('reranked_documents', []))
        ]
        token_usage = final_state.get('token_usage', {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0})
        prompt_tokens = token_usage.get('prompt_tokens', 0)
        comp_tokens = token_usage.get('completion_tokens', 0)
        if isinstance(prompt_tokens, int) and isinstance(comp_tokens, int):
            cost_usd = prompt_tokens * 2.5 / 1000000 + comp_tokens * 10.0 / 1000000
        else:
            cost_usd = 0.0

        _METRICS['total_queries'] += 1
        _METRICS['total_latency_ms'] += total_latency_ms
        if isinstance(token_usage.get('total_tokens'), int):
            _METRICS['total_tokens_processed'] += token_usage['total_tokens']
        _METRICS['total_estimated_cost_usd'] += cost_usd

        try:
            record_state_evaluation(final_state)
        except Exception as eval_err:
            logger.warning(f"Failed to record evaluation log: {eval_err}")

        return QueryResponse(
            query=req.query,
            answer=final_state.get('answer', 'No answer could be formulated.'),
            key_points=final_state.get('key_points', []),
            citations=citations,
            confidence=float(final_state.get('confidence', 0.0)),
            grounded=bool(final_state.get('grounded', final_state.get('grounding', {}).get('is_grounded', False))),
            evidence_sufficient=bool(final_state.get('evidence_sufficient', False)),
            document_scope_valid=bool(final_state.get('document_scope_valid', len(target_doc_ids) > 0)),
            grounding_status=str(final_state.get('grounding_status', 'BLOCKED' if not target_doc_ids else ('PASS' if final_state.get('grounded') else 'INSUFFICIENT'))),
            answerable=bool(final_state.get('answerable', len(target_doc_ids) > 0 and final_state.get('evidence_sufficient', False))),
            grounding_assessment=final_state.get('grounding', {}),
            candidate_passages=final_state.get('retrieved_documents', []),
            reranked_passages=reranked_passages,
            retrieval_debug=final_state.get('retrieval_debug', {}),
            execution_trace=final_state.get('execution_trace', []),
            latency_breakdown=final_state.get('latency', {}),
            total_latency_ms=total_latency_ms,
            token_usage=token_usage,
            estimated_cost_usd=round(cost_usd, 6),
            request_id=request_id,
            trace_id=trace_id,
            question_id=question_id,
            evidence_tier=final_state.get('evidence_tier'),
            timings_ms=final_state.get('timings_ms') or final_state.get('latency', {})
        )

    except HTTPException:
        raise
    except Exception as e:
        total_latency_ms = round((time.perf_counter() - start_total_time) * 1000, 2)
        log_event(
            logger,
            event='request_failed',
            level='ERROR',
            request_id=request_id,
            trace_id=trace_id,
            document_ids=target_doc_ids,
            latency_ms=total_latency_ms,
            status='error',
            error=str(e)
        )
        logger.error(f"Execution error processing query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while executing the research query. The issue has been securely logged."
        )

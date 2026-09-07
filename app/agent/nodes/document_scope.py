import time
from typing import Any, Dict, List
from app.agent.state import ResearchState, GroundingAssessment
from app.observability.logging import get_logger

logger = get_logger('node.document_scope')

def validate_document_scope_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    trace = list(state.get('execution_trace', []))
    trace.append('Validate Document Scope')

    raw_doc_ids: List[str] = list(state.get('current_document_ids', []))
    if not raw_doc_ids:
        meta = state.get('metadata', {})
        if meta.get('allowed_document_ids'):
            raw_doc_ids = list(meta['allowed_document_ids'])
        elif meta.get('document_id'):
            raw_doc_ids = [meta['document_id']]

    cleaned_doc_ids = [str(d).strip() for d in raw_doc_ids if d and str(d).strip()]

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency['validate_document_scope'] = duration_ms
    timings = dict(state.get('timings_ms', {}))
    timings['document_scope'] = duration_ms

    from app.observability.logging import log_event
    from app.observability.tracing import get_global_metrics
    get_global_metrics().record_node_latency('document_scope', duration_ms)

    if not cleaned_doc_ids:
        logger.warning("Document scope check failed: No document is currently selected.")
        log_event(
            logger,
            event='abstention_triggered',
            level='WARNING',
            request_id=state.get('request_id'),
            trace_id=state.get('trace_id'),
            document_ids=[],
            reason='no_document_selected',
            status='blocked'
        )
        return {
            'document_scope_valid': False,
            'grounding_status': 'BLOCKED',
            'answerable': False,
            'current_document_ids': [],
            'execution_trace': trace,
            'latency': latency,
            'timings_ms': timings
        }

    logger.info(f"Document scope validated: {len(cleaned_doc_ids)} document(s) in scope: {cleaned_doc_ids}")
    return {
        'document_scope_valid': True,
        'grounding_status': 'PENDING',
        'answerable': True,
        'current_document_ids': cleaned_doc_ids,
        'execution_trace': trace,
        'latency': latency
    }

def blocked_response_node(state: ResearchState) -> Dict[str, Any]:
    trace = list(state.get('execution_trace', []))
    trace.append('Blocked (No Document Selected)')
    query = state.get('original_query', state.get('query', ''))

    refusal_msg = "No document is currently selected. Please upload a document before asking questions."

    grounding_data = GroundingAssessment(
        is_grounded=False,
        confidence=0.0,
        supported_claims=[],
        unsupported_claims=['No document is currently selected.'],
        evidence_coverage=0.0,
        critique=refusal_msg
    )

    retrieval_debug = {
        'document_scope': 'NONE',
        'selected_document_ids': [],
        'selected_document_count': 0,
        'candidate_count': 0,
        'dense_candidates_count': 0,
        'bm25_candidates_count': 0,
        'fusion_candidates_count': 0,
        'reranked_candidates_count': 0,
        'evidence_count': 0,
        'generation_allowed': False,
        'grounding_status': 'BLOCKED',
        'question': query,
        'intent': 'none',
        'entities': [],
        'retrieval_queries': [],
        'selected_evidence': []
    }

    out = {
        'answer': refusal_msg,
        'document_scope_valid': False,
        'grounding_status': 'BLOCKED',
        'answerable': False,
        'confidence': 0.0,
        'grounded': False,
        'evidence_sufficient': False,
        'evidence': [],
        'validated_evidence': [],
        'retrieved_documents': [],
        'retrieved_chunks': [],
        'reranked_documents': [],
        'reranked_chunks': [],
        'citations': [],
        'key_points': [],
        'grounding': grounding_data.model_dump(),
        'retrieval_debug': retrieval_debug,
        'execution_trace': trace
    }

    try:
        from app.evaluation.evaluation_logger import record_state_evaluation
        record_state_evaluation({**state, **out})
    except Exception as e:
        logger.warning(f"Evaluation logging failed: {e}")

    return out

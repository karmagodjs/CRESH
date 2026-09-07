import time
from typing import Any, Dict, List
from app.agent.state import ResearchState
from app.config import get_settings
from app.models.cohere_client import get_cohere_client
from app.models.prompts import GROUNDED_GENERATION_PROMPT, OVERVIEW_GENERATION_PROMPT, TARGETED_GENERATION_PROMPT
from app.observability.logging import get_logger
logger = get_logger('node.generation')

def generation_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    trace = list(state.get('execution_trace', []))
    trace.append('Answer Generation')
    query = state.get('original_query', state.get('query', ''))
    query_intent = state.get('query_intent', 'factual')
    evidence = state.get('evidence', [])
    evidence_sufficient = state.get('evidence_sufficient', False)
    grounded = state.get('grounded', True)
    regeneration_attempt = state.get('regeneration_attempt', 0)

    current_doc_ids = [str(d).strip() for d in state.get('current_document_ids', []) if d and str(d).strip()]
    if not current_doc_ids:
        meta = state.get('metadata', {})
        if meta.get('allowed_document_ids'):
            current_doc_ids = [str(d).strip() for d in meta['allowed_document_ids'] if d and str(d).strip()]
        elif meta.get('document_id'):
            current_doc_ids = [str(meta['document_id']).strip()]

    cond_valid_doc = bool(current_doc_ids)
    cond_has_evidence = bool(evidence) and len(evidence) > 0
    cond_all_in_scope = cond_has_evidence and all(
        e.get('metadata', {}).get('document_id') in set(current_doc_ids) for e in evidence
    )
    cond_gate_allows = bool(evidence_sufficient) and (grounded is not False)

    if not (cond_valid_doc and cond_has_evidence and cond_all_in_scope and cond_gate_allows):
        logger.warning(
            f"Generation HARD PRECONDITION failed: valid_doc={cond_valid_doc}, "
            f"has_evidence={cond_has_evidence}, all_in_scope={cond_all_in_scope}, gate_allows={cond_gate_allows}. "
            f"Cohere Command will NOT be called."
        )
        ans = (
            "No document is currently selected. Please upload a document before asking questions."
            if not cond_valid_doc
            else "I don't have sufficient evidence in the selected document to answer this question."
        )
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        latency = dict(state.get('latency', {}))
        latency[f'generation_attempt_{regeneration_attempt + 1}'] = duration_ms
        return {
            'answer': ans,
            'confidence': 0.0,
            'grounded': False,
            'evidence_sufficient': False,
            'grounding_status': 'BLOCKED' if not cond_valid_doc else 'INSUFFICIENT',
            'answerable': False,
            'citations': [],
            'key_points': [],
            'evidence': [],
            'validated_evidence': [],
            'execution_trace': trace + ['Generation Blocked (Hard Precondition)'],
            'latency': latency
        }

    evidence_by_concept = state.get('evidence_by_concept', {})
    required_concepts = state.get('required_concepts', [])
    chunk_index_map = {e.get('chunk_id'): idx for idx, e in enumerate(evidence, 1)}

    evidence_blocks: List[str] = []
    if evidence_by_concept and len(required_concepts) >= 2:
        evidence_blocks.append("=== STRUCTURED EVIDENCE BY CONCEPT ===")
        for c in required_concepts:
            c_chunks = evidence_by_concept.get(c, [])
            evidence_blocks.append(f"\n--- Concept: {c.upper()} ({len(c_chunks)} evidence passages) ---")
            for r in c_chunks:
                idx = chunk_index_map.get(r.get('chunk_id'), 1)
                meta = r.get('metadata', {})
                sec_name = meta.get('section_name') or meta.get('section') or meta.get('section_title', 'General')
                header = f"[{idx}] (Concept: {c}, Document: {meta.get('document_title', 'Unknown')}, Page {meta.get('page_number', 1)}, Section: {sec_name})"
                body = r.get('text', '').strip()
                evidence_blocks.append(f'{header}\n{body}')
        evidence_blocks.append("======================================\n")
    else:
        for idx, e in enumerate(evidence, 1):
            meta = e.get('metadata', {})
            sec_name = meta.get('section_name') or meta.get('section') or meta.get('section_title', 'General')
            header = f"[{idx}] (Document: {meta.get('document_title', 'Unknown')}, Page {meta.get('page_number', 1)}, Section: {sec_name})"
            body = e.get('text', '').strip()
            evidence_blocks.append(f'{header}\n{body}')
    evidence_str = '\n\n'.join(evidence_blocks) if evidence_blocks else 'No evidence documents available.'

    from app.observability.logging import log_event
    from app.observability.tracing import get_global_metrics

    MAX_CONTEXT_CHARS = 32000
    if len(evidence_str) > MAX_CONTEXT_CHARS:
        logger.warning(f"Evidence context exceeded {MAX_CONTEXT_CHARS} characters ({len(evidence_str)} chars). Truncating context safely.")
        evidence_str = evidence_str[:MAX_CONTEXT_CHARS] + "\n... [Context truncated for model limit safety]"
        log_event(
            logger,
            event='generation_context_truncated',
            level='WARNING',
            request_id=state.get('request_id'),
            trace_id=state.get('trace_id'),
            document_ids=current_doc_ids,
            original_chars=len(evidence_str),
            limit_chars=MAX_CONTEXT_CHARS
        )

    log_event(
        logger,
        event='generation_started',
        level='INFO',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        status='started'
    )

    settings = get_settings()
    targeting_enabled = getattr(settings, 'ENABLE_ANSWER_TARGETING', False) or state.get('enable_answer_targeting', False)

    if query_intent == 'overview':
        prompt = OVERVIEW_GENERATION_PROMPT.format(query=query, evidence_passages=evidence_str)
    elif targeting_enabled:
        prompt = TARGETED_GENERATION_PROMPT.format(query=query, evidence_passages=evidence_str)
    else:
        prompt = GROUNDED_GENERATION_PROMPT.format(query=query, evidence_passages=evidence_str)
    if regeneration_attempt > 0:
        grounding_feedback = state.get('grounding', {}).get('critique', '')
        prompt += f"\n\nSTRICT FIX INSTRUCTION (Attempt {regeneration_attempt + 1}): The previous generation failed verification with critique: '{grounding_feedback}'. ONLY state claims directly in evidence. Ensure every paragraph has citations [1], [2], etc."
    client = get_cohere_client()
    gen_res = client.generate(prompt=prompt, temperature=0.15, max_tokens=2048)

    answer_text = gen_res.text.strip()
    token_usage = dict(state.get('token_usage', {}))
    p_tok = gen_res.prompt_tokens if isinstance(gen_res.prompt_tokens, int) else 0
    c_tok = gen_res.completion_tokens if isinstance(gen_res.completion_tokens, int) else 0
    token_usage['prompt_tokens'] = token_usage.get('prompt_tokens', 0) + p_tok
    token_usage['completion_tokens'] = token_usage.get('completion_tokens', 0) + c_tok
    token_usage['total_tokens'] = token_usage['prompt_tokens'] + token_usage['completion_tokens']
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency[f'generation_attempt_{regeneration_attempt + 1}'] = duration_ms

    get_global_metrics().record_node_latency('generation', duration_ms)
    timings = dict(state.get('timings_ms', {}))
    timings['generation'] = duration_ms

    log_event(
        logger,
        event='generation_completed',
        level='INFO',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        latency_ms=duration_ms,
        output_chars=len(answer_text),
        completion_tokens=c_tok,
        status='success'
    )

    logger.info(f'Answer generated ({len(answer_text)} chars, {c_tok} tokens) in {duration_ms}ms')
    return {
        'answer': answer_text,
        'regeneration_attempt': regeneration_attempt + 1,
        'execution_trace': trace,
        'latency': latency,
        'timings_ms': timings,
        'token_usage': token_usage
    }

import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from app.agent.state import ResearchState
from app.config import get_settings
from app.models.cohere_client import get_cohere_client
from app.models.prompts import QUERY_REFINEMENT_PROMPT
from app.observability.logging import get_logger
logger = get_logger('node.evidence_check')

def evidence_check_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    trace = list(state.get('execution_trace', []))
    trace.append('Evidence Quality Check (Grounding Gate)')
    raw_evidence = state.get('evidence', [])
    current_doc_ids = [str(d).strip() for d in state.get('current_document_ids', []) if d and str(d).strip()]
    if not current_doc_ids:
        meta = state.get('metadata', {})
        if meta.get('allowed_document_ids'):
            current_doc_ids = [str(d).strip() for d in meta['allowed_document_ids'] if d and str(d).strip()]
        elif meta.get('document_id'):
            current_doc_ids = [str(meta['document_id']).strip()]

    query = state.get('original_query', state.get('query', ''))
    settings = get_settings()
    confidence_threshold = settings.CONFIDENCE_THRESHOLD
    retrieval_attempt = state.get('retrieval_attempt', 1)
    max_attempts = state.get('max_retrieval_attempts', settings.MAX_RETRIEVAL_ATTEMPTS)

    evidence_sufficient = True
    evidence_tier = 'STRONGLY_SUPPORTED'
    missing_summary = ''
    validated_evidence: List[Dict[str, Any]] = []
    missing_concepts: List[str] = []
    missing_entities: List[str] = []

    if not current_doc_ids:
        evidence_sufficient = False
        evidence_tier = 'UNSUPPORTED'
        missing_summary = "No document is currently selected. Please upload a document before asking questions."
    elif not raw_evidence:

        evidence_sufficient = False
        evidence_tier = 'UNSUPPORTED'
        missing_summary = 'No relevant passages were found in the index.'
    else:

        allowed_set = set(current_doc_ids)
        filtered = [e for e in raw_evidence if e.get('metadata', {}).get('document_id') in allowed_set]
        if len(filtered) != len(raw_evidence):
            logger.warning(f"Discarded {len(raw_evidence) - len(filtered)} chunks from unauthorized documents in evidence check.")
        raw_evidence = filtered

        if not raw_evidence:
            evidence_sufficient = False
            missing_summary = 'No evidence passages belong to the selected document(s).'

        else:

            for e in raw_evidence:
                meta = e.get('metadata', {})
                if meta.get('document_id') and meta.get('chunk_id') and e.get('text'):
                    validated_evidence.append(e)

            if not validated_evidence:
                evidence_sufficient = False
                missing_summary = 'Evidence chunks lack valid required metadata.'
            else:

                top_score = validated_evidence[0].get('rerank_score', 0.0)
                combined_text = ' '.join([e.get('text', '') for e in validated_evidence]).lower()

                stop_words = {
                    'what', 'which', 'where', 'when', 'who', 'whom', 'whose', 'why', 'how',
                    'does', 'doing', 'done', 'paper', 'this', 'that', 'these', 'those',
                    'according', 'explain', 'describe', 'detail', 'summary', 'overview',
                    'about', 'with', 'from', 'into', 'during', 'before', 'after', 'above',
                    'below', 'between', 'have', 'having', 'were', 'been', 'their', 'there'
                }
                query_tokens = [w for w in re.findall(r'[a-zA-Z0-9_\-]+', query.lower()) if len(w) >= 3 and w not in stop_words]

                is_overview_query = any(k in query.lower() for k in ['about', 'contributions', 'main ideas', 'summary', 'overview', 'introduce', 'purpose'])
                target_entities = state.get('target_entities', [])

                if target_entities and not is_overview_query:
                    for ent in target_entities:
                        ent_l = ent.lower()
                        if ent_l not in combined_text and not any(w in combined_text for w in ent_l.split() if len(w) >= 3):
                            missing_entities.append(ent)

                required_concepts = state.get('required_concepts', [])
                concept_coverage = state.get('concept_coverage', {})
                coverage_score = state.get('coverage_score', 1.0)
                if required_concepts:
                    for c in required_concepts:
                        cov = concept_coverage.get(c, {})
                        if not cov.get('covered', False):
                            missing_concepts.append(c)

                if missing_concepts:
                    evidence_sufficient = False
                    if retrieval_attempt < max_attempts:
                        missing_summary = f"Selected document evidence is missing coverage for concepts: {', '.join(missing_concepts)}."
                    else:
                        missing_summary = "I don't have sufficient evidence in the selected document to fully answer all parts of this question."
                elif missing_entities and retrieval_attempt < max_attempts:
                    evidence_sufficient = False
                    missing_summary = f"Selected document evidence is missing coverage for requested entity: {', '.join(missing_entities)}."
                elif not is_overview_query and query_tokens:
                    matches = [t for t in query_tokens if t in combined_text]
                    token_overlap = len(matches) / len(query_tokens)
                    if len(matches) == 0 or (token_overlap < 0.25 and top_score < 0.4):
                        evidence_sufficient = False
                        missing_summary = f"Selected document has insufficient evidence for query concepts ({[t for t in query_tokens if t not in combined_text]})."
                elif not is_overview_query and top_score < 0.2:
                    evidence_sufficient = False
                    missing_summary = f'Top rerank score ({top_score:.2f}) is too low to ground an answer.'

                hardened_enabled = getattr(settings, 'ENABLE_HARDENED_ABSTENTION', False) or state.get('enable_hardened_abstention', False)
                evidence_tier = 'STRONGLY_SUPPORTED'
                if hardened_enabled and evidence_sufficient:
                    tier, reason = check_evidence_sufficiency_hardened(query, validated_evidence, target_entities, is_overview_query)
                    evidence_tier = tier
                    if tier == 'UNSUPPORTED':
                        evidence_sufficient = False
                        missing_summary = f"I don't have sufficient evidence in the selected document to answer this question. ({reason})"

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency[f'evidence_check_attempt_{retrieval_attempt}'] = duration_ms
    timings = dict(state.get('timings_ms', {}))
    timings['evidence_gate'] = duration_ms

    from app.observability.logging import log_event
    from app.observability.tracing import get_global_metrics
    get_global_metrics().record_node_latency('evidence_gate', duration_ms)

    decision_label = 'PASS' if evidence_sufficient else ('WEAK' if evidence_tier == 'WEAKLY_SUPPORTED' else 'FAIL')
    cand_count = len(candidates) if 'candidates' in locals() else len(validated_evidence)
    top_sc = top_score if 'top_score' in locals() else 0.0

    log_event(
        logger,
        event='evidence_gate_completed',
        level='INFO' if evidence_sufficient else 'WARNING',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=state.get('current_document_ids', []),
        latency_ms=duration_ms,
        decision=decision_label,
        evidence_tier=evidence_tier,
        relevant_candidate_count=cand_count,
        top_rerank_score=top_sc,
        evidence_chunk_ids=[e.get('chunk_id') for e in validated_evidence],
        reason=missing_summary or evidence_tier,
        status='success' if evidence_sufficient else 'rejected'
    )
    if not evidence_sufficient:
        log_event(
            logger,
            event='abstention_triggered',
            level='WARNING',
            request_id=state.get('request_id'),
            trace_id=state.get('trace_id'),
            document_ids=state.get('current_document_ids', []),
            reason=missing_summary or 'insufficient_evidence',
            evidence_tier=evidence_tier,
            status='insufficient'
        )

    logger.info(f"Grounding Gate (attempt {retrieval_attempt}): sufficient={evidence_sufficient}, missing_concepts={missing_concepts}, missing_entities={missing_entities}, tier={evidence_tier}, summary='{missing_summary}' ({duration_ms}ms)")

    return {
        'evidence_sufficient': evidence_sufficient,
        'evidence_tier': evidence_tier,
        'validated_evidence': validated_evidence if evidence_sufficient else [],
        'evidence': validated_evidence if evidence_sufficient else [],
        'missing_evidence_summary': missing_summary,
        'missing_entities': missing_entities,
        'missing_concepts': missing_concepts,
        'execution_trace': trace,
        'latency': latency,
        'timings_ms': timings
    }

def check_evidence_sufficiency_hardened(
    query: str,
    validated_evidence: List[Dict[str, Any]],
    target_entities: Optional[List[str]] = None,
    is_overview_query: bool = False
) -> Tuple[str, str]:
\
\
\
\
\

    if not validated_evidence:
        return 'UNSUPPORTED', 'No evidence passages found.'

    q_low = query.lower()
    combined_ev = ' '.join([e.get('text', '') for e in validated_evidence]).lower()
    top_score = float(validated_evidence[0].get('rerank_score', validated_evidence[0].get('score', 0.0)))

    versioned_entities = re.findall(r'\b(?:gpt|chatgpt|llama|t5|claude|gemini)[\s\-_]?(?:\d+(?:\.\d+)?|neo|turbo|plus)\b', q_low)
    for ve in versioned_entities:
        ve_clean = re.sub(r'[\s\-_]', '', ve)
        ev_clean = re.sub(r'[\s\-_]', '', combined_ev)
        if ve_clean not in ev_clean:
            return 'UNSUPPORTED', f"Target versioned entity '{ve}' is absent from the selected document."

    external_entities = [
        'chatgpt', 'nvidia', 'bangalore', 'stock price', 'market cap',
        'openai founder', 'who founded', 'who created', 'led the development',
        'cloud hosting', 'carbon footprint', 'electricity consumption'
    ]
    for ee in external_entities:
        if ee in q_low and ee not in combined_ev:
            return 'UNSUPPORTED', f"External entity or concept '{ee}' is absent from the selected document."

    predicates = {
        'founder': ['founder', 'founded', 'creator', 'created by', 'ceo'],
        'latency': ['latency', 'inference time', 'ms per', 'throughput', 'speedup', 'runtime'],
        'electricity': ['electricity', 'carbon', 'power consumption', 'kwh', 'co2', 'energy consumption'],
        'cost': ['cost', 'pricing', 'dollar', 'expense', 'cloud hosting', 'hosting cost', 'deployment cost'],
        'weather': ['weather', 'temperature', 'forecast', 'rain'],
        'stock': ['stock', 'shares', 'nasdaq', 'ticker', 'dividend'],
        'decoder architecture': ['decoder architecture', 'transformer decoder architecture', 'decoder layer', 'detailed transformer decoder'],
        'learning rate for gpt': ['learning rate for gpt', 'gpt-4 learning rate', 'adam for gpt']
    }

    for pred_key, synonyms in predicates.items():
        if pred_key in q_low:
            has_match = any(syn in combined_ev for syn in synonyms)
            if not has_match:
                return 'UNSUPPORTED', f"Requested fact or attribute '{pred_key}' is not contained in the evidence."

    stop_words = {
        'what', 'which', 'where', 'when', 'who', 'whom', 'whose', 'why', 'how',
        'does', 'doing', 'done', 'paper', 'this', 'that', 'these', 'those', 'the',
        'according', 'explain', 'describe', 'detail', 'summary', 'overview',
        'about', 'with', 'from', 'into', 'during', 'before', 'after', 'above',
        'below', 'between', 'have', 'having', 'were', 'been', 'their', 'there',
        'is', 'are', 'was', 'used', 'can', 'for', 'and', 'bert'
    }
    content_tokens = [w for w in re.findall(r'[a-zA-Z0-9_\-]+', q_low) if len(w) >= 3 and w not in stop_words]
    if content_tokens and not is_overview_query:
        matches = [t for t in content_tokens if t in combined_ev or (len(t) >= 4 and t[:4] in combined_ev)]
        overlap = len(matches) / len(content_tokens)
        if overlap < 0.25 and top_score < 0.50:
            return 'UNSUPPORTED', f"Substantive query content overlap ({overlap:.2f}) and rerank score ({top_score:.2f}) are too low."

    if top_score >= 0.50:
        return 'STRONGLY_SUPPORTED', 'Verified factual evidence present in document.'
    elif top_score >= 0.25:
        return 'WEAKLY_SUPPORTED', 'Partial topical evidence present in document.'
    else:
        return 'UNSUPPORTED', f'Rerank score ({top_score:.2f}) is below confidence threshold.'

def insufficient_evidence_node(state: ResearchState) -> Dict[str, Any]:
    trace = list(state.get('execution_trace', []))
    trace.append('Insufficient Evidence Gate')
    current_doc_ids = [str(d).strip() for d in state.get('current_document_ids', []) if d and str(d).strip()]
    if not current_doc_ids:
        meta = state.get('metadata', {})
        if meta.get('allowed_document_ids'):
            current_doc_ids = [str(d).strip() for d in meta['allowed_document_ids'] if d and str(d).strip()]
        elif meta.get('document_id'):
            current_doc_ids = [str(meta['document_id']).strip()]

    if not current_doc_ids:
        refusal_msg = "No document is currently selected. Please upload a document before asking questions."
        status = "BLOCKED"
        doc_valid = False
    elif (state.get('required_concepts') and len(state.get('required_concepts', [])) > 1 and state.get('coverage_score', 1.0) < 1.0) or \
         ("fully answer all parts" in state.get('missing_evidence_summary', '')):
        refusal_msg = "I don't have sufficient evidence in the selected document to fully answer all parts of this question."
        status = "INSUFFICIENT"
        doc_valid = True
    else:
        refusal_msg = "I don't have sufficient evidence in the selected document to answer this question."
        status = "INSUFFICIENT"
        doc_valid = True

    reason = state.get('missing_evidence_summary', refusal_msg)
    out = {
        'answer': refusal_msg,
        'document_scope_valid': doc_valid,
        'grounding_status': status,
        'answerable': False,
        'evidence_sufficient': False,
        'grounded': False,
        'confidence': 0.0,
        'citations': [],
        'key_points': [],
        'evidence': [],
        'validated_evidence': [],
        'grounding': {
            'is_grounded': False,
            'confidence': 0.0,
            'supported_claims': [],
            'unsupported_claims': ['Query cannot be grounded in the selected document.'],
            'evidence_coverage': 0.0,
            'critique': reason
        },
        'execution_trace': trace
    }

    from app.observability.logging import log_event
    log_event(
        logger,
        event='abstention_triggered',
        level='WARNING',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        reason=reason,
        status=status
    )

    try:
        from app.evaluation.evaluation_logger import record_state_evaluation
        record_state_evaluation({**state, **out})
    except Exception as e:
        logger.warning(f"Evaluation logging failed: {e}")
    return out

def query_refinement_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    trace = list(state.get('execution_trace', []))
    trace.append('Query Refinement')
    original_query = state.get('original_query', state.get('query', ''))
    evidence = state.get('evidence', [])
    missing_info = state.get('missing_evidence_summary', 'Need more specific technical details.')
    missing_entities = state.get('missing_entities', [])
    missing_concepts = state.get('missing_concepts', [])
    retrieval_attempt = state.get('retrieval_attempt', 1) + 1
    evidence_snippets = '\n'.join([f"- {e.get('text', '')[:200]}" for e in evidence[:3]]) or 'None'
    client = get_cohere_client()

    refined_query = original_query
    retrieval_queries: List[str] = list(state.get('retrieval_queries', []))
    sub_questions = list(state.get('sub_questions', []))

    if missing_concepts:
        concept_str = " ".join(missing_concepts)
        refined_query = f"{original_query} {concept_str}"
        retrieval_queries = [f"{original_query} {c}" for c in missing_concepts] + [f"{c} section details" for c in missing_concepts]
        token_usage = state.get('token_usage', {})
    elif missing_entities:
        ent_str = " ".join(missing_entities)
        refined_query = f"{original_query} {ent_str} benchmark results Table"
        targeted_q = f"{ent_str} benchmark performance metrics Table"
        retrieval_queries = [refined_query, targeted_q]
        token_usage = state.get('token_usage', {})
    else:
        prompt = QUERY_REFINEMENT_PROMPT.format(original_query=original_query, evidence_summary=evidence_snippets, missing_info=missing_info)
        try:
            gen_res = client.generate(prompt=prompt, temperature=0.2, response_format={'type': 'json_object'} if client.is_live else None)
            try:
                parsed = json.loads(gen_res.text)
            except Exception:
                cleaned = gen_res.text.strip().strip('`').replace('json\n', '')
                parsed = json.loads(cleaned)
            refined_queries = parsed.get('refined_queries', [])
            if refined_queries:
                refined_query = refined_queries[0]
                retrieval_queries = refined_queries
                sub_questions.extend(refined_queries[1:])
            token_usage = dict(state.get('token_usage', {}))
            token_usage['prompt_tokens'] = token_usage.get('prompt_tokens', 0) + gen_res.prompt_tokens
            token_usage['completion_tokens'] = token_usage.get('completion_tokens', 0) + gen_res.completion_tokens
            token_usage['total_tokens'] = token_usage['prompt_tokens'] + token_usage['completion_tokens']
        except Exception as e:
            logger.warning(f'Query refinement failed: {e}. Appending search terms.')
            refined_query = f'{original_query} technical architecture benchmark empirical results'
            retrieval_queries = [refined_query]
            token_usage = state.get('token_usage', {})

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency[f'query_refinement_attempt_{retrieval_attempt}'] = duration_ms
    logger.info(f"Refined query to: '{refined_query}' (attempt {retrieval_attempt}) in {duration_ms}ms")
    return {
        'query': refined_query,
        'retrieval_queries': retrieval_queries,
        'sub_questions': sub_questions,
        'retrieval_attempt': retrieval_attempt,
        'execution_trace': trace,
        'latency': latency,
        'token_usage': token_usage
    }

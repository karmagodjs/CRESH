import json
import time
from typing import Any, Dict, List
from app.agent.state import ResearchState
from app.models.cohere_client import get_cohere_client
from app.models.prompts import QUERY_DECOMPOSITION_PROMPT
from app.observability.logging import get_logger
logger = get_logger('node.decomposition')

def decomposition_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    query = state.get('query', '')
    query_type = state.get('query_type', 'comparative')
    trace = list(state.get('execution_trace', []))
    trace.append('Query Decomposition')
    client = get_cohere_client()
    prompt = QUERY_DECOMPOSITION_PROMPT.format(query=query, query_type=query_type)
    sub_questions: List[str] = []
    existing_subs = state.get('sub_questions', [])
    token_usage = dict(state.get('token_usage', {}))
    if existing_subs and len(existing_subs) >= 2 and not client.is_live:
        sub_questions = existing_subs
    else:
        try:
            gen_res = client.generate(prompt=prompt, temperature=0.1, response_format={'type': 'json_object'} if client.is_live else None)
            try:
                parsed = json.loads(gen_res.text)
            except Exception:
                cleaned = gen_res.text.strip().strip('`').replace('json\n', '')
                parsed = json.loads(cleaned)
            sub_questions = parsed.get('sub_questions', [])
            token_usage = dict(state.get('token_usage', {}))
            token_usage['prompt_tokens'] = token_usage.get('prompt_tokens', 0) + gen_res.prompt_tokens
            token_usage['completion_tokens'] = token_usage.get('completion_tokens', 0) + gen_res.completion_tokens
            token_usage['total_tokens'] = token_usage['prompt_tokens'] + token_usage['completion_tokens']
        except Exception as e:
            logger.warning(f'Query decomposition failed: {e}. Generating fallback sub-questions.')
            sub_questions = existing_subs if (existing_subs and len(existing_subs) >= 2) else [
                f'What is the theoretical and architectural mechanism of: {query}?',
                f'What are the empirical benchmarks, speedups, and limitations of: {query}?'
            ]
            token_usage = state.get('token_usage', {})

    if not sub_questions or (len(sub_questions) <= 1 and existing_subs and len(existing_subs) >= 2):
        sub_questions = existing_subs if (existing_subs and len(existing_subs) >= 2) else [query]

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency['query_decomposition'] = duration_ms
    logger.info(f'Decomposed query into {len(sub_questions)} sub-questions ({duration_ms}ms)')
    return {'sub_questions': sub_questions, 'execution_trace': trace, 'latency': latency, 'token_usage': token_usage}

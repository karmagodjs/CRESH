from typing import Literal
from app.agent.state import ResearchState
from app.observability.logging import get_logger
logger = get_logger('edges')

def route_document_scope(state: ResearchState) -> Literal['blocked_response', 'query_analysis']:
    is_valid = state.get('document_scope_valid', False)
    if not is_valid:
        logger.warning('Document scope invalid: Routing to blocked response node.')
        return 'blocked_response'
    logger.info('Document scope valid: Routing to query analysis.')
    return 'query_analysis'

def route_query_complexity(state: ResearchState) -> Literal['decomposition', 'retrieval']:

    is_complex = state.get('is_complex', False)
    if is_complex:
        logger.info('Routing query to decomposition node.')
        return 'decomposition'
    logger.info('Routing query directly to retrieval node.')
    return 'retrieval'

def route_evidence_sufficiency(state: ResearchState) -> Literal['generation', 'refinement', 'insufficient_evidence']:
    sufficient = state.get('evidence_sufficient', True)
    attempts = state.get('retrieval_attempt', 1)
    max_attempts = state.get('max_retrieval_attempts', 3)
    if sufficient:
        logger.info(f'Evidence sufficient. Proceeding to generation (attempt={attempts}).')
        return 'generation'
    if attempts < max_attempts:
        logger.info(f'Evidence insufficient. Triggering query refinement (attempt {attempts}/{max_attempts}).')
        return 'refinement'
    logger.info(f'Evidence insufficient after {attempts} attempts. Routing to insufficient evidence gate.')
    return 'insufficient_evidence'

def route_verification_result(state: ResearchState) -> Literal['end', 'regenerate']:
    grounding = state.get('grounding', {})
    is_grounded = grounding.get('is_grounded', True)
    regen_attempts = state.get('regeneration_attempt', 0)
    max_regen = state.get('max_regeneration_attempts', 2)
    if is_grounded or regen_attempts >= max_regen:
        logger.info('Verification passed or max retries reached. Finalizing response.')
        return 'end'
    logger.info(f'Grounding failed. Triggering answer regeneration (attempt {regen_attempts + 1}/{max_regen}).')
    return 'regenerate'

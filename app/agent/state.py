from typing import Any, Dict, List, Optional, TypedDict
from pydantic import BaseModel, Field

class CitationInfo(BaseModel):
    citation_id: str = '1'
    citation_index: int = 1
    document_id: str = ''
    document_title: str = ''
    document_name: str = ''
    filename: str = ''
    page_number: int = 1
    section: str = 'General'
    section_title: str = 'General'
    section_name: str = ''
    section_number: str = ''
    section_type: str = 'other'
    chunk_id: str = ''
    snippet: str = ''
    relevance_score: float = 0.0

    def model_post_init(self, __context: Any) -> None:
        if not self.citation_id:
            self.citation_id = str(self.citation_index)
        if not self.document_name:
            self.document_name = self.filename
        if not self.filename:
            self.filename = self.document_name
        if not self.section_name:
            self.section_name = self.section or self.section_title or 'General'
        if not self.section:
            self.section = self.section_name
        elif not self.section_title or self.section_title == 'General':
            self.section_title = self.section_name

class GroundingAssessment(BaseModel):
    is_grounded: bool = True
    confidence: float = 1.0
    supported_claims: List[str] = Field(default_factory=list)
    unsupported_claims: List[str] = Field(default_factory=list)
    evidence_coverage: float = 1.0
    critique: str = ''
    metrics: Dict[str, Any] = Field(default_factory=dict)

class ResearchState(TypedDict, total=False):
    request_id: str
    trace_id: str
    question_id: Optional[str]
    query: str
    original_query: str
    query_type: str
    query_intent: str
    is_complex: bool
    sub_questions: List[str]
    required_concepts: List[str]
    retrieval_queries: List[str]
    target_entities: List[str]
    missing_entities: List[str]
    requested_facts: List[str]
    expected_evidence_type: str
    section_preferences: List[str]
    selection_reasons: Dict[str, str]
    evidence_by_concept: Dict[str, List[Dict[str, Any]]]
    concept_coverage: Dict[str, Dict[str, Any]]
    coverage_score: float
    retrieval_debug: Dict[str, Any]
    evaluation_log: Dict[str, Any]
    current_document_ids: List[str]
    retrieved_documents: List[Dict[str, Any]]
    retrieved_chunks: List[Dict[str, Any]]
    reranked_documents: List[Dict[str, Any]]
    reranked_chunks: List[Dict[str, Any]]
    validated_evidence: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    evidence_sufficient: bool
    evidence_tier: str
    grounded: bool
    retrieval_attempt: int
    max_retrieval_attempts: int
    missing_evidence_summary: str
    answer: str
    key_points: List[str]
    citations: List[Dict[str, Any]]
    grounding: Dict[str, Any]
    confidence: float
    regeneration_attempt: int
    max_regeneration_attempts: int
    metadata: Dict[str, Any]
    document_scope_valid: bool
    grounding_status: str
    answerable: bool
    errors: List[str]
    latency: Dict[str, float]
    timings_ms: Dict[str, float]
    token_usage: Dict[str, Any]
    model_accounting: List[Dict[str, Any]]
    execution_trace: List[str]


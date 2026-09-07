from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    request_id: Optional[str] = Field(default=None)
    trace_id: Optional[str] = Field(default=None)
    question_id: Optional[str] = Field(default=None)
    document_id: Optional[str] = Field(default=None)
    allowed_document_ids: Optional[List[str]] = Field(default=None)
    selected_document_ids: Optional[List[str]] = Field(default=None)
    top_k: int = Field(default=20, ge=1, le=100)
    rerank_top_k: int = Field(default=5, ge=1, le=20)
    enable_decomposition: bool = Field(default=True)
    enable_iterative: bool = Field(default=True)

class CitationResponse(BaseModel):
    citation_index: int
    citation_id: str = '1'
    document_id: str = ''
    document_title: str = ''
    document_name: str = ''
    filename: str = ''
    page_number: int = 1
    section: str = 'General'
    section_title: str = 'General'
    chunk_id: str = ''
    snippet: str = ''
    relevance_score: float = 0.0

class EvidenceChunkResponse(BaseModel):
    chunk_id: str
    text: str
    context_header: str = ''
    initial_rank: int = 1
    initial_score: float = 0.0
    rerank_score: float = 0.0
    rerank_rank: int = 1
    dense_score: Optional[float] = None
    bm25_score: Optional[float] = None
    entity_match_score: Optional[float] = None
    intent_match_score: Optional[float] = None
    section_match_score: Optional[float] = None
    answerability_score: Optional[float] = None
    specificity_score: Optional[float] = None
    final_evidence_score: Optional[float] = None
    selection_reason: Optional[str] = None
    document_id: str = ''
    document_title: str = 'Unknown'
    document_name: str = ''
    filename: str = ''
    page_number: int = 1
    section: str = 'General'
    section_title: str = 'General'

class QueryResponse(BaseModel):
    query: str
    answer: str
    key_points: List[str]
    citations: List[CitationResponse]
    confidence: float
    grounded: bool = True
    evidence_sufficient: bool
    document_scope_valid: bool = True
    grounding_status: str = 'PASS'
    answerable: bool = True
    grounding_assessment: Dict[str, Any]

    candidate_passages: List[Dict[str, Any]]
    reranked_passages: List[EvidenceChunkResponse]
    retrieval_debug: Optional[Dict[str, Any]] = None
    execution_trace: List[str]
    latency_breakdown: Dict[str, float]
    total_latency_ms: float
    token_usage: Dict[str, Any]
    estimated_cost_usd: float

    request_id: str = ''
    trace_id: str = ''
    question_id: Optional[str] = None
    evidence_tier: Optional[str] = None
    timings_ms: Optional[Dict[str, float]] = None
    model_accounting: Optional[List[Dict[str, Any]]] = None

class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    title: str
    page_count: int
    chunk_count: int
    created_at: str
    file_size_bytes: int
    section_titles: List[str]

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total_documents: int
    total_chunks: int

class HealthResponse(BaseModel):
    status: str
    version: str
    cohere_live: bool
    vector_store_health: Dict[str, Any]
    total_indexed_chunks: int

class ReadinessResponse(BaseModel):
    status: str
    version: str
    dependencies: Dict[str, str]
    total_indexed_chunks: int

class MetricsResponse(BaseModel):
    total_queries: int
    average_latency_ms: float
    total_tokens_processed: int
    total_estimated_cost_usd: float
    latency_percentiles: Optional[Dict[str, Any]] = None
    model_accounting: Optional[Dict[str, Any]] = None

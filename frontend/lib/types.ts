export interface DocumentResponse {
  document_id: string;
  filename: string;
  title: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
  file_size_bytes: number;
  section_titles: string[];
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total_documents: number;
  total_chunks: number;
}

export interface CitationResponse {
  citation_index: number;
  citation_id: string;
  document_id: string;
  document_title: string;
  document_name: string;
  filename: string;
  page_number: number;
  section: string;
  section_title: string;
  chunk_id: string;
  snippet: string;
  relevance_score: number;
}

export interface EvidenceChunkResponse {
  chunk_id: string;
  text: string;
  context_header: string;
  initial_rank: number;
  initial_score: number;
  rerank_score: number;
  rerank_rank: number;
  dense_score?: number | null;
  bm25_score?: number | null;
  entity_match_score?: number | null;
  intent_match_score?: number | null;
  section_match_score?: number | null;
  answerability_score?: number | null;
  specificity_score?: number | null;
  final_evidence_score?: number | null;
  selection_reason?: string | null;
  document_id: string;
  document_title: string;
  document_name: string;
  filename: string;
  page_number: number;
  section: string;
  section_title: string;
}

export interface QueryRequest {
  query: string;
  request_id?: string;
  trace_id?: string;
  question_id?: string;
  document_id?: string;
  allowed_document_ids?: string[];
  selected_document_ids?: string[];
  top_k?: number;
  rerank_top_k?: number;
  enable_decomposition?: boolean;
  enable_iterative?: boolean;
}

export interface QueryResponse {
  query: string;
  answer: string;
  key_points: string[];
  citations: CitationResponse[];
  confidence: number;
  grounded: boolean;
  evidence_sufficient: boolean;
  document_scope_valid: boolean;
  grounding_status: string;
  answerable: boolean;
  grounding_assessment: Record<string, any>;
  candidate_passages: Array<Record<string, any>>;
  reranked_passages: EvidenceChunkResponse[];
  retrieval_debug?: Record<string, any> | null;
  execution_trace: string[];
  latency_breakdown: Record<string, number>;
  total_latency_ms: number;
  token_usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    [key: string]: any;
  };
  estimated_cost_usd: number;
  request_id: string;
  trace_id: string;
  question_id?: string | null;
  evidence_tier?: string | null;
  timings_ms?: Record<string, number> | null;
  model_accounting?: Array<Record<string, any>> | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  cohere_live: boolean;
  vector_store_health: Record<string, any>;
  total_indexed_chunks: number;
}

export interface ReadinessResponse {
  status: string;
  version: string;
  dependencies: Record<string, string>;
  total_indexed_chunks: number;
}

export interface MetricsResponse {
  total_queries: number;
  average_latency_ms: number;
  total_tokens_processed: number;
  total_estimated_cost_usd: number;
  latency_percentiles?: {
    p50_ms?: number;
    p90_ms?: number;
    p95_ms?: number;
    p99_ms?: number;
    mean_ms?: number;
    min_ms?: number;
    max_ms?: number;
    count?: number;
    [key: string]: any;
  } | null;
  model_accounting?: Record<string, any> | null;
}

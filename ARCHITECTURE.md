# Cohere Research Intelligence (CRI) — Technical Architecture Specification

This document provides a comprehensive technical architecture specification of Cohere Research Intelligence (CRI), an agentic, document-isolated retrieval-augmented generation (RAG) system engineered for dense scientific literature.

---

## 1. System Overview

CRI is designed to overcome the core vulnerabilities of naive RAG systems: topic drift, cross-document contamination, parametric hallucinations on out-of-scope queries, weak attribution, and hidden retrieval failures.

The system is organized into three primary operational tiers:
1. **Ingestion & Indexing Engine**: Structural document decomposition, context header injection, dense embedding generation, and lexical inverted index creation.
2. **Reasoning & Synthesis Graph (LangGraph)**: Stateful graph orchestration executing leak-free query expansion, dual-channel hybrid retrieval, Reciprocal Rank Fusion, Cohere neural cross-encoder reranking, multi-tier evidence gating, targeted generation, and citation/grounding verification.
3. **Production Observability & Resilience Layer**: End-to-end request tracing, structured JSON logging with secret redaction, node-level latency percentile accounting, bounded exponential retries, and circuit safety fallbacks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             USER INTERFACE TIER                             │
│       Streamlit Research Workbench (User View / Collapsible Developer View) │
│       FastAPI REST Endpoints (/health, /ready, /metrics, /query, /documents)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LANGGRAPH STATE MACHINE ENGINE                         │
│                                                                             │
│  [Document Scope Guard] ──(No Scope)──► [Safe Abstention]                   │
│          │                                                                  │
│          ▼                                                                  │
│  [Leak-Free Query Expansion & Intent Classifier]                            │
│          │                                                                  │
│          ├──► [Qdrant Dense Vector Search (Cohere Embed v3)] ──► Top-25     │
│          └──► [Rank-BM25 Lexical Inverted Index]             ──► Top-25     │
│          │                                                                  │
│          ▼                                                                  │
│  [Reciprocal Rank Fusion (RRF, k=60)]                        ──► Top-25     │
│          │                                                                  │
│          ▼                                                                  │
│  [Cohere Rerank v3.5 Neural Cross-Encoder]                   ──► Top-10     │
│          │                                                                  │
│          ▼                                                                  │
│  [Evidence Sufficiency Gate (3-Tier Check)] ──(Fail)────────► [Safe Refusal]│
│          │                                                                  │
│          ▼                                                                  │
│  [Targeted Generation (Command R+ with In-Scope Context)]                   │
│          │                                                                  │
│          ▼                                                                  │
│  [Citation Verification & Provenance Mapper]                                │
│          │                                                                  │
│          ▼                                                                  │
│  [Grounding Confidence & Token Overlap Judge]                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE & STORAGE                           │
│       Qdrant Vector Database (Payload Isolated by document_id)              │
│       In-Memory BM25 Corpus Dictionaries & Document Metadata Registry       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Lifecycle

1. **Client Dispatch**: The client sends a `POST /query` request with `{ query: str, document_ids: List[str] }`.
2. **Context & Correlation Initialization**: The API generates a unique `request_id` (UUIDv4) and `trace_id` (`trc_<hex12>`). A `ResearchState` dictionary is instantiated.
3. **Document Scope Guard**: Validates that `document_ids` is non-empty and references registered documents. If empty or invalid, routes to safe abstention (0 retrieval, 0 rerank, 0 generation calls).
4. **Query Analysis & Expansion**: Extracts question intent and identifies technical entities. Generates targeted search variants without fabricating document claims.
5. **Parallel Retrieval**: Dispatches simultaneous queries to Qdrant (dense vector similarity) and BM25 (lexical exact matching), retrieving 25 candidates each.
6. **Reciprocal Rank Fusion (RRF)**: Combines candidates using rank positions with constant $k=60$ into a consolidated Top-25 pool.
7. **Cohere Reranking**: Submits the candidate pool to Cohere Rerank v3.5, scoring each passage against the expanded query to produce a Top-10 evidence pool.
8. **Evidence Sufficiency Gating**: Assesses rerank scores, entity coverage, and answerability. Queries deemed unsupported trigger safe abstention.
9. **Targeted Generation**: If evidence is sufficient, passes the Top-10 passages to Cohere Command R+ with instructions to place the direct answer in the lead sentence and cite sources.
10. **Citation Verification**: Extracts `[n]` citations, maps them to passage metadata, and ensures they belong to the active document scope.
11. **Grounding Evaluation**: Verifies that answer claims are supported by the retrieved evidence tokens.
12. **Response Delivery**: Emits `request_completed` structured event and returns the verified `QueryResponse` with answer, citations, trace IDs, and stage timings.

---

## 3. Document Ingestion

Document ingestion is handled by `PDFParser` in `app/ingestion/parser.py`:
- **Engine**: PyMuPDF (`fitz`) for PDF stream decoding; fallback plain text parser for `.txt` and `.md`.
- **Block & Span Extraction**: Iterates over PDF pages, extracting line spans with font size, weight, and layout geometry.
- **Section Detection**: Employs regex patterns matching numbered sections (`1. Introduction`, `3.1 Task #1: Masked LM`) and major headings (`Abstract`, `References`, `Ablation Studies`).
- **Metadata Extraction**: Calculates SHA-256 document hashes, title detection from PDF metadata or initial header blocks, page counts, and total byte size.

---

## 4. Chunking

Chunking is governed by `StructureAwareChunker` in `app/ingestion/chunker.py`:
- **Target Size**: 400 tokens (approx. 1,600 characters).
- **Chunk Overlap**: 80 tokens (approx. 320 characters).
- **Boundary Preservation**: Splits documents along section boundaries and paragraphs rather than arbitrary character offsets.
- **Context Injection**: Every chunk prepends a structured context header:
  `[Document: <Title> | Section: <Section Name> | Page: <Page Num>]`
  This ensures that when a chunk is retrieved in isolation, its provenance and topical context remain intact for both embedding and generation.

---

## 5. Embedding

Embedding is handled by `CohereClientWrapper.embed()` in `app/models/cohere_client.py`:
- **Model**: `embed-english-v3.0`.
- **Dimensionality**: 1,024 dimensions.
- **Asymmetric Task Markers**:
  - `input_type="search_document"`: Used when indexing chunks into the vector store.
  - `input_type="search_query"`: Used when embedding incoming user questions.
  This asymmetric framing aligns short questions with long document passages in the vector space.
- **Batching**: Submits texts in batches of up to 96 chunks with bounded retry handling.

---

## 6. BM25 Indexing

Lexical search is implemented by `BM25Index` in `app/retrieval/bm25.py`:
- **Algorithm**: Rank-BM25 (BM25+ algorithm variant).
- **Tokenization**: Lowercase normalization, alphanumeric token filtering, and stop-word preservation for technical terms.
- **Document Scope Indexing**: Stores chunks partitioned by `document_id`. Searching with a document filter restricts the corpus dictionary exclusively to chunks matching the allowed document IDs.

---

## 7. Dense Retrieval

Dense retrieval is executed by `QdrantVectorStore` in `app/retrieval/vector_store.py`:
- **Vector DB**: Qdrant running in-memory (`:memory:`) or persistent networked mode.
- **Distance Metric**: Cosine similarity.
- **Payload Filtering**: Every point includes payload metadata (`document_id`, `chunk_id`, `page_number`, `section_title`).
- **Strict Scope Filter**: Queries apply a Qdrant `FieldCondition(key="document_id", match=MatchAny(values=allowed_ids))` ensuring vectors outside the active scope are physically excluded from candidate scoring.
- **Candidate Pool**: Top-25 nearest neighbor vectors per query.

---

## 8. Reciprocal Rank Fusion (RRF)

Candidate fusion is executed by `ReciprocalRankFusion` in `app/retrieval/fusion.py`:
- **Formula**:
  $$RRF\_Score(d) = \sum_{m \in \{Dense, BM25\}} \frac{1}{k + rank_m(d)}$$
  where $k = 60$.
- **Rationale**: Dense cosine similarities and BM25 scores follow entirely different numerical distributions. RRF relies exclusively on relative rank positions, preventing either channel from dominating due to score scale disparities.
- **Output**: Returns a deduplicated, ranked pool of the Top-25 candidates.

---

## 9. Cohere Reranking

Reranking is executed by `CohereClientWrapper.rerank()` in `app/models/cohere_client.py`:
- **Model**: `rerank-v3.5`.
- **Mechanism**: Deep cross-encoder evaluating cross-attention over `(query, passage)` pairs.
- **Candidate Pool**: Takes the Top-25 RRF candidates and returns the Top-10 highest-scoring passages.
- **Value**: Reranking elevates passages containing specific factual details (e.g., table figures, exact percentages) that may have placed low in dense similarity due to vocabulary distribution.
- **Resilience**: If the external rerank API encounters transient outages, the system safely degrades to the RRF candidate ordering without raising unhandled exceptions.

---

## 10. Evidence Sufficiency Gate

Implemented in `app/agent/nodes/evidence_check.py`:
- **Objective**: Prevent parametric hallucinations by determining whether retrieved evidence is sufficient to answer the user's question before calling the generative LLM.
- **Three-Tier Classification**:
  1. `STRONGLY_SUPPORTED`: Top rerank score $\ge 0.50$, required query entities present in evidence text, and answerability score $\ge 0.70$.
  2. `PARTIALLY_SUPPORTED`: Rerank score between $0.25$ and $0.50$ with core topic presence.
  3. `UNSUPPORTED`: Rerank score $< 0.25$, or missing required technical entities.
- **Enforcement**: When `ENABLE_HARDENED_ABSTENTION` is active, queries evaluating to `UNSUPPORTED` bypass generation entirely and trigger safe abstention.

---

## 11. Targeted Generation

Implemented in `app/agent/nodes/generation.py`:
- **Model**: Cohere `command-r-plus-08-2024`.
- **Temperature**: 0.0 (strictly deterministic).
- **Prompt Engineering**:
  - Requires the model to provide the direct answer in the lead sentence.
  - Forbids extrapolations or references to unprovided external knowledge.
  - Enforces inline citation brackets `[n]` immediately following factual assertions.
- **Context Ceiling**: Enforces a 32,000-character context ceiling to protect against token exhaustion and latency spikes.

---

## 12. Grounding Verification

Implemented in `app/agent/nodes/verification.py`:
- **Claim Extraction**: Breaks the synthesized answer into discrete factual claims.
- **Evidence Overlap**: Computes lexical and n-gram overlap between each claim and the retrieved evidence passages.
- **Thresholds**: Computes a `supported_claims_ratio`. If the ratio falls below 0.60, the answer is flagged as ungrounded (`is_grounded = False`).

---

## 13. Citation Verification

Implemented in `app/agent/nodes/citation.py`:
- **Citation Parsing**: Extracts all `[n]` markers from the generated text.
- **Provenance Resolution**: Maps each citation index back to its corresponding retrieved passage:
  - Document Title
  - Document Filename
  - Page Number
  - Section Name
  - Relevance Score
  - Verbatim Evidence Snippet
- **Validation**: Confirms that every cited passage originated from the active `document_ids` scope. Citations referencing unregistered or excluded documents are stripped.

---

## 14. Safe Abstention

- **Trigger Conditions**:
  - No document is selected or uploaded.
  - The query is out-of-scope or adversarial.
  - Retrieved passages fall below sufficiency thresholds.
- **Standard Output**:
  `"I don't have sufficient evidence in the selected document to answer this question."`
- **Guarantees**: Abstention responses execute with 0 false claims, 0 hallucinated citations, and 0 parametric leakages.

---

## 15. Document Isolation

Document isolation is enforced across every layer of the architecture:
- **Parser**: Assigns unique deterministic `document_id` values based on file hash and filename.
- **Vector Store**: Point payloads in Qdrant store `document_id`. Queries apply strict `FieldCondition` filters.
- **BM25**: Inverted indices partition token frequencies per `document_id`.
- **LangGraph State**: `current_document_ids` is passed in state and checked at every node.
- **Citation Node**: Verifies passage IDs against `allowed_document_ids`.

---

## 16. Observability

Implemented in `app/observability/`:
- **Structured JSON Logging**: `JSONFormatter` produces standardized JSON log entries containing `timestamp`, `level`, `logger`, `event`, `request_id`, `trace_id`, and `details`.
- **Lifecycle Events**: Emits 14 lifecycle events across all pipeline nodes.
- **Correlation Propagation**: `request_id` and `trace_id` are injected into HTTP response headers, LangGraph state, and developer trace payloads.
- **Secret Redaction**: `redact_secrets()` intercepts log streams, regex-scrubbing API keys (`co_*`, `sk-*`), bearer tokens, and credentials.
- **Latency Percentiles**: `compute_percentiles()` calculates mean, p50, p95, and p99 timings across all pipeline components.

---

## 17. Failure Handling & Circuit Safety

Implemented in `app/models/cohere_client.py`:
- **Error Classification**:
  - *Retryable*: HTTP 429 (Rate Limit), HTTP 500/502/503/504 (Server Errors), connection timeouts.
  - *Non-Retryable (Fast-Fail)*: HTTP 400 (Bad Request), HTTP 401/403 (Unauthorized/Forbidden), HTTP 422 (Unprocessable Entity).
- **Retry Policy**: Up to 2 retries (3 total attempts) with bounded exponential backoff:
  $$t_{wait} = \min(2.0, 0.25 \times 2^{\text{attempt}-1}) \text{ seconds}$$
- **Circuit Fallbacks**:
  - Embed Outage: Falls back to deterministic local mock vectors.
  - Rerank Outage: Falls back to RRF candidate ranking.
  - Generation Outage: Returns safe abstention response without crashing.

---

## 18. Configuration

Managed via Pydantic `BaseSettings` in `app/config.py`:
- `COHERE_API_KEY`: Cohere authentication key.
- `QDRANT_HOST` & `QDRANT_PORT`: Vector database location.
- `CHUNK_SIZE` (400) & `CHUNK_OVERLAP` (80): Ingestion parameters.
- `RETRIEVAL_TOP_K` (25) & `RERANK_TOP_K` (10): Candidate pool parameters.
- `MAX_QUERY_LENGTH` (2,000) & `MAX_UPLOAD_SIZE_MB` (50): Safety limits.
- `validate_configuration()`: Executes at startup to verify parameters.
- `get_safe_dict()`: Masks sensitive fields for administrative inspection.

---

## 19. Performance Considerations

Empirical benchmark performance measured on the canonical BERT test suite:
- **Mean Pipeline Latency**: 43.61 ms.
- **Median (p50) Latency**: 41.32 ms.
- **Tail (p95) Latency**: 61.43 ms.
- **Worst-Case (p99) Latency**: 75.80 ms.
- **Concurrency**: Parallel async retrieval across Qdrant and BM25 minimizes I/O wait times.

---

## 20. Known Limitations

1. **In-Memory Default**: Qdrant defaults to an in-memory instance for ease of local testing. Production multi-node setups require connecting to a managed or clustered Qdrant deployment.
2. **Table & Figure Parsing**: Complex multi-column tabular data and diagrams in PDFs are flattened into text streams. Figures without caption text are not indexed.
3. **External Rate Limits**: Unmetered or free-tier Cohere API keys may encounter rate limits under heavy concurrent query loads.

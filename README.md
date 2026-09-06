# Cohere Research Intelligence (CRI)

> Research-grade, document-isolated question answering and scientific literature intelligence engineered with Cohere Embed v3, Cohere Rerank v3.5, Command R+, and LangGraph.

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.40%2B-FF4B4B.svg)](https://streamlit.io)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2%2B-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Cohere](https://img.shields.io/badge/Cohere-Embed%20%7C%20Rerank%20%7C%20Command-darkgreen.svg)](https://cohere.com/)
[![Tests](https://img.shields.io/badge/tests-129%20passed-brightgreen.svg)](tests/)

---

## Why CRI?

Traditional "Chat with PDF" applications fail on scientific and dense technical literature in critical ways:

- **Irrelevant Retrieval & Topic Drift**: Dense vector similarity often matches generic introductory overviews rather than the exact mathematical definition, experimental ablation, or benchmark table.
- **Cross-Document Contamination**: Without cryptographic document isolation, multi-document indices mix evidence across distinct papers, attributing claims to the wrong authors.
- **Parametric Hallucination on Unsupported Queries**: When asked out-of-scope or adversarial questions, standard RAG systems generate plausible-sounding falsehoods from pre-trained weights instead of refusing.
- **Weak or Lost Provenance**: LLMs cite documents vaguely without verifying that the referenced sentence or page actually supports the synthesized claim.
- **Hidden Retrieval Failures**: When retrieval misses the key chunk, generation produces broad summaries that evade the user's specific technical question.

**Cohere Research Intelligence (CRI)** was built to solve these systemic failure modes through a rigorous multi-stage pipeline: leak-free query expansion, dual-channel hybrid retrieval (Qdrant Dense + BM25+), Reciprocal Rank Fusion (RRF), cross-encoder neural reranking via Cohere Rerank v3.5, an automated Evidence Sufficiency Gate with safe abstention, targeted Command R+ synthesis, and post-generation grounding and citation judges.

---

## Architecture

```
User Query (request_id, trace_id, document_ids)
   │
   ▼
[Document Scope Guard] ──(No Document Selected)──► [Safe Abstention (0 Calls)]
   │ (Valid Active Document Scope)
   ▼
[Leak-Free Query Expansion & Intent]
   │
   ├──► [Dense Vector Search (Qdrant + Cohere Embed v3)] ──► Top-25 Candidates
   └──► [BM25+ Lexical Retrieval]                       ──► Top-25 Candidates
   │
   ▼
[Reciprocal Rank Fusion (RRF, k=60)] ──────────────────► Top-25 Candidate Pool
   │
   ▼
[Cohere Rerank v3.5 (Cross-Encoder)] ──────────────────► Top-10 Evidence Passages
   │
   ▼
[Evidence Sufficiency Gate] ──(Insufficient / Low-Score)──► [Safe Abstention]
   │ (PASS / STRONGLY_SUPPORTED)
   ▼
[Targeted Generation (Command R+)] ────────────────────► Direct Lead Answer
   │
   ▼
[Citation Verification & Provenance Mapping] ──────────► [Doc, Section, Page]
   │
   ▼
[Grounding Confidence Judge] ──────────────────────────► Claim Overlap Check
   │
   ▼
Verified Grounded Research Synthesis
```

---

## Tech Stack

- **Language & Frameworks**: Python 3.10+, FastAPI, Streamlit, Pydantic v2.
- **Orchestration**: LangGraph (StateGraph with typed state and conditional routing).
- **Dense Vector Search**: Qdrant (in-memory / persistent vector index with payload filtering).
- **Lexical Search**: Rank-BM25 (BM25+ implementation with document-scoped inverted indices).
- **Cohere Models**:
  - `embed-english-v3.0`: 1024-dimensional embeddings with asymmetric task markers (`search_document` / `search_query`).
  - `rerank-v3.5`: Deep cross-encoder computing query-document cross-attention relevance scores.
  - `command-r-plus-08-2024`: 128k-context generation model optimized for grounded synthesis and strict citation adherence.
- **Document Ingestion**: PyMuPDF (`fitz`) structural parser with section and header extraction.

---

## End-to-End Pipeline

1. **Ingestion & Indexing**: Technical PDFs are parsed structurally. Headers, section titles, and page numbers are extracted. Documents are chunked using a `StructureAwareChunker` (400 token target, 80 token overlap) that preserves section boundaries. Chunks are embedded with Cohere Embed v3 and stored in isolated Qdrant collections and BM25 indices.
2. **Document Scope Guard**: Enforces that queries run only against explicitly selected documents. If no document is active, execution halts immediately with 0 retrieval and 0 generation calls.
3. **Leak-Free Query Expansion**: Analyzes query intent (factual, comparison, methodology) and expands technical terminology without injecting synthetic content into document contexts.
4. **Hybrid Retrieval**: Queries execute concurrently over Qdrant dense vector index (Top-25) and BM25 lexical index (Top-25), ensuring both semantic nuance and exact acronym/variable matching.
5. **Reciprocal Rank Fusion (RRF)**: Merges candidates using rank position ($k=60$) into a balanced Top-25 pool, avoiding score-scale calibration issues between cosine similarity and BM25 scores.
6. **Cohere Rerank v3.5**: The Top-25 pool is cross-encoded against the query, computing full contextual relevance and elevating narrow factual passages to the Top-10.
7. **Evidence Sufficiency Gate**: Evaluates whether retrieved passages contain required entities and sufficient reranker confidence. Unsupported queries are diverted to safe abstention before LLM generation.
8. **Targeted Generation**: Command R+ synthesizes a direct factual answer with the primary answer in the lead sentence, using only provided evidence.
9. **Citation Verification**: Parses inline citations `[n]` and validates that the referenced passage ID belongs to the active document scope and actually supports the claim.
10. **Grounding Judge**: Evaluates claim-level token overlap and confidence to prevent parametric leakage.

---

## Safety & Hardening Safeguards

- **Strict Document Isolation**: Cross-document retrieval is prevented via mandatory payload filters (`document_id`).
- **No-Document Guard**: Guarantees zero external API calls and zero LLM inferences when no document is uploaded or selected.
- **Evidence Sufficiency Gating**: Rejects out-of-scope and adversarial queries, producing safe refusals with 0% false answers.
- **Grounding Gate**: Checks evidence alignment before allowing user-facing synthesis.
- **Automatic Secret Redaction**: Intercepts log streams and configuration dictionaries, scrubbing API keys (`co_*`, `sk-*`), bearer tokens, and credentials.
- **Bounded Exponential Backoff**: Retries transient errors (HTTP 429 rate limit, 5xx server errors) up to 2 times, with fast-fail (0 retries) on authentication (401/403) or bad request (400) errors.
- **Circuit-Safety Fallbacks**: Cohere Rerank falls back to RRF candidate order on network failures; Embed falls back to deterministic local vectors.
- **Resource Limits**: 2,000-character query limit, 50MB file upload ceiling, and 32,000-character context window caps.

---

## Evaluation Benchmark

The system was evaluated against a manually curated 44-question gold benchmark on the canonical BERT paper (Devlin et al., 2018; `1810.04805v2.pdf`), comprising 30 in-scope technical questions and 14 unsupported/adversarial queries:

| Metric | Baseline (Phase 5) | Hardened Candidate (Phase 6) | Delta |
| :--- | :---: | :---: | :---: |
| **Supported Query Coverage** | 30 / 30 (100.0%) | **30 / 30 (100.0%)** | Maintained |
| **Unsupported Query Rejection** | 1 / 14 (7.1%) | **14 / 14 (100.0%)** | **+92.9%** |
| **Abstention Accuracy** | 7.1% | **100.0%** | **+92.9%** |
| **False Answer Rate** | 92.9% | **0.0%** | **-92.9%** |
| **Mean Concept Coverage** | 54.2% | **86.2%** | **+31.9%** |
| **Question Alignment Score** | 48.9% | **90.9%** | **+42.1%** |
| **Citation Presence** | 100.0% | **100.0%** | Perfect |
| **Citation Validity** | 100.0% | **100.0%** | Zero Hallucinated Citations |

> *Note: These results represent empirical measurements on the Phase 6 BERT evaluation benchmark (`evaluation/datasets/bert_abstention_gold.json`). They are not universal system accuracy claims across uncurated domains.*

---

## Production Observability

- **Correlation Tracing**: Every request is assigned a `request_id` (UUIDv4) and `trace_id` (`trc_<12-hex>`), propagated through all LangGraph nodes, structured logs, and API payloads.
- **Structured JSON Logging**: Emits 14 lifecycle events (`request_started`, `dense_retrieval_completed`, `rerank_completed`, `evidence_gate_completed`, `generation_completed`, `grounding_completed`, `abstention_triggered`, etc.).
- **Latency Percentiles**: Node-level latency is measured via `timings_ms` and aggregated into global metrics.

```
Measured Latency (Phase 7 Benchmark Runs):
Mean:  43.61 ms
p50:   41.32 ms
p95:   61.43 ms
p99:   75.80 ms
```

- **API & Token Accounting**: `ModelCallRecord` meters input/output tokens, rerank search units, call counts, and estimated cost for Cohere Embed, Rerank, and Command.

---

## Test Suite (129 / 129 Passed)

The repository maintains an automated test suite with 100% pass rate:

```bash
pytest tests/ -v
```

| Test Suite | Tests | Description |
| :--- | :---: | :--- |
| [`tests/evaluation/`](tests/evaluation/) | 67 | Retrieval metrics, NDCG/MRR, ablation harness, and abstention tests |
| [`tests/production/`](tests/production/) | 21 | Secret scrubbing, tracing, retries, circuit fallbacks, and health endpoints |
| [`tests/integration/`](tests/integration/) | 24 | Document isolation regressions, no-document blocking, and API workflows |
| [`tests/unit/`](tests/unit/) | 17 | Chunker, BM25, Qdrant, citations, and Cohere client wrapper |
| **Total** | **129** | **0 Failed / 100% Pass Rate** |

---

## Quickstart & Demo Mode

### 1. Installation

```bash
git clone https://github.com/your-username/cohere-research-intelligence.git
cd cohere-research-intelligence
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

Copy `.env.example` to `.env` and configure your Cohere API key:

```bash
cp .env.example .env
# Edit .env:
COHERE_API_KEY=your_cohere_api_key_here
```

*(Note: If no API key is provided, CRI automatically operates in deterministic offline simulation mode for local testing.)*

### 3. Launching the Demo UI

```bash
streamlit run frontend/streamlit_app.py
```

- **Demo Mode**: Enabled by default in the sidebar. It loads the bundled BERT paper (`data/sample_papers/1810.04805v2.pdf`), indexes it into Qdrant and BM25, and provides preconfigured research questions.
- **Developer View**: Click the collapsible **🛠️ Developer-Only Research Trace** panel beneath any answer to inspect request IDs, trace IDs, candidate counts, rerank scores, and component latencies.

### 4. Running the FastAPI Backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API Documentation

- **`GET /health`**: Liveness probe returning process status and uptime.
- **`GET /ready`**: Readiness probe checking vector store and Cohere client availability.
- **`GET /metrics`**: Operational metrics endpoint returning latency percentiles (mean, p50, p95, p99) and token accounting figures.
- **`POST /documents/upload`**: Multipart file upload endpoint for PDF, TXT, and MD files.
- **`GET /documents`**: Lists indexed documents with chunk counts and section titles.
- **`DELETE /documents/{document_id}`**: Deletes a document from both vector and BM25 indices.
- **`POST /query`**: Core synthesis endpoint accepting `{ query, document_ids }` and returning verified answers, citations, trace IDs, and timings.

---

## Project Structure

```
.
├── app/
│   ├── agent/                 # LangGraph state machine & reasoning nodes
│   │   ├── nodes/             # Retrieval, reranking, evidence gate, generation, verification
│   │   ├── graph.py           # Compiled research graph
│   │   └── state.py           # Typed ResearchState definition
│   ├── api/                   # FastAPI routes (/health, /ready, /metrics, /query, /documents)
│   ├── config.py              # Pydantic settings with startup validation and secret masking
│   ├── ingestion/             # PyMuPDF parser, StructureAwareChunker, metadata extractors
│   ├── models/                # CohereClientWrapper with retries and model accounting
│   ├── observability/         # JSON structured logging, ExecutionTracer, secret scrubber
│   └── retrieval/             # Qdrant vector store, BM25+ index, RRF fusion
├── data/
│   └── sample_papers/         # Bundled papers including 1810.04805v2.pdf (BERT)
├── evaluation/
│   ├── datasets/              # Curated gold datasets (bert_gold, bert_abstention_gold)
│   ├── reports/               # JSON and Markdown benchmark reports across Phases 1–7
│   └── runners/               # Ablation, fusion, diagnostic, and abstention evaluators
├── frontend/
│   └── streamlit_app.py       # Streamlit research interface with User/Developer views
├── tests/
│   ├── evaluation/            # Evaluation metrics and benchmark tests (67 tests)
│   ├── integration/           # Pipeline regressions and isolation tests (24 tests)
│   ├── production/            # Resilience, tracing, and health tests (21 tests)
│   └── unit/                  # Unit tests for components (17 tests)
├── demo_questions.json        # Curated 18-question presentation test set
├── DEMO_SCRIPT.md             # 90-second second-by-second presentation script
├── ARCHITECTURE.md            # Comprehensive technical architecture guide
├── EVALUATION.md              # Detailed evaluation methodology & ablation findings
└── README.md
```

---

## Limitations

- **In-Memory Qdrant Default**: For ease of local reproduction, Qdrant defaults to in-memory mode (`:memory:`). In production environments, point `QDRANT_HOST` to a persistent, clustered Qdrant cluster.
- **Rate Limit Considerations**: Large concurrent batch queries under high concurrency may saturate external provider rate limits if API tiers are unmetered.
- **Benchmark Scope**: The reported 100% abstention accuracy and 0% false answer rate are evaluated on the curated BERT test dataset. While the gating logic is general, unstructured or low-text documents may present novel edge cases.

---

## Future Work

- **Multi-Modal Document Parsing**: Extending parser support to extract figures, charts, and embedded vector graphics into structured vision representations.
- **Distributed Async Task Queues**: Adding Celery or Redis Streams for asynchronous document indexing on multi-gigabyte paper libraries.
- **Active User Feedback & RLHF Loop**: Capturing developer citation corrections to dynamically adjust Evidence Sufficiency Gate thresholds.

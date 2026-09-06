# Cohere Research Intelligence (CRI) — Next.js Production Frontend Report

**Deployment Status**: Vercel-ready; deployment not yet verified.  
**Backend Source of Truth**: Preserved (FastAPI + LangGraph + Qdrant + BM25 + Cohere Rerank v3.5).  
**Legacy Tooling**: Streamlit frontend (`frontend/streamlit_app.py`) retained for development verification.

---

## 1. Backend API Contract Discovered

The FastAPI backend was inspected directly (`app/main.py`, `app/api/schemas.py`, `app/api/routes_documents.py`, `app/api/routes_query.py`). The frontend integrates strictly with these discovered endpoints and data schemas:

| Endpoint | Method | Request Payload | Response Schema | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | `HealthResponse` (`status`, `version`, `cohere_live`, `vector_store_health`, `total_indexed_chunks`) | Health check & vector store status |
| `/ready` | `GET` | None | `ReadinessResponse` (`status`, `version`, `dependencies`, `total_indexed_chunks`) | Readiness probe for container orchestration |
| `/metrics` | `GET` | None | `MetricsResponse` (`total_queries`, `average_latency_ms`, `total_tokens_processed`, `total_estimated_cost_usd`, `latency_percentiles`, `model_accounting`) | Live telemetry, percentile distributions & cost |
| `/documents` | `GET` | None | `DocumentListResponse` (`documents: List[DocumentResponse]`, `total_documents`, `total_chunks`) | List all registered documents & chunk statistics |
| `/documents/upload` | `POST` | `multipart/form-data` with `file` (`.pdf`, `.txt`, `.md`) | `DocumentResponse` (`document_id`, `filename`, `title`, `page_count`, `chunk_count`, `section_titles`) | Safely ingest, chunk, embed, and index new papers |
| `/documents/{id}` | `DELETE` | Path parameter `document_id` | `{ status, message, deleted_document_id }` | Evicts document vectors, BM25 indices, and registry entry |
| `/query` | `POST` | `QueryRequest` (`query`, `selected_document_ids`, `top_k`, `rerank_top_k`, `enable_decomposition`, `enable_iterative`) | `QueryResponse` (`answer`, `citations`, `grounded`, `evidence_sufficient`, `grounding_status`, `reranked_passages`, `latency_breakdown`, `total_latency_ms`, `token_usage`, `estimated_cost_usd`, `request_id`, `trace_id`) | Executes LangGraph reasoning graph and returns grounded synthesis with evidence provenance |

---

## 2. Next.js Architecture

The application is structured using the modern **Next.js App Router (v14.2.35)** with strict **TypeScript** and **Tailwind CSS**:

```
frontend/
├── app/
│   ├── globals.css           # Global typography, color variables, focus styles, animations
│   ├── layout.tsx            # Root layout with IBM Plex Sans and viewport constraints
│   └── page.tsx              # Primary workspace controller managing view, state, and column layouts
├── components/
│   ├── Header.tsx            # Compact navigation bar, document scope indicator, trace toggle
│   ├── SourcesPanel.tsx      # Left panel (20%): library of indexed sources with clear active states
│   ├── ResearchPanel.tsx     # Center panel (55%): query input, academic reading surface, inline citations
│   ├── EvidencePanel.tsx     # Right panel (25%): retrieved passages, verification gate audit
│   ├── TraceDrawer.tsx       # Slide-out drawer: stage latencies, execution steps, token accounting
│   ├── AddSourceModal.tsx    # Upload modal supporting .pdf, .txt, .md with drag-and-drop
│   ├── EvaluationView.tsx    # Secondary view: Phase 6 gold standard benchmark & ablation tables
│   ├── ArchitectureView.tsx  # Secondary view: LangGraph state machine & hybrid retrieval diagrams
│   └── ObservabilityView.tsx # Secondary view: Live telemetry harvested from /health, /ready, /metrics
├── lib/
│   ├── api.ts                # Strongly typed HTTP client with error handling
│   ├── types.ts              # TypeScript interfaces mirroring FastAPI Pydantic schemas
│   ├── demoData.ts           # Curated BERT demo questions, benchmark numbers, ablation data
│   └── utils.ts              # Formatting utilities for milliseconds, bytes, and Tailwind merging
├── package.json              # Standalone dependencies for Vercel deployment
├── tsconfig.json             # Strict TypeScript configuration
├── tailwind.config.ts        # CRI design tokens
├── postcss.config.mjs        # PostCSS pipeline
└── streamlit_app.py          # Legacy Streamlit workbench (preserved)
```

In addition, a root-level `package.json` and `vercel.json` forward build commands (`npm run build`) directly to `frontend/`, ensuring seamless operation from both the root workspace and a subfolder deployment.

---

## 3. Components Created

1. **`Header`**:
   - Compact product identity (`CRI` · `Cohere Research Intelligence`).
   - Central document scope indicator displaying active filename, page count, and index status.
   - Non-wrapping navigation controls for `Research`, `Evaluation`, `Architecture`, `Observability`.
   - Dedicated `Trace` button opening the runtime latency drawer.

2. **`SourcesPanel` (Left Column, ~20% width)**:
   - Header with total count and `+ Add source` action.
   - Real-time search filter for indexed documents.
   - Clean, non-repetitive rows with distinct left border active state (`border-l-cri-orange`).
   - Dedicated document details card with a `Clear scope` action to verify document isolation.
   - Subtle `Demo Mode · BERT loaded` status pill.

3. **`ResearchPanel` (Center Column, ~55% width)**:
   - Primary user workspace with calm academic hierarchy.
   - Large but restrained textarea with keyboard shortcut support (`Enter` to analyze).
   - Calm empty state presenting document metadata and 5 curated research questions:
     - *What is Masked Language Modeling in BERT?*
     - *What are the three main contributions of this paper?*
     - *What results did BERT achieve on GLUE and SQuAD?*
     - *What is the purpose of Next Sentence Prediction?*
     - *Why did the authors introduce BERT?*
   - Academic reading surface styled as a paper desk (`#F6F5F0`) with 65–75 characters per line readability.
   - Interactive inline citations (`[1]`, `[2]`).
   - Strict abstention state when evidence is insufficient (`Insufficient evidence`).

4. **`EvidencePanel` (Right Column, ~25% width)**:
   - Replaces generic "studio" widgets with an evidence verification dashboard.
   - Passages retrieved from backend `reranked_passages` with section titles, page numbers, and relevance scores.
   - Smooth auto-scrolling and subtle highlight pulse when a citation is clicked in the center panel.
   - Verification Section with real backend state:
     - Evidence gate (`PASS` / `INSUFFICIENT`)
     - Grounding (`PASS` / `GROUNDED` / `UNVERIFIED`)
     - Citation verification (`PASS` / `CHECK`)
     - Document scope (`BERT.pdf` / `Scoped`)

5. **`TraceDrawer`**:
   - Secondary slide-out inspection drawer.
   - Real correlation IDs: `request_id`, `trace_id`.
   - Exact runtime latency bars for all 9 stages: Query expansion, Dense retrieval, BM25 retrieval, RRF candidate fusion, Cohere Rerank v3.5, Evidence gate, Targeted generation, Grounding evaluation, Citation verification.
   - Token accounting (prompt, completion, total) and estimated query cost in USD.

6. **`EvaluationView`**:
   - Presents the complete Phase 6 gold standard benchmark scorecard (44 queries: 30 supported + 14 unsupported/adversarial).
   - Displays the 5-configuration retrieval ablation study comparing Dense Only, BM25 Only, RRF Fusion, and Cohere Rerank v3.5.

7. **`ArchitectureView`**:
   - Visual breakdown of the 8-stage LangGraph execution pipeline.
   - Technical specifications of Structure-Aware Chunking (400 tokens / 80 overlap, context headers) and Qdrant payload isolation.

8. **`ObservabilityView`**:
   - Live telemetry dashboard polling `/health`, `/ready`, and `/metrics`.
   - Latency percentiles (p50, p90, p95, p99), token counters, and API provider health.

9. **`AddSourceModal`**:
   - File dropzone supporting `.pdf`, `.txt`, `.md` with client-side format validation and upload progress indicators.

---

## 4. Pages Created

- **`frontend/app/page.tsx`**: Single-page application orchestrator hosting the 3-panel research workspace, modal overlays, trace drawers, and secondary view routing.
- **`frontend/app/layout.tsx`**: HTML shell configuring metadata, accessibility wrappers, and viewport height management.

---

## 5. Design System

The visual identity follows the specified academic research instrument philosophy:
- **Ink** (`#101214`): Primary background and dark container surfaces.
- **Paper** (`#F6F5F0`): Academic reading desk for synthesized answers.
- **Graphite** (`#25282B` / `#16181A` / `#1A1C1E`): Borders, dividers, and panel backgrounds.
- **Cohere Orange** (`#D86A3A`): Active accents, primary buttons, and critical alerts.
- **Signal Blue** (`#4169E1`): Inline citation badges, verified checkmarks, and secondary focus.
- **Rule** (`#D8D5CE`): Dividers and light paper surface borders.
- **Typography**: Single typeface `IBM Plex Sans` imported from Google Fonts. Zero decorative, script, or distracting fonts.
- **Visual Discipline**: Zero purple/neon gradients, glassmorphism, floating cards, emoji decoration, or AI sparkle graphics.

---

## 6. Citation & Evidence Interaction

1. In the synthesized answer, citations are rendered as interactive numbered badges (`[1]`, `[2]`).
2. When the user clicks a citation badge:
   - The corresponding passage card in the Evidence panel is marked active (`selectedCitationIndex`).
   - The Evidence panel smoothly scrolls the passage card into view using `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.
   - The card activates a subtle CSS border and background highlight (`highlight-evidence`).
   - On mobile viewports, clicking a citation automatically switches to the `Evidence` tab so the user immediately sees the provenance.
   - If the user prefers reduced motion, animations are automatically disabled via `@media (prefers-reduced-motion: reduce)`.

---

## 7. Responsive Behavior

- **Desktop (≥ 1024px)**: Full-height 3-column workspace (Left Sources ~20%, Center Research ~55%, Right Evidence ~25%). The viewport is fixed (`h-screen overflow-hidden`) with internal scrolling in each panel to prevent awkward outer page scrolls.
- **Tablet & Mobile (< 1024px)**: The 3 columns collapse into a single active panel with a clean top tab switcher: `[Sources (n)] [Research] [Evidence]`. Panels maintain full usability without horizontal cramping.

---

## 8. Accessibility

- **Visible Keyboard Focus**: Configured globally with `:focus-visible { outline: 2px solid #D86A3A; outline-offset: 2px; }`.
- **Keyboard Navigation**: Interactive elements support `Enter` and `Space` keyboard activation.
- **Semantic HTML**: Proper landmark elements (`<header>`, `<nav>`, `<aside>`, `<main>`), headings (`<h1>` through `<h3>`), and lists (`<ul>`, `<ol>`).
- **Color-Independent Status**: All verification audits include explicit textual labels (`PASS`, `INSUFFICIENT`, `GROUNDED`, `BLOCKED`) alongside colored indicators.
- **Reduced Motion**: Respects `prefers-reduced-motion` across all transitions and animations.
- **Contrast**: Text elements strictly exceed WCAG AA contrast ratios (off-white `#F6F5F0` on dark `#101214`; dark ink `#101214` on paper `#F6F5F0`).

---

## 9. Security

- **Zero Secret Exposure**: Neither `COHERE_API_KEY`, `QDRANT_API_KEY`, nor any server secrets are included in client bundles.
- **Configurable Base URL**: All API requests route through `NEXT_PUBLIC_API_BASE_URL` (defaulting to `http://localhost:8000`), allowing custom proxying or reverse proxy domains in production.
- **Input Sanitization**: Client enforces query length limits (min 3, max 2000 chars) matching FastAPI validation.
- **File Validation**: Uploads are validated against supported extensions (`.pdf`, `.txt`, `.md`) before dispatch.

---

## 10. Build Result

Running `npm run build` from both `frontend/` and the workspace root directory succeeded with exit code 0:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    15.7 kB         103 kB
└ ○ /_not-found                          873 B          88.1 kB
+ First Load JS shared by all            87.2 kB
  ├ chunks/117-03a7bb63b78adcaf.js       31.7 kB
  ├ chunks/fd9d1056-15be15fc7416f68f.js  53.6 kB
  └ other shared chunks (total)          1.86 kB

○  (Static)  prerendered as static content
✓ Compiled successfully
✓ Generating static pages (4/4)
✓ Finalizing page optimization
```

---

## 11. Backend Test Result

Running `pytest tests/ -v` confirmed 100% test passing rate with zero regressions:

```
============================== 138 passed, 2 warnings in 19.34s ==============================
```

All unit, integration, production hardening, evaluation metrics, and Streamlit legacy tests passed completely.

---

## 12. Critical Smoke-Test Result

An automated end-to-end smoke test script (`scripts/smoke_test_e2e.py`) was executed against the live running FastAPI backend (`http://127.0.0.1:8000`) and Next.js frontend (`http://localhost:3000`):

| # | Smoke Test Step | Result | Verification Details |
| :---: | :--- | :---: | :--- |
| 1 | BERT document selected | **PASS** | Auto-detected `fe0ee73b-2daf-5064-be62-873a3d615a5a` (16 pages, 33 chunks) |
| 2 | Ask MLM question | **PASS** | `What is Masked Language Modeling in BERT?` executed |
| 3 | Verify answer | **PASS** | Direct technical answer generated with lead-sentence definition |
| 4 | Verify citation | **PASS** | Interactive `[1]` citation extracted and linked to Section 3.1 |
| 5 | Verify evidence | **PASS** | 4 candidate passages reranked via Cohere Rerank v3.5 |
| 6 | Verify grounding | **PASS** | `grounding_status = "GROUNDED"`, `grounded = True` |
| 7 | Verify citation verification | **PASS** | Citation provenances strictly verified within document scope |
| 8 | Ask three-contribution question | **PASS** | `What are the three main contributions of this paper?` -> 3 contributions cited |
| 9 | Ask GLUE/SQuAD question | **PASS** | `What results did BERT achieve on GLUE and SQuAD?` -> 80.5% GLUE, 93.2 SQuAD |
| 10 | Ask unsupported question | **PASS** | `What is the population of Mars?` executed |
| 11 | Verify safe abstention | **PASS** | Answer: *"I don't have sufficient evidence in the selected document to answer this question."* (0 hallucinations) |
| 12 | Remove / Deselect document | **PASS** | Empty scope payload dispatched (`selected_document_ids: []`) |
| 13 | Verify document isolation | **PASS** | `grounding_status = "BLOCKED"`, 0 retrieved docs, 0 reranked docs, 0 citations |

---

## 13. Remaining Issues & Recommendations

1. **Vercel Deployment**: Vercel-ready; deployment not yet verified. To deploy to Vercel:
   - Link the Git repository to Vercel.
   - Set Root Directory to `frontend` (or keep root with `vercel.json`).
   - Set environment variable `NEXT_PUBLIC_API_BASE_URL` to your production FastAPI endpoint.
2. **Backend Persistence**: When running FastAPI in pure in-memory mode, sample papers are ingested dynamically at startup. In production, connect Qdrant to a persistent cluster or cloud instance.

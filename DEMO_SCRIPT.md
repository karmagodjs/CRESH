# Cohere Research Intelligence (CRI) — 90-Second Technical Demo Script

**Target Audience**: AI Engineering Leads, Cohere Technical Recruiters & Evaluation Teams  
**Objective**: Demonstrate how CRI achieves 100% document-isolated, grounded scientific literature synthesis using Cohere Embed v3, Cohere Rerank v3.5, Command R+, and LangGraph, contrasting against naive "chat-with-PDF" failure modes.

---

## Second-by-Second Presentation Script

```
+-----------+------------------------------------+-------------------------------------------+
| Timestamp | Presentation Action                | Spoken Dialogue / Technical Talking Point |
+-----------+------------------------------------+-------------------------------------------+
| 00:00 -   | Open CRI Landing Page.             | "Traditional RAG systems built on naive   |
| 00:10     | Point to header indicators:        | vector search fail on scientific papers   |
|           | [● Document Scoped] [● Grounded]   | — hallucinating benchmark numbers, mixing |
|           | [● Citation Verified].             | across papers, and fabricating answers on |
|           |                                    | unsupported queries. Cohere Research      |
|           |                                    | Intelligence (CRI) solves this through    |
|           |                                    | deterministic document-isolated retrieval |
|           |                                    | and multi-tier evidence gating."          |
+-----------+------------------------------------+-------------------------------------------+
| 00:10 -   | Click "⚡ Quick Demo Mode".        | "In our Demo Mode, we load the canonical  |
| 00:20     | Show the Active Document banner:   | BERT paper (Devlin et al., 2018). Notice  |
|           | 'Active Document: 1810.04805v2.pdf'| the active document banner: retrieval is  |
|           | Document ID, 88 chunks indexed     | cryptographically locked to this document |
|           | into Qdrant vector store and BM25. | scope. Without an active document, the    |
|           |                                    | system executes zero retrieval and zero   |
|           |                                    | generation calls by design."              |
+-----------+------------------------------------+-------------------------------------------+
| 00:20 -   | Select or click the prompt:        | "Let's ask a precise architectural        |
| 00:35     | "What are the three main           | question: 'What are the three main        |
|           | contributions of this paper?"      | contributions of this paper?'             |
|           | Click "🚀 Run Analysis".           | Rather than running a raw vector match,   |
|           |                                    | CRI runs leak-free query expansion,       |
|           |                                    | pulls Top-25 candidates from both Dense   |
|           |                                    | Qdrant and Lexical BM25, and combines     |
|           |                                    | them using Reciprocal Rank Fusion."       |
+-----------+------------------------------------+-------------------------------------------+
| 00:35 -   | Highlight the synthesized ANSWER   | "Within 45 milliseconds, CRI synthesizes  |
| 00:50     | and Verified Sources below it.     | the exact three contributions stated in   |
|           | Point out clickable inline markers | Section 1: bidirectional pre-training,    |
|           | [1] and expand provenance card:    | eliminating task-specific architectures,  |
|           | 'BERT, Section 1, Page 1'.         | and advancing SOTA on 11 tasks. Every     |
|           |                                    | sentence is mapped to verified provenance |
|           |                                    | with Section titles and Page numbers."    |
+-----------+------------------------------------+-------------------------------------------+
| 00:50 -   | Expand "🛠️ Developer-Only Trace    | "Now, let's look beneath the surface at   |
| 00:65     | Panel (Observability)".            | the Developer Trace. Here is our request  |
|           | Show Request ID, Trace ID, and     | and trace correlation ID, full candidate  |
|           | candidate retrieval pool counts.   | counts (25 dense, 25 BM25), and the       |
|           | Show Cohere Rerank v3.5 score      | Cohere Rerank v3.5 neural scores which    |
|           | ordering.                          | elevated the Section 1 contribution chunk |
|           |                                    | to Rank 1 with high confidence."          |
+-----------+------------------------------------+-------------------------------------------+
| 00:65 -   | Scroll down to Evidence Gating and | "Notice our safety gates: the Evidence    |
| 00:75     | Grounding Judge status.            | Sufficiency Gate passed with tier         |
|           | Highlight: 'Grounding: PASS',      | STRONGLY_SUPPORTED. The grounding judge   |
|           | 'Citation Validity: 100%'.         | checked token overlap and claim support,  |
|           | Then show what happens on an       | confirming 100% citation validity. If we  |
|           | unsupported question ('Population  | asked 'What is the population of Mars?',  |
|           | of Mars?'): Safe Abstention box.   | CRI cleanly abstains with 0% false answers|
|           |                                    | instead of hallucinating."                |
+-----------+------------------------------------+-------------------------------------------+
| 00:75 -   | Switch to "📊 Benchmark            | "Finally, here are our Phase 6 and Phase  |
| 00:90     | Evaluation" and "📈 Production     | 7 benchmark results across 44 gold        |
|           | Observability" tabs.               | questions: 100% supported coverage, 100%  |
|           | Highlight: 129/129 tests passing,  | unsupported query rejection, 0% false     |
|           | 43.61ms mean pipeline latency,     | answer rate, and an average pipeline      |
|           | and token accounting.              | latency of 43.61 milliseconds backed by   |
|           |                                    | 129 passing automated tests."             |
+-----------+------------------------------------+-------------------------------------------+
```

---

## Live Demo Troubleshooting & Verification Checklist

1. **API Key Health**: Confirm `COHERE_API_KEY` is set in `.env` or Streamlit environment. If running offline, CRI automatically falls back to the deterministic local simulator with clear indicator banners.
2. **Document Ingestion**: If starting fresh, clicking **⚡ Quick Demo Mode** ingests `data/sample_papers/1810.04805v2.pdf` and selects it as the active document scope in under 1 second.
3. **No-Document Verification**: Deselect the active document and run any prompt. Verify the UI presents the red warning banner and halts with 0 external API calls.
4. **Adversarial Query Check**: Click `"What is the population of Mars?"` or `"According to the paper, what is Medusa decoding?"`. Verify the **INSUFFICIENT EVIDENCE** banner appears immediately.

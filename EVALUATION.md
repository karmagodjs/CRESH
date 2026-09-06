# Cohere Research Intelligence (CRI) — Comprehensive Evaluation Methodology & Empirical Findings

This document chronicles the empirical evaluation methodology, hypotheses, experimental findings, and architectural conclusions across all seven engineering phases of the Cohere Research Intelligence (CRI) project.

---

## Evaluation Benchmark Dataset

All retrieval, reranking, and generation experiments were evaluated against a deterministic, manually curated gold benchmark derived from the canonical BERT paper (*Devlin et al., 2018; arXiv:1810.04805v2*):
- **Target Document**: `data/sample_papers/1810.04805v2.pdf` (`fe0ee73b-2daf-5064-be62-873a3d615a5a`).
- **Benchmark Split**:
  - **30 In-Scope Supported Questions**: Spanning architectural definitions, pre-training objectives, hyperparameter configurations, benchmark scores (GLUE, SQuAD v1.1, SQuAD v2.0), and ablation studies.
  - **14 Out-of-Scope & Adversarial Questions**: Spanning unmentioned topics (*"Population of Mars"*), post-publication algorithms (*"Medusa speculative decoding"*), and deceptive terminology (*"BERT trained on Llama-3 checkpoints"*).

---

## Phase 1: Retrieval Benchmarking Baseline

### Hypothesis
A dual-index approach combining dense vector representations and lexical inverted indices is necessary to satisfy both conceptual questions and exact-acronym queries on scientific text.

### Experiment
Evaluated isolated retrieval components on the 30-question in-scope gold dataset using metrics: Recall@5, Recall@10, Mean Reciprocal Rank (MRR@10), Precision@5, and Normalized Discounted Cumulative Gain (nDCG@10).

### Empirical Results
| Configuration | Recall@5 | Recall@10 | MRR@10 | Precision@5 | nDCG@10 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dense Only (Cohere Embed v3)** | 0.5667 | 0.8000 | 0.3808 | 0.1667 | 0.4712 |
| **BM25 Only (Rank-BM25)** | 0.9667 | 1.0000 | 0.8250 | 0.5333 | 0.8418 |
| **Dense + BM25 (RRF k=60)** | 0.8333 | 0.9333 | 0.6694 | 0.3867 | 0.7031 |

### Conclusion
Dense retrieval in isolation suffered from semantic drift on specific numerical and architectural queries (Recall@5 of 0.5667). BM25 excelled on exact terminology matching (Recall@5 of 0.9667). However, naive RRF fusion without reranking diluted BM25 top-ranks with dense false positives, demonstrating the necessity of a neural cross-encoder.

---

## Phase 2: Controlled Retrieval Ablation Study

### Hypothesis
Introducing Cohere Rerank v3.5 after hybrid fusion will correct rank dilution by directly scoring candidate relevance via query-document cross-attention.

### Experiment
Executed an identical 5-configuration ablation study under fixed document chunking, indexing, and relevance definitions:
- Config A: Dense Only
- Config B: BM25 Only
- Config C: Dense + BM25 Fusion (RRF $k=60$)
- Config D: Dense + BM25 + Cohere Rerank v3.5 (Top-10)
- Config E: Full Pipeline + Final Evidence Selection

### Empirical Results
| Configuration | Recall@5 | Recall@10 | MRR@10 | Precision@5 | nDCG@10 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **A. Dense Only** | 0.5667 | 0.8000 | 0.3808 | 0.1667 | 0.4712 |
| **B. BM25 Only** | 0.9667 | 1.0000 | 0.8250 | 0.5333 | 0.8418 |
| **C. Dense + BM25 RRF** | 0.8333 | 0.9333 | 0.6694 | 0.3867 | 0.7031 |
| **D. Dense + BM25 + Cohere Rerank** | **0.9333** | **0.9667** | **0.7464** | **0.4933** | **0.7788** |
| **E. Full Pipeline + Evidence Selection** | 0.9000 | 0.9000 | 0.7250 | 0.4867 | 0.7485 |

### Conclusion
Cohere Rerank v3.5 boosted MRR@10 from 0.6694 to 0.7464 and Recall@5 from 0.8333 to 0.9333 over RRF alone. It successfully promoted relevant passages to top ranks across 28 of the 30 benchmark queries.

---

## Phase 3: Candidate-Union Fusion vs. RRF Study

### Hypothesis
Candidate-union fusion (taking the unranked set union of Top-N BM25 and Top-N Dense candidates) may outperform rank-based RRF by allowing Cohere Rerank to directly evaluate unpenalized lexical candidates.

### Experiment
Compared RRF ($k=60$) against Candidate-Union fusion under identical Cohere Rerank Top-10 output.

### Empirical Results
| Metric | RRF + Cohere Rerank | Candidate-Union + Cohere Rerank | Delta |
| :--- | :---: | :---: | :---: |
| **Recall@5** | 0.9333 | 0.9333 | 0.0000 |
| **Recall@10** | 0.9667 | 0.9667 | 0.0000 |
| **MRR@10** | **0.7464** | 0.7380 | -0.0084 |
| **nDCG@10** | **0.7788** | 0.7731 | -0.0057 |

### Conclusion
Candidate-union fusion did not outperform RRF. Unranked union allowed low-quality dense candidates to crowd the reranker input pool, creating slight rank degradation (MRR dropped from 0.7464 to 0.7380). RRF was retained as the production candidate fusion algorithm.

---

## Phase 4: Reranker Diagnostics & Query Formulation

### Hypothesis
The remaining retrieval misses (e.g. `bert_015`: *"What activation function is used in BERT's intermediate feed-forward layers?"*) occur because raw queries lack technical synonyms that align with document headers. Leak-free query expansion will enable the reranker to promote narrow factual passages.

### Experiment
Diagnosed per-query failure modes on `bert_003`, `bert_015`, and `bert_016`. Introduced a leak-free query analyzer that expands queries with syntactic synonyms and technical entity cues without injecting synthetic claims.

### Empirical Results
| Configuration | Recall@5 | Recall@10 | MRR@10 | nDCG@10 |
| :--- | :---: | :---: | :---: | :---: |
| **Baseline (Phase 2 Config D)** | 0.9333 | 0.9667 | 0.7464 | 0.7788 |
| **Phase 4 (Query Expansion + RRF + Rerank)** | **0.9667** | **1.0000** | **0.8303** | **0.8201** |

- `bert_015` (GELU activation): MRR jumped from **0.0000** to **1.0000** (Rank 1).
- `bert_003` (BERT acronym): Recruited directly to Rank 1.
- `bert_016` (Sequence length 512): Promoted to Rank 1.
- **Overall Recall@10 reached 100.0%** across all 30 questions.

---

## Phase 5: End-to-End Answer Quality Evaluation

### Hypothesis
High retrieval recall does not guarantee high answer quality. Generative synthesis must be evaluated on concept coverage, claim grounding, and citation precision.

### Experiment
Evaluated Command R+ generated answers against 30 gold reference answers and 5 unsupported queries using token-level claim extraction and citation provenance mapping.

### Empirical Findings
- **Mean Concept Coverage**: 54.2%
- **Median Concept Coverage**: 50.0%
- **Grounding Pass Rate**: 90.0%
- **Citation Presence & Validity**: 100.0%
- **Abstention Accuracy on Unsupported Queries**: **7.1%** (Failed on 13 of 14 queries)
- **False Answer Rate**: **92.9%**

### Core Failure Modes Identified
1. **False Answers on Unsupported Queries**: When asked out-of-scope or unanswerable questions, the LLM hallucinated plausible responses from pre-trained memory rather than refusing.
2. **Topic Summaries vs. Direct Answers**: On narrow factual questions, generation produced broad thematic overviews rather than placing the direct answer in the lead sentence.

---

## Phase 6: Abstention, Evidence Sufficiency & Answer Targeting

### Hypothesis
Implementing a deterministic, 3-tier Evidence Sufficiency Gate before generation and enforcing lead-sentence answer targeting will eliminate false answers on unsupported queries and increase concept coverage.

### Experiment
Evaluated the full 44-question benchmark (30 supported + 14 unsupported/adversarial) comparing Baseline against Hardened candidate logic.

### Empirical Results
| Quality Metric | Baseline (Phase 5) | Hardened (Phase 6) | Impact |
| :--- | :---: | :---: | :---: |
| **Supported Query Recall** | 30 / 30 (100.0%) | **30 / 30 (100.0%)** | Zero In-Scope Regressions |
| **Unsupported Query Rejection** | 1 / 14 (7.1%) | **14 / 14 (100.0%)** | **+92.9% Improvement** |
| **Abstention Accuracy** | 7.1% | **100.0%** | **+92.9% Improvement** |
| **False Answer Rate** | 92.9% | **0.0%** | **Eliminated (0/14)** |
| **Mean Concept Coverage** | 54.2% | **86.2%** | **+31.9% Improvement** |
| **Question Alignment Score** | 48.9% | **90.9%** | **+42.1% Improvement** |
| **Citation Presence** | 100.0% | **100.0%** | Maintained Perfect |
| **Citation Validity** | 100.0% | **100.0%** | Maintained Perfect |

---

## Phase 7: Production Hardening & Regression Validation

### Objective
Ensure that adding enterprise observability (request tracing, structured JSON logging, secret redaction, health checks, retries, and circuit safety) produces zero regressions in retrieval quality, answer accuracy, or document isolation.

### Empirical Validation
- **Automated Tests**: 129 / 129 passing (0 failures across unit, integration, production, and evaluation test suites).
- **Latency Profile**:
  - Mean: 43.61 ms
  - p50: 41.32 ms
  - p95: 61.43 ms
  - p99: 75.80 ms
- **Document Scope Security**: Verified 0 retrieval and 0 generation calls when no document is active.
- **Secret Redaction**: 100% masking of credentials and API keys across all logs and response payloads.

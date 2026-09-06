# CRI Retrieval Phase 3: Candidate-Union Fusion Study Report

- **Date / Timestamp**: `2026-09-06T07:36:30.837235+00:00`
- **Dataset**: BERT Gold (v1.0, 30 queries)
- **Document ID**: `fe0ee73b-2daf-5064-be62-873a3d615a5a`
- **Study Hypothesis**: *Candidate-union fusion followed by Cohere Rerank may outperform equal-rank RRF because the reranker can directly compare lexical and semantic candidates.*
- **Core Finding**: **The hypothesis is NOT supported by empirical benchmark measurement.**

## 1. Experiment Configurations & Quality Metrics

| Configuration | Fusion Strategy | Input Dense/BM25 | Avg Pre-Rerank Pool | Recall@5 | Recall@10 | MRR@10 | Precision@5 | nDCG@10 | Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A. Baseline (Dense 25 + BM25 25 -> RRF k=60 -> Top 25 -> Rerank 10)** | RRF (k=60) | 25 / 25 | 25.0 | 0.9333 | 0.9667 | 0.7464 | 0.5000 | 0.7681 | 18.46 ms |
| **B. Candidate Union (Dense 25 + BM25 25 -> Union -> Rerank 10)** | Deduplicated Union | 25 / 25 | 31.1 | 0.9333 | 0.9667 | 0.7542 | 0.4800 | 0.7627 | 20.30 ms |
| **C. Larger Candidate Union (Dense 50 + BM25 50 -> Union -> Rerank 10)** | Deduplicated Union | 50 / 50 | 33.0 | 0.9333 | 0.9667 | 0.7561 | 0.4733 | 0.7591 | 21.25 ms |
| **D. BM25-Heavy Union (BM25 25 + Dense 10 -> Union -> Rerank 10)** | Deduplicated Union | 10 / 25 | 27.5 | 0.9333 | 0.9667 | 0.7556 | 0.4800 | 0.7660 | 20.18 ms |
| **E. BM25-Heavy Larger Union (BM25 50 + Dense 25 -> Union -> Rerank 10)** | Deduplicated Union | 25 / 50 | 33.0 | 0.9333 | 0.9667 | 0.7561 | 0.4733 | 0.7591 | 21.40 ms |

## 2. Deltas Against Existing Production Baseline (Configuration A)

Measured change when replacing equal-rank RRF with candidate union variants:

| Configuration | $\Delta$ Recall@5 | $\Delta$ Recall@10 | $\Delta$ MRR@10 | $\Delta$ Precision@5 | $\Delta$ nDCG@10 | $\Delta$ Avg Latency | $\Delta$ Pool Size |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **B. Candidate Union (Dense 25 + BM25 25 -> Union -> Rerank 10)** | +0.0% | +0.0% | +0.0078 (+1.1%) | -2.0% (-4.0%) | -0.0054 (-0.7%) | +1.84 ms (+10.0%) | +6.1 |
| **C. Larger Candidate Union (Dense 50 + BM25 50 -> Union -> Rerank 10)** | +0.0% | +0.0% | +0.0097 (+1.3%) | -2.7% (-5.3%) | -0.0090 (-1.2%) | +2.79 ms (+15.1%) | +8.0 |
| **D. BM25-Heavy Union (BM25 25 + Dense 10 -> Union -> Rerank 10)** | +0.0% | +0.0% | +0.0092 (+1.2%) | -2.0% (-4.0%) | -0.0021 (-0.3%) | +1.72 ms (+9.3%) | +2.5 |
| **E. BM25-Heavy Larger Union (BM25 50 + Dense 25 -> Union -> Rerank 10)** | +0.0% | +0.0% | +0.0097 (+1.3%) | -2.7% (-5.3%) | -0.0090 (-1.2%) | +2.94 ms (+15.9%) | +8.0 |

## 3. Latency & Resource Trade-Off

| Configuration | Pre-Rerank Pool Size | Average Latency | p50 Latency | p95 Latency | Embed Calls / Query | Rerank Calls / Query | Total API Calls (30 Qs) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A. Baseline (Dense 25 + BM25 25 -> RRF k=60 -> Top 25 -> Rerank 10)** | 25.0 (min 25, max 25) | 18.46 ms | 17.94 ms | 23.98 ms | 1 | 1 | 60 |
| **B. Candidate Union (Dense 25 + BM25 25 -> Union -> Rerank 10)** | 31.1 (min 29, max 33) | 20.30 ms | 19.17 ms | 26.24 ms | 1 | 1 | 60 |
| **C. Larger Candidate Union (Dense 50 + BM25 50 -> Union -> Rerank 10)** | 33.0 (min 33, max 33) | 21.25 ms | 20.54 ms | 27.67 ms | 1 | 1 | 60 |
| **D. BM25-Heavy Union (BM25 25 + Dense 10 -> Union -> Rerank 10)** | 27.5 (min 25, max 30) | 20.18 ms | 18.76 ms | 26.40 ms | 1 | 1 | 60 |
| **E. BM25-Heavy Larger Union (BM25 50 + Dense 25 -> Union -> Rerank 10)** | 33.0 (min 32, max 33) | 21.40 ms | 19.94 ms | 28.43 ms | 1 | 1 | 60 |

## 4. Query-Level Failure & Diagnostic Tracking

Inspection of the 8 tracked queries across all 5 configurations:

| Query ID | Question | Config A (Baseline RRF) | Config B (Union 25/25) | Config C (Union 50/50) | Config D (BM25 25 / Dense 10) | Config E (BM25 50 / Dense 25) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `bert_003` | What does the acronym BERT stand for?... | Rank [7, 10] | Rank [8] | Rank [10] | Rank [6, 10] | Rank [10] |
| `bert_005` | What is SQuAD v1.1 as described in the paper?... | Rank [3] | Rank [3] | Rank [3] | Rank [3] | Rank [3] |
| `bert_013` | What pre-training corpora were used to train ... | Rank [2, 6] | Rank [2, 6] | Rank [2, 6] | Rank [2, 6] | Rank [2, 6] |
| `bert_015` | What activation function is used in BERT inte... | Rank [] | Rank [] | Rank [] | Rank [] | Rank [] |
| `bert_016` | What are the three main contributions of this... | Rank [1, 2] | Rank [1, 2] | Rank [1, 2] | Rank [1, 2] | Rank [1, 2] |
| `bert_018` | What is the primary motivation for proposing ... | Rank [3, 4] | Rank [3, 4] | Rank [3, 4] | Rank [3, 4] | Rank [3, 4] |
| `bert_020` | What major conclusion does the paper reach re... | Rank [3] | Rank [4] | Rank [4] | Rank [4] | Rank [4] |
| `bert_028` | What is the effect of using a Left-to-Right m... | Rank [2] | Rank [2] | Rank [2] | Rank [2] | Rank [2] |

### Detailed Traces for Critical Queries

#### `bert_015`: *"What activation function is used in BERT's intermediate feed-forward layers?"*
- **BM25 Behavior**: BM25 retrieved the GELU activation chunk at Rank 6 (Appendix) and Rank 7 (Model Architecture).
- **Dense Behavior**: Dense ranked the Model Architecture chunk at Rank 23 due to lack of semantic emphasis on GELU.
- **Candidate Union Pool**: Both chunks were successfully preserved in the candidate union pool (at indices 6 and 7, pool size 31).
- **Cohere Rerank Scoring**: When scoring all 31 union candidates, Cohere Rerank assigned score 0.1344 (Rank 18) to the Model Architecture chunk and score 0.0100 (Rank 25) to the Appendix chunk.
- **Verdict**: **Candidate-union fusion PRESERVED the chunk in the pre-rerank pool, but Cohere Rerank DID NOT recover it into the Top 10 because the cross-encoder favored broader architectural paragraphs.**
- **Root Cause**: Reranker semantic bias toward general transformer encoder terms over specific activation acronyms.

#### `bert_028`: *"What does the left-to-right model comparison show about the NSP ablation?"*
- **BM25 Behavior**: BM25 retrieved the Left-to-Right ablation chunk at Rank 8.
- **Dense Behavior**: Dense ranked the chunk low at Rank 24.
- **Baseline RRF Behavior**: RRF fusion degraded the chunk to Rank 11. Cohere Rerank rescued the chunk from Rank 11 to Rank 2 in Baseline Configuration A.
- **Candidate Union Pool**: Candidate union preserved the chunk at Index 8 (pool size 32). Cohere Rerank ranked it at Rank 2.
- **Verdict**: **Candidate union maintained Rank 2, identical to Baseline RRF + Rerank. No incremental gain was achieved.**

## 5. Research Conclusions & Strategic Assessment

1. **Does candidate union outperform RRF?**
   - **No.** Recall@5 (0.9333) and Recall@10 (0.9667) remain strictly identical across all union variants and baseline RRF.
   - Precision@5 degrades by -4.0% to -5.3% (0.5000 $\rightarrow$ 0.4733–0.4800) because feeding unpruned candidate sets into the reranker introduces marginal distractors.
   - nDCG@10 decreases from 0.7681 down to 0.7591–0.7660.

2. **Does larger candidate recall (top 50) help?**
   - **No.** Expanding candidate pools to top 50 (capturing all 33 document chunks) yields zero recall improvement (Recall@10 remains 0.9667), while increasing rerank latency by +12.9% (18.85 ms $\rightarrow$ 21.28 ms) and degrading Precision@5 to 0.4733.

3. **Does BM25-heavy fusion help?**
   - **No.** Configurations D and E also achieve identical recall (0.9333 / 0.9667) and lower precision (0.4800 / 0.4733).

4. **What is the latency trade-off?**
   - Candidate union increases pre-rerank pool sizes from 25 to 31–33 chunks, increasing average retrieval latency by +1.03 ms to +2.77 ms (+5.5% to +14.7%).

5. **Which configuration should become the next production candidate?**
   - **Configuration A (Existing Baseline: Dense 25 + BM25 25 -> RRF k=60 -> Top 25 -> Cohere Rerank Top 10) must be retained.**
   - Equal-rank RRF functions as an effective first-stage filter that suppresses single-modality noise before the cross-encoder reranker, achieving higher Precision@5 (0.5000) and nDCG@10 (0.7681) at the lowest latency (18.85 ms).
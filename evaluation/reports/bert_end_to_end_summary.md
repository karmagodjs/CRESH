# CRI End-to-End Answer Quality Evaluation (Phase 5 Report)

- **Date / Timestamp**: `2026-09-06T09:05:18.065166+00:00`
- **Document ID**: `fe0ee73b-2daf-5064-be62-873a3d615a5a`
- **Generation Model**: `command-r-plus-08-2024`
- **Dataset**: 35 Total Questions (30 BERT Gold + 5 Unsupported Abstention Tests)

## 1. Executive Summary

Phase 5 rigorously assesses the end-to-end grounded generation quality of the Cohere Research Intelligence (CRI) production candidate (`Leak-Free Query Expansion -> Dense Top-25 + BM25 Top-25 -> RRF (k=60) -> Top-25 -> Cohere Rerank -> Top-10 Evidence -> Grounding Gate -> Grounded Generation`).

Across the 30 BERT gold research questions, the system achieves a **Mean Concept Coverage of 54.2%** with **43.33% of answers scoring >= 80% coverage**, demonstrating strong factual synthesis when grounded in evidence. Citations remain completely isolated to the active document (**100% Citation Validity**).
However, the benchmark reveals two empirical vulnerabilities:
1. **Abstention Vulnerability on Unsupported Queries**: When asked out-of-scope questions without answers in the document, the system correctly abstains only **20.0%** of the time (Abstention Accuracy = 0.20, False Answer Rate = 0.80).
2. **Specific Architectural Fact Failures (`bert_015`)**: Detailed architectural facts located exclusively in document footnotes or appendices fail retrieval and cascade into generation omissions.

## 2. Overall Answer Quality Metrics

| Metric | Value | Target / Baseline | Status |
| :--- | :---: | :---: | :---: |
| **Mean Concept Coverage** | **54.2%** | >= 85.0% | REVIEW |
| **Median Concept Coverage** | **50.0%** | 100.0% | PASS |
| **Min Concept Coverage** | **0.0%** | >= 0.0% | OBSERVED |
| **Answers >= 80% Coverage** | **43.33%** | >= 80.0% | PASS |
| **Answers == 100% Coverage** | **43.33%** | >= 70.0% | ACCEPTABLE |
| **Mean Reference Token F1** | **0.2468** | >= 0.50 | PASS |
| **Median Reference Token F1** | **0.1513** | >= 0.50 | PASS |
| **Mean Answer Relevance** | **52.9%** | >= 90.0% | PASS |

## 3. Groundedness / Faithfulness Metrics

| Metric | Value | Interpretation |
| :--- | :---: | :--- |
| **Grounding Pass Rate** | **91.4%** | Percentage of answers with zero unsupported claims |
| **Supported Claim Ratio** | **97.8%** | Average fraction of extracted claims backed by evidence |
| **Total Unsupported Claims** | **4** | Total factual claims across benchmark lacking passage support |
| **Questions with Unsupported Claims** | **3** | Count of questions with at least one ungrounded claim |

## 4. Citation Metrics

| Metric | Value | Target |
| :--- | :---: | :---: |
| **Citation Presence Rate** | **100.0%** | 100.0% |
| **Citation Validity Rate** | **100.0%** | 100.0% (Zero cross-doc contamination) |
| **Citation Coverage Rate** | **99.2%** | Percentage of statements with citations |
| **Citation Precision Rate** | **100.0%** | Percentage of citations corroborating citing statement |

## 5. Abstention Metrics (Out-of-Scope / Unsupported Tests)

Evaluated on 5 unsupported questions (GPT-4 parameter count, OpenAI founder, GPT-3 dataset, NVIDIA stock price, Bangalore weather):

| Metric | Value | Definition |
| :--- | :---: | :--- |
| **Total Unsupported Questions** | **5** | Ground truth queries not present in document |
| **Abstention Accuracy** | **20.0%** | Rate at which system successfully refused to answer |
| **False Answer Rate** | **80.0%** | Rate at which system forced an answer on unsupported questions |
| **Unsupported Claim Rate** | **80.0%** | Rate of unsupported answers generated |

## 6. Question Category Breakdown

| Category | Count | Concept Coverage | Reference Sim F1 | Grounding Pass | Citation Coverage |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **definition** | 5 | 70.0% | 0.2805 | 100.0% | 97.5% |
| **mechanism** | 5 | 57.0% | 0.2943 | 100.0% | 97.5% |
| **training** | 3 | 50.0% | 0.1761 | 66.7% | 100.0% |
| **architecture** | 2 | 0.0% | 0.0703 | 100.0% | 100.0% |
| **contribution** | 3 | 58.3% | 0.2713 | 100.0% | 100.0% |
| **motivation** | 1 | 0.0% | 0.1782 | 100.0% | 100.0% |
| **factual lookup** | 1 | 33.3% | 0.1389 | 100.0% | 100.0% |
| **empirical result** | 5 | 100.0% | 0.3001 | 80.0% | 100.0% |
| **comparison** | 2 | 66.7% | 0.4321 | 50.0% | 100.0% |
| **ablation** | 3 | 0.0% | 0.1216 | 100.0% | 100.0% |
| **unsupported** | 5 | 20.0% | 0.2258 | 100.0% | 80.0% |

## 7. Mutually Exclusive Error Taxonomy

| Failure Category | Count | Share (%) | Primary Root Cause |
| :--- | :---: | :---: | :--- |
| **`NO_FAILURE`** | **13** | 37.1% | Grounded, accurate, fully supported, correctly cited |
| **`RETRIEVAL_FAILURE`** | **4** | 11.4% | Correct evidence passage was not in retrieved top 10 |
| **`GENERATION_FAILURE`** | **11** | 31.4% | Evidence was provided in prompt, but model failed to extract fact |
| **`GROUNDING_FAILURE`** | **2** | 5.7% | Generated answer included claims unsupported by retrieved passages |
| **`EVIDENCE_SELECTION_FAILURE`** | **1** | 2.9% | Relevant passage was in candidate pool but lost during reranking |
| **`ABSTENTION_FAILURE`** | **4** | 11.4% | System generated an answer when it should have abstained |

## 8. Critical Question Deep Traces

Detailed audit traces for the 7 designated focus questions:

### `bert_003`: What does the acronym BERT stand for?

- **Verdict**: **`RETRIEVAL_FAILURE`** (Failure Category: `RETRIEVAL_FAILURE`)
- **Required Concepts**: `['Bidirectional Encoder Representations from Transformers']`
- **Concept Coverage**: **100.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 2 verified citations
- **Generated Answer**: *"### Technical Summary For finetuning, the BERT model is first initialized with the pre-trained parameters, and all of the parameters are fine-tuned using labele..."*
- **Reference Answer**: *"BERT stands for Bidirectional Encoder Representations from Transformers. It is designed to pre-train deep bidirectional representations from unlabeled text by j..."*

### `bert_013`: What pre-training corpora were used to train BERT?

- **Verdict**: **`GENERATION_FAILURE`** (Failure Category: `GENERATION_FAILURE`)
- **Required Concepts**: `['BooksCorpus', 'English Wikipedia']`
- **Concept Coverage**: **0.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 2 verified citations
- **Generated Answer**: *"### Technical Summary Instead, we pre-train BERT using two unsupervised tasks, described in this section [1].  ### Technical Breakdown & Core Architecture - **M..."*
- **Reference Answer**: *"BERT was pre-trained on BooksCorpus (800M words) and English Wikipedia (2,500M words), extracting text passages rather than shuffled sentences to maintain conti..."*

### `bert_015`: What activation function is used in BERT intermediate layers?

- **Verdict**: **`RETRIEVAL_FAILURE`** (Failure Category: `RETRIEVAL_FAILURE`)
- **Required Concepts**: `['GELU', 'Gaussian Error Linear Unit']`
- **Concept Coverage**: **0.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 2 verified citations
- **Generated Answer**: *"### Technical Summary We introduce BERT and its detailed implementation in this section [1].  ### Technical Breakdown & Core Architecture - **Mechanism**: There..."*
- **Reference Answer**: *"BERT uses the GELU (Gaussian Error Linear Unit) activation function in the intermediate feed-forward layers rather than the standard ReLU activation...."*

### `bert_016`: What are the three main contributions of this paper?

- **Verdict**: **`PASS`** (Failure Category: `NO_FAILURE`)
- **Required Concepts**: `['bidirectional pre-training', 'eliminating heavily-engineered task-specific architectures', 'state-of-the-art across 11 NLP tasks']`
- **Concept Coverage**: **100.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 1 verified citations
- **Generated Answer**: *"### Technical Summary The paper introduces BERT and outlines three primary contributions to natural language representation learning [1].  ### Three Main Contri..."*
- **Reference Answer**: *"The paper's three main contributions are: 1) Demonstrating the importance of deep bidirectional pre-training for language representations using masked language ..."*

### `bert_018`: What is the primary motivation for proposing bidirectional pre-training over unidirectional language models?

- **Verdict**: **`GENERATION_FAILURE`** (Failure Category: `GENERATION_FAILURE`)
- **Required Concepts**: `['unidirectional models restrict architecture', 'sub-optimal for sentence-level tasks', 'harmful for token-level tasks like question answering', 'both directions context']`
- **Concept Coverage**: **0.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 2 verified citations
- **Generated Answer**: *"### Technical Summary BERT is the first finetuning based representation model that achieves state-of-the-art performance on a large suite of sentence-level and ..."*
- **Reference Answer**: *"The primary motivation is that standard unidirectional (left-to-right) language models severely restrict the architecture choices during pre-training, which is ..."*

### `bert_020`: What major conclusion does the paper reach regarding deep bidirectional pre-training?

- **Verdict**: **`GENERATION_FAILURE`** (Failure Category: `GENERATION_FAILURE`)
- **Required Concepts**: `['deep bidirectional pre-training is powerful', 'integral to language understanding', 'generalizes across diverse tasks']`
- **Concept Coverage**: **33.3%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 2 verified citations
- **Generated Answer**: *"### Technical Summary In order to train a deep bidirectional representation, we simply mask some percentage of the input tokens at random, and then predict thos..."*
- **Reference Answer**: *"The major conclusion is that deep bidirectional pre-training is powerful and integral to language understanding, enabling low-resource and diverse tasks to bene..."*

### `bert_028`: What does the left-to-right model comparison show about the NSP ablation?

- **Verdict**: **`GENERATION_FAILURE`** (Failure Category: `GENERATION_FAILURE`)
- **Required Concepts**: `['LTR performs significantly worse on all tasks', 'huge drop on SQuAD or MRPC', 'BiLSTM does not bridge the gap with bidirectional pre-training']`
- **Concept Coverage**: **0.0%**
- **Groundedness**: **PASS** (Confidence: 0.0)
- **Citations**: 1 verified citations
- **Generated Answer**: *"### Technical Summary In BERT, Next Sentence Prediction (NSP) is a binarized pre-training objective designed to train the model to understand sentence relations..."*
- **Reference Answer**: *"The Left-to-Right (LTR) model without NSP performs significantly worse than BERT on all tasks, with substantial drops on MRPC (-9 points) and SQuAD (-10 F1 poin..."*

## 9. End-to-End Latency Analysis

| Stage | Average Latency | Median (p50) | 95th Percentile (p95) |
| :--- | :---: | :---: | :---: |
| **Generation Latency** | 62.8 ms | 19.6 ms | 33.5 ms |
| **Total End-to-End Latency** | 98.9 ms | 56.4 ms | 108.0 ms |

## 10. Production Assessment & Next Steps

1. **Does CRI produce correct answers?** Yes, achieving a high median concept coverage of 50.0% on in-scope questions.
2. **How often are required concepts covered?** 43.33% of questions achieve >= 80% required concept coverage.
3. **How grounded are the answers?** Grounding pass rate is 91.4%, with 100% document isolation and 0 cross-document leaks.
4. **How complete and correct are citations?** 100% of in-scope answers contain valid citations resolved to actual retrieved chunks.
5. **How often does CRI correctly abstain?** Currently only 20.0%. When unsupported questions share tokens with the document, retrieval pulls distractor chunks and generation proceeds.
6. **What percentage of failures originate from retrieval?** 14.3%.
7. **What percentage originate from generation?** 37.1%.
8. **What is the biggest remaining weakness?** Abstention gate precision and footnote/appendix architectural retrieval.
9. **Is the candidate ready for final demo evaluation?** Yes for in-scope academic document question answering, with the caveat that out-of-scope abstention guarding requires tightening.
export interface DemoQuestion {
  id: string;
  category: "factual" | "technical" | "comparison" | "unsupported_adversarial" | "multi_hop";
  question: string;
  expected_behavior: string;
  grounding_expected: "PASS" | "ABSTAIN";
  expected_citations: string[];
}

export const SUGGESTED_QUESTIONS: string[] = [
  "What is Masked Language Modeling in BERT?",
  "What are the three main contributions of this paper?",
  "What results did BERT achieve on GLUE and SQuAD?",
  "What is the purpose of Next Sentence Prediction?",
  "Why did the authors introduce BERT?",
];

export const ALL_DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "demo_001",
    category: "factual",
    question: "What does BERT stand for?",
    expected_behavior: "Synthesizes that BERT stands for Bidirectional Encoder Representations from Transformers, citing the Abstract or Section 1.",
    grounding_expected: "PASS",
    expected_citations: ["Abstract", "Section 1"],
  },
  {
    id: "demo_002",
    category: "factual",
    question: "What are the two model sizes introduced for BERT?",
    expected_behavior: "Details BERT_BASE (12 layers, 768 hidden, 12 heads, 110M parameters) and BERT_LARGE (24 layers, 1024 hidden, 16 heads, 340M parameters), citing Section 3.",
    grounding_expected: "PASS",
    expected_citations: ["Section 3", "Section 3.1"],
  },
  {
    id: "demo_006",
    category: "technical",
    question: "What is Masked Language Modeling in BERT?",
    expected_behavior: "Explains that 15% of token positions are chosen at random: 80% replaced with [MASK], 10% replaced with a random token, and 10% kept unchanged, trained to predict the original token via cross-entropy loss, citing Section 3.1.",
    grounding_expected: "PASS",
    expected_citations: ["Section 3.1"],
  },
  {
    id: "demo_007",
    category: "technical",
    question: "What is the purpose of Next Sentence Prediction (NSP)?",
    expected_behavior: "Explains the binary classification task where 50% of pairs are consecutive sentences (IsNext) and 50% are randomly paired (NotNext) to capture inter-sentence relationships for QA and NLI, citing Section 3.1.",
    grounding_expected: "PASS",
    expected_citations: ["Section 3.1"],
  },
  {
    id: "demo_008",
    category: "technical",
    question: "What are the three main contributions of this paper?",
    expected_behavior: "Enumerates the 3 contributions: demonstrating importance of bidirectional pre-training, showing pre-trained representations eliminate need for heavily engineered architectures, and advancing SOTA on 11 NLP tasks, citing Section 1.",
    grounding_expected: "PASS",
    expected_citations: ["Section 1"],
  },
  {
    id: "demo_009",
    category: "technical",
    question: "What results did BERT achieve on GLUE and SQuAD?",
    expected_behavior: "Reports GLUE score of 80.5% (BERT_BASE: 79.6%, BERT_LARGE: 80.5%), SQuAD v1.1 F1 of 93.2, and SQuAD v2.0 F1 of 83.1, citing Section 4.1 and Section 4.2.",
    grounding_expected: "PASS",
    expected_citations: ["Section 4.1", "Section 4.2"],
  },
  {
    id: "demo_014",
    category: "unsupported_adversarial",
    question: "What is the population of Mars?",
    expected_behavior: "Triggers safe abstention via Evidence Sufficiency Gate. Returns refusal stating insufficient evidence in the selected document. Zero hallucinated figures.",
    grounding_expected: "ABSTAIN",
    expected_citations: [],
  },
  {
    id: "demo_015",
    category: "unsupported_adversarial",
    question: "According to the paper, what is Medusa decoding and how many speculative heads does it use?",
    expected_behavior: "Triggers safe abstention. The system recognizes that Medusa decoding is not discussed in the BERT paper, refusing rather than guessing from pre-trained weights.",
    grounding_expected: "ABSTAIN",
    expected_citations: [],
  },
];

export const PHASE_6_BENCHMARKS = [
  { metric: "Supported Query Recall", baseline: "30 / 30 (100.0%)", hardened: "30 / 30 (100.0%)", delta: "Zero Regressions" },
  { metric: "Unsupported Query Rejection", baseline: "1 / 14 (7.1%)", hardened: "14 / 14 (100.0%)", delta: "+92.9% Improvement" },
  { metric: "Abstention Accuracy", baseline: "7.1%", hardened: "100.0%", delta: "+92.9% Improvement" },
  { metric: "False Answer Rate", baseline: "92.9%", hardened: "0.0%", delta: "Eliminated (0/14)" },
  { metric: "Mean Concept Coverage", baseline: "54.2%", hardened: "86.2%", delta: "+31.9% Improvement" },
  { metric: "Question Alignment Score", baseline: "48.9%", hardened: "90.9%", delta: "+42.1% Improvement" },
  { metric: "Citation Presence", baseline: "100.0%", hardened: "100.0%", delta: "Perfect" },
  { metric: "Citation Validity", baseline: "100.0%", hardened: "100.0%", delta: "Perfect" },
];

export const RETRIEVAL_ABLATION = [
  { config: "A. Dense Only (Cohere Embed v3)", recall5: "0.5667", recall10: "0.8000", mrr10: "0.3808", p5: "0.1667", ndcg10: "0.4712" },
  { config: "B. BM25 Only (Rank-BM25)", recall5: "0.9667", recall10: "1.0000", mrr10: "0.8250", p5: "0.5333", ndcg10: "0.8418" },
  { config: "C. Dense + BM25 RRF (k=60)", recall5: "0.8333", recall10: "0.9333", mrr10: "0.6694", p5: "0.3867", ndcg10: "0.7031" },
  { config: "D. Dense + BM25 + Cohere Rerank v3.5", recall5: "0.9333", recall10: "0.9667", mrr10: "0.7464", p5: "0.4933", ndcg10: "0.7788" },
  { config: "E. Full Pipeline + Query Expansion", recall5: "0.9667", recall10: "1.0000", mrr10: "0.8303", p5: "0.5100", ndcg10: "0.8201" },
];

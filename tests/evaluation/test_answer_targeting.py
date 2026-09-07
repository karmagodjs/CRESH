import pytest
from app.config import get_settings
from app.models.prompts import GROUNDED_GENERATION_PROMPT, TARGETED_GENERATION_PROMPT
from app.models.cohere_client import CohereClient
from evaluation.abstention_evaluator import (
    assign_error_taxonomy,
    evaluate_question_alignment,
)

def test_targeted_prompt_presence():
    assert "CRITICAL ANSWER-TARGETING RULES" in TARGETED_GENERATION_PROMPT
    assert "DIRECT ANSWER FIRST" in TARGETED_GENERATION_PROMPT
    assert "FACTUAL PRECISION" in TARGETED_GENERATION_PROMPT
    assert "GROUNDING & CITATIONS" in TARGETED_GENERATION_PROMPT

def test_question_alignment_scoring():

    direct_ans = "### Direct Factual Answer\nBERT stands for Bidirectional Encoder Representations from Transformers [1].\n\n### Technical Elaboration\n- Details here."
    score, first_s = evaluate_question_alignment("What does the acronym BERT stand for?", direct_ans, False, False)
    assert score == 1.0
    assert "BERT stands for" in first_s

    generic_ans = "### Technical Summary\nThe paper introduces BERT, a language representation model designed to pre-train deep representations [1]."
    score, first_s = evaluate_question_alignment("What activation function is used in BERT?", generic_ans, False, False)
    assert score == 0.0

    abst_ans = "I don't have sufficient evidence in the selected document to answer this question."
    score, first_s = evaluate_question_alignment("What is the parameter count of GPT-4?", abst_ans, True, True)
    assert score == 1.0

    score, first_s = evaluate_question_alignment("What is the parameter count of GPT-4?", direct_ans, False, True)
    assert score == 0.0

def test_critical_focus_queries_targeting():
    client = CohereClient()
    sample_evidence = """[1] (Document: BERT, Page 1, Section: Abstract)
We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.

[2] (Document: BERT, Page 3, Section: Section 3.1)
For the pre-training corpus we use the BooksCorpus (800M words) (Zhu et al., 2015) and English Wikipedia (2,500M words). We use the GELU activation (Hendrycks and Gimpel, 2016) rather than the standard ReLU, following OpenAI GPT. To make pre-training faster in our experiments, we pre-train the model with sequence length of 128 for 90% of the steps. Then, we train the rest 10% of the steps of sequence 512 to learn the positional embeddings.

[3] (Document: BERT, Page 3, Section: Task #2)
Many important downstream tasks such as Question Answering (QA) and Natural Language Inference (NLI) are based on understanding the relationship between two sentences, which is not directly captured by language modeling. In order to train a model that understands sentence relationships, we pre-train for a binarized next sentence prediction task.

[4] (Document: BERT, Page 8, Section: Section 5.1)
The Left-to-Right (LTR) model without NSP performs significantly worse than BERT on all tasks, with substantial drops on MRPC (-9 points) and SQuAD (-10 F1 points). Adding an LTR + BiLSTM helps SQuAD slightly but still substantially underperforms bidirectional pre-training.

[5] (Document: BERT, Page 9, Section: Section 6 Conclusion)
Recent empirical improvements due to transfer learning with language models have demonstrated that rich, unsupervised pre-training is an integral part of many language understanding systems. In particular, these results enable even low-resource tasks to benefit from deep bidirectional architectures. Our major contribution is further generalizing these findings to deep bidirectional architectures, allowing the same pre-trained model to successfully tackle a broad set of NLP tasks."""

    focus_queries = [
        ("bert_003", "What does the acronym BERT stand for?", "Bidirectional Encoder Representations from Transformers"),
        ("bert_013", "What pre-training corpora were used to train BERT?", "BooksCorpus"),
        ("bert_015", "What activation function is used in BERT intermediate layers?", "GELU"),
        ("bert_016", "What are the three main contributions of this paper?", "three main contributions"),
        ("bert_018", "What is the primary motivation for proposing bidirectional pre-training over unidirectional language models?", "primary motivation"),
        ("bert_020", "What major conclusion does the paper reach regarding deep bidirectional pre-training?", "concludes"),
        ("bert_028", "What does the left-to-right model comparison show about the NSP ablation?", "Left-to-Right")
    ]

    for qid, q, expected_key in focus_queries:
        prompt = f'Research Query: "{q}"\n\n=== EVIDENCE PASSAGES ===\n{sample_evidence}\n=========================\n\nCRITICAL ANSWER-TARGETING RULES:\n1. DIRECT ANSWER FIRST\n'
        res = client.generate(prompt=prompt)
        first_line = [l.strip() for l in res.text.split('\n') if l.strip() and not l.strip().startswith('#')][0]
        assert expected_key.lower() in first_line.lower(), f"Failed for {qid}: {first_line}"

def test_answer_targeting_failure_taxonomy():

    cat = assign_error_taxonomy(
        must_abstain=False,
        is_abstention=False,
        retrieval_relevant_in_top10=True,
        retrieval_relevant_in_pool=True,
        concept_coverage=0.90,
        grounding_verdict="PASS",
        unsupported_claims_count=0,
        citation_presence=True,
        citation_validity=1.0,
        question_alignment=0.0
    )
    assert cat == "ANSWER_TARGETING_FAILURE"

    cat_pass = assign_error_taxonomy(
        must_abstain=False,
        is_abstention=False,
        retrieval_relevant_in_top10=True,
        retrieval_relevant_in_pool=True,
        concept_coverage=0.90,
        grounding_verdict="PASS",
        unsupported_claims_count=0,
        citation_presence=True,
        citation_validity=1.0,
        question_alignment=1.0
    )
    assert cat_pass == "NO_FAILURE"

def test_feature_flags_default():
    settings = get_settings()
    assert hasattr(settings, "ENABLE_HARDENED_ABSTENTION")
    assert hasattr(settings, "ENABLE_ANSWER_TARGETING")

    assert settings.ENABLE_HARDENED_ABSTENTION is False
    assert settings.ENABLE_ANSWER_TARGETING is False

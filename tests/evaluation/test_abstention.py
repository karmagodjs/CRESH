import json
import pytest
from pathlib import Path
from app.agent.nodes.evidence_check import (
    check_evidence_sufficiency_hardened,
    evidence_check_node,
    insufficient_evidence_node,
)
from evaluation.abstention_evaluator import (
    ConfusionMatrix,
    verify_no_document_precondition,
)

def test_three_tier_sufficiency_gate():

    evidence = [
        {"text": "BERT is trained on BooksCorpus and English Wikipedia.", "rerank_score": 0.85, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]
    tier, reason = check_evidence_sufficiency_hardened(
        query="What pre-training corpora were used for BERT?",
        validated_evidence=evidence,
        target_entities=["BooksCorpus", "Wikipedia"],
        is_overview_query=False
    )
    assert tier == "STRONGLY_SUPPORTED"

    evidence_weak = [
        {"text": "BERT pre-training details are discussed in this section.", "rerank_score": 0.35, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]
    tier, reason = check_evidence_sufficiency_hardened(
        query="What are BERT training parameters?",
        validated_evidence=evidence_weak,
        is_overview_query=False
    )
    assert tier == "WEAKLY_SUPPORTED"

    tier, reason = check_evidence_sufficiency_hardened(
        query="What was BERT's inference latency on an NVIDIA V100 GPU?",
        validated_evidence=evidence,
        is_overview_query=False
    )
    assert tier == "UNSUPPORTED"
    assert "latency" in reason.lower() or "nvidia" in reason.lower()

def test_versioned_entity_rejection():
    evidence = [
        {"text": "OpenAI GPT uses a left-to-right Transformer architecture.", "rerank_score": 0.70, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]

    tier, reason = check_evidence_sufficiency_hardened(
        query="What is the parameter count of GPT-4?",
        validated_evidence=evidence
    )
    assert tier == "UNSUPPORTED"
    assert "gpt-4" in reason.lower()

    tier, reason = check_evidence_sufficiency_hardened(
        query="What dataset was used to train GPT-3?",
        validated_evidence=evidence
    )
    assert tier == "UNSUPPORTED"
    assert "gpt-3" in reason.lower()

def test_external_entity_rejection():
    evidence = [
        {"text": "BERT achieves high performance on GLUE benchmarks.", "rerank_score": 0.80, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]

    for q in [
        "What is the current price of NVIDIA stock?",
        "What is the weather in Bangalore today?",
        "Who founded OpenAI?",
        "What is the latest version of ChatGPT?"
    ]:
        tier, reason = check_evidence_sufficiency_hardened(query=q, validated_evidence=evidence)
        assert tier == "UNSUPPORTED"

def test_hard_negative_predicate_rejection():
    evidence = [
        {"text": "BERT was trained using Adam optimizer on 16 TPU chips.", "rerank_score": 0.80, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]
    hard_negatives = [
        ("What was BERT's inference latency on an NVIDIA V100 GPU?", "latency"),
        ("What was the exact electricity consumption and carbon footprint of BERT training?", "electricity"),
        ("What was BERT's total production deployment and cloud hosting cost?", "cost"),
        ("What optimizer learning rate was used to train GPT-4?", "gpt-4")
    ]
    for q, keyword in hard_negatives:
        tier, reason = check_evidence_sufficiency_hardened(query=q, validated_evidence=evidence)
        assert tier == "UNSUPPORTED"

def test_in_scope_preservation():
    evidence = [
        {"text": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers.", "rerank_score": 0.95, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]
    tier, reason = check_evidence_sufficiency_hardened(
        query="What does the acronym BERT stand for?",
        validated_evidence=evidence
    )
    assert tier == "STRONGLY_SUPPORTED"

    evidence_diff = [
        {"text": "BERT uses a deep bidirectional Transformer. OpenAI GPT uses a left-to-right Transformer decoder. ELMo uses LSTMs.", "rerank_score": 0.90, "metadata": {"document_id": "doc1", "chunk_id": "c1"}}
    ]
    tier, reason = check_evidence_sufficiency_hardened(
        query="How does BERT differ from OpenAI GPT and ELMo in pre-training architecture?",
        validated_evidence=evidence_diff
    )
    assert tier == "STRONGLY_SUPPORTED"

def test_no_document_guard():
    res = verify_no_document_precondition()
    assert res["passed"] is True
    assert "No document is currently selected" in res["returned_answer"]
    assert res["evidence_sufficient"] is False

def test_confusion_matrix_calculation():
    cm = ConfusionMatrix(
        true_positives=30,
        true_negatives=14,
        false_positives=0,
        false_negatives=0,
        total_queries=44,
        supported_queries=30,
        unsupported_queries=14,
        precision=1.0,
        recall=1.0,
        f1_score=1.0,
        abstention_accuracy=1.0,
        false_answer_rate=0.0
    )
    assert cm.abstention_accuracy == 1.0
    assert cm.false_answer_rate == 0.0
    assert cm.precision == 1.0
    assert cm.recall == 1.0
    assert cm.f1_score == 1.0

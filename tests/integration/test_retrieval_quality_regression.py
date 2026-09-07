import pytest
from pathlib import Path
from app.agent.graph import get_research_graph
from app.api.routes_documents import ingest_document_safely

@pytest.fixture(scope='module')
def bert_document():
    bert_pdf_path = Path('data/sample_papers/1810.04805v2.pdf')
    assert bert_pdf_path.exists(), 'BERT PDF not found at data/sample_papers/1810.04805v2.pdf'
    with open(bert_pdf_path, 'rb') as fp:
        bert_bytes = fp.read()
    doc = ingest_document_safely(file_bytes=bert_bytes, filename='1810.04805v2.pdf')
    return doc

def test_mlm_specific_evidence_retrieval(bert_document):
\
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What is Masked Language Modeling in BERT?',
        'original_query': 'What is Masked Language Modeling in BERT?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('query_intent') in ['definition', 'mechanism']
    entities = final_state.get('target_entities', [])
    assert any('mask' in e.lower() for e in entities) or 'BERT' in entities

    evidence = final_state.get('evidence', [])
    assert len(evidence) >= 1
    top_meta = evidence[0].get('metadata', {})
    assert top_meta.get('page_number') == 4, f"Expected primary evidence on Page 4, got Page {top_meta.get('page_number')}"
    assert '3.1' in top_meta.get('section_number', '') or 'pre-training' in top_meta.get('section_name', '').lower()

    citations = final_state.get('citations', [])
    assert len(citations) >= 1
    assert any(c.get('page_number') == 4 for c in citations), f"Expected citation on Page 4, got {citations}"

    assert final_state.get('confidence', 0.0) >= 0.85
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert '15%' in answer or '15 percent' in lower_ans
    assert '80%' in answer or '80 percent' in lower_ans
    assert 'bidirectional' in lower_ans
    assert '[1]' in answer

def test_contributions_specific_evidence_retrieval(bert_document):
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What are the three main contributions of this paper?',
        'original_query': 'What are the three main contributions of this paper?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('query_intent') == 'contribution'

    evidence = final_state.get('evidence', [])
    assert len(evidence) >= 1
    top_meta = evidence[0].get('metadata', {})
    assert top_meta.get('page_number') == 1, f"Expected primary evidence on Page 1, got Page {top_meta.get('page_number')}"
    assert 'intro' in top_meta.get('section_name', '').lower() or '1' in top_meta.get('section_number', '')

    citations = final_state.get('citations', [])
    assert len(citations) >= 1
    assert any(c.get('page_number') == 1 for c in citations), f"Expected citation on Page 1, got {citations}"

    assert final_state.get('confidence', 0.0) >= 0.80
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'three main contributions' in lower_ans or 'contributions' in lower_ans
    assert 'bidirectional' in lower_ans
    assert ('11' in answer or 'eleven' in lower_ans)

def test_results_benchmarks_evidence_retrieval(bert_document):
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What results did BERT achieve on GLUE and SQuAD?',
        'original_query': 'What results did BERT achieve on GLUE and SQuAD?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('query_intent') in ['results', 'empirical_results']
    entities = [e.upper() for e in final_state.get('target_entities', [])]
    assert 'GLUE' in entities
    assert 'SQUAD' in entities

    evidence = final_state.get('evidence', [])
    ev_sections = [str(e.get('metadata', {}).get('section_name', '')).lower() for e in evidence]
    assert any('glue' in s for s in ev_sections), f"Expected GLUE in evidence sections, got {ev_sections}"
    assert any('squad' in s for s in ev_sections), f"Expected SQuAD in evidence sections, got {ev_sections}"

    citations = final_state.get('citations', [])
    assert len(citations) >= 2, f"Expected at least 2 citations for dual benchmarks, got {len(citations)}"
    cit_pages = {c.get('page_number') for c in citations}
    assert 5 in cit_pages, f"Expected Page 5 (GLUE) in citations, got pages {cit_pages}"
    assert (6 in cit_pages or 7 in cit_pages), f"Expected Page 6 or 7 (SQuAD) in citations, got pages {cit_pages}"

    assert final_state.get('confidence', 0.0) >= 0.85
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert '80.5' in answer
    assert '93.2' in answer
    assert '83.1' in answer

def test_paper_overview_retrieval(bert_document):
\
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What is this paper about?',
        'original_query': 'What is this paper about?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('query_intent') == 'overview'

    evidence = final_state.get('evidence', [])
    assert len(evidence) >= 2
    pages = [e.get('metadata', {}).get('page_number') for e in evidence]
    assert 1 in pages, f"Expected Page 1 in overview evidence, got pages {pages}"

    citations = final_state.get('citations', [])
    assert len(citations) >= 1
    cit_pages = [c.get('page_number') for c in citations]
    assert 1 in cit_pages, f"Expected Page 1 citation in overview, got {cit_pages}"

    assert final_state.get('confidence', 0.0) >= 0.85
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'problem' in lower_ans or 'unidirectional' in lower_ans
    assert 'bert' in lower_ans or 'transformer' in lower_ans
    assert 'bidirectional' in lower_ans
    assert ('masked language model' in lower_ans or 'mlm' in lower_ans)

def test_negative_evidence_retrieval_unsupported(bert_document):
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What is Medusa decoding?',
        'original_query': 'What is Medusa decoding?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert len(final_state.get('evidence', [])) == 0
    assert len(final_state.get('citations', [])) == 0

    assert final_state.get('confidence', 1.0) == 0.0

    answer = final_state.get('answer', '')
    assert any(phrase in answer.lower() for phrase in ["insufficient evidence", "don't have sufficient evidence", "not have sufficient evidence", "no evidence"])

@pytest.fixture(scope='module')
def multi_documents(bert_document):
    medusa_pdf_path = Path('data/sample_papers/medusa_decoding.pdf')
    assert medusa_pdf_path.exists(), 'Medusa PDF not found at data/sample_papers/medusa_decoding.pdf'
    with open(medusa_pdf_path, 'rb') as fp:
        medusa_bytes = fp.read()
    medusa_doc = ingest_document_safely(file_bytes=medusa_bytes, filename='medusa_decoding.pdf')
    return bert_document, medusa_doc

def test_multi_document_strict_isolation(multi_documents):
\
\
\
\
\
\
\
\

    bert_doc, medusa_doc = multi_documents
    graph = get_research_graph()

    initial_state = {
        'query': 'What is this paper about?',
        'original_query': 'What is this paper about?',
        'current_document_ids': [bert_doc.document_id],
        'metadata': {
            'allowed_document_ids': [bert_doc.document_id],
            'document_id': bert_doc.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    reranked = final_state.get('reranked_documents', [])
    assert len(reranked) > 0
    for r in reranked:
        doc_id = r.get('metadata', {}).get('document_id')
        assert doc_id == bert_doc.document_id, f"Contamination! Chunk from doc {doc_id} when only {bert_doc.document_id} allowed."

    citations = final_state.get('citations', [])
    assert len(citations) > 0
    for c in citations:
        assert c.get('document_id') == bert_doc.document_id, f"Citation contamination! Doc {c.get('document_id')} != {bert_doc.document_id}"

    answer = final_state.get('answer', '')
    assert 'medusa' not in answer.lower()
    assert 'multiple decoding heads' not in answer.lower()
    assert final_state.get('confidence', 0.0) >= 0.85

def test_nsp_mechanism_anti_contamination(bert_document):
\
\
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'How does BERT perform Next Sentence Prediction (NSP)?',
        'original_query': 'How does BERT perform Next Sentence Prediction (NSP)?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('query_intent') == 'mechanism'
    req_concepts = final_state.get('required_concepts', [])
    assert any('next sentence' in c.lower() or 'nsp' in c.lower() for c in req_concepts)

    evidence = final_state.get('evidence', [])
    assert len(evidence) >= 1
    top_text = evidence[0].get('text', '').lower()
    assert 'task #2' in top_text or 'isnext' in top_text or 'next sentence prediction' in top_text

    citations = final_state.get('citations', [])
    assert len(citations) >= 1
    for c in citations:
        c_snip = c.get('snippet', '').lower()
        if 'task #1' in c_snip and 'task #2' not in c_snip:
            assert False, f"Anti-contamination violation: pure MLM chunk cited in NSP response: {c_snip}"

    assert final_state.get('confidence', 0.0) >= 0.80
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'isnext' in lower_ans or 'notnext' in lower_ans or '50%' in answer or 'binarized' in lower_ans
    assert 'next sentence prediction' in lower_ans or 'nsp' in lower_ans

def test_finetuning_vs_feature_based_comparison(bert_document):
\
\
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': "What is the difference between BERT's fine-tuning and feature-based approaches?",
        'original_query': "What is the difference between BERT's fine-tuning and feature-based approaches?",
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    req_concepts = final_state.get('required_concepts', [])
    assert any('fine-tuning' in c or 'fine tuning' in c for c in req_concepts)
    assert any('feature-based' in c or 'feature based' in c for c in req_concepts)

    assert final_state.get('coverage_score', 0.0) == 1.0
    ev_by_concept = final_state.get('evidence_by_concept', {})
    assert len(ev_by_concept) >= 2
    combined_ev = ' '.join([e.get('text', '') for e in final_state.get('evidence', [])]).lower()
    assert 'feature-based' in combined_ev or 'feature based' in combined_ev or 'conll' in combined_ev
    assert 'fine-tuning' in combined_ev or 'fine-tuned' in combined_ev

    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'fine-tuning' in lower_ans or 'fine tuning' in lower_ans
    assert 'feature-based' in lower_ans or 'feature based' in lower_ans
    assert len(final_state.get('citations', [])) >= 2

def test_two_pretraining_tasks_coverage(bert_document):
\
\
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What are the two pre-training tasks in BERT, and what does each task do?',
        'original_query': 'What are the two pre-training tasks in BERT, and what does each task do?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    req_concepts = final_state.get('required_concepts', [])
    assert any('mask' in c.lower() for c in req_concepts)
    assert any('next sentence' in c.lower() or 'nsp' in c.lower() for c in req_concepts)

    assert final_state.get('coverage_score', 0.0) == 1.0
    combined_ev = ' '.join([e.get('text', '') for e in final_state.get('evidence', [])]).lower()
    assert 'task #1' in combined_ev or 'masked lm' in combined_ev
    assert 'task #2' in combined_ev or 'isnext' in combined_ev or 'next sentence prediction' in combined_ev

    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert ('masked language model' in lower_ans or 'masked lm' in lower_ans or 'mlm' in lower_ans)
    assert ('next sentence prediction' in lower_ans or 'nsp' in lower_ans)
    assert len(final_state.get('citations', [])) >= 2

def test_mlm_motivation_retrieval(bert_document):
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'Why does BERT use Masked Language Modeling instead of standard language modeling?',
        'original_query': 'Why does BERT use Masked Language Modeling instead of standard language modeling?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('confidence', 0.0) >= 0.80
    combined_ev = ' '.join([e.get('text', '') for e in final_state.get('evidence', [])]).lower()
    assert 'see itself' in combined_ev or 'unidirectional' in combined_ev or 'left-to-right' in combined_ev
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'unidirectional' in lower_ans or 'see itself' in lower_ans or 'left-to-right' in lower_ans

def test_no_nsp_ablation_retrieval(bert_document):
\
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What happens when Next Sentence Prediction is removed from BERT?',
        'original_query': 'What happens when Next Sentence Prediction is removed from BERT?',
        'current_document_ids': [bert_document.document_id],
        'metadata': {
            'allowed_document_ids': [bert_document.document_id],
            'document_id': bert_document.document_id
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('confidence', 0.0) >= 0.80
    combined_ev = ' '.join([e.get('text', '') for e in final_state.get('evidence', [])]).lower()
    assert 'no nsp' in combined_ev or 'table 5' in combined_ev or 'effect of the pre-training tasks' in combined_ev
    answer = final_state.get('answer', '')
    lower_ans = answer.lower()
    assert 'no nsp' in lower_ans or 'qnli' in lower_ans or 'sentence-pair' in lower_ans or 'sentence pair' in lower_ans

def test_no_document_hard_blocking():
\
\
\
\

    graph = get_research_graph()
    initial_state = {
        'query': 'What is BERT?',
        'original_query': 'What is BERT?',
        'current_document_ids': [],
        'metadata': {
            'allowed_document_ids': []
        }
    }
    final_state = graph.invoke(initial_state)

    assert final_state.get('grounding_status') == 'BLOCKED'
    assert final_state.get('confidence', 1.0) == 0.0
    assert len(final_state.get('evidence', [])) == 0
    assert len(final_state.get('citations', [])) == 0
    answer = final_state.get('answer', '')
    assert "No document is currently selected. Please upload a document before asking questions." in answer

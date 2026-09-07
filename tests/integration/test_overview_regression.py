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

def test_bert_overview_regression(bert_document):
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

    assert final_state.get('query_intent') == 'overview', f"Expected intent 'overview', got {final_state.get('query_intent')}"

    assert final_state.get('confidence', 0.0) >= 0.80, f"Expected confidence >= 0.80, got {final_state.get('confidence')}"

    citations = final_state.get('citations', [])
    assert len(citations) >= 2, f"Expected at least 2 citations, got {len(citations)}"
    citation_pages = {c.get('page_number') for c in citations}
    assert 1 in citation_pages, f"Expected citations to include Page 1 (Abstract/Intro), got pages {citation_pages}"
    citation_sections = {str(c.get('section_name', '')).lower() for c in citations}
    assert any('abstract' in s or 'intro' in s for s in citation_sections), f"Expected Abstract or Intro in citations, got {citation_sections}"

    answer = final_state.get('answer', '')
    assert len(answer) > 0, "Answer should not be empty"
    assert "### 1. Problem Addressed" in answer, "Missing '### 1. Problem Addressed'"
    assert "### 2. Proposed Solution" in answer, "Missing '### 2. Proposed Solution'"
    assert "### 3. High-Level Technical Mechanism" in answer, "Missing '### 3. High-Level Technical Mechanism'"
    assert "### 4. Key Contributions & Empirical Findings" in answer, "Missing '### 4. Key Contributions & Empirical Findings'"

    assert not answer.strip().startswith("word based only on its context"), "Regression: answer started with broken fragment"
    assert "word based only on its context" not in answer.lower()[:80], "Regression: broken fragment found near answer start"

    lower_ans = answer.lower()
    assert 'bert' in lower_ans, "Expected 'BERT' in answer"
    assert ('bidirectional encoder representations from transformers' in lower_ans or 'bidirectional' in lower_ans), "Expected bidirectional in answer"
    assert ('masked language model' in lower_ans or 'mlm' in lower_ans), "Expected MLM in answer"
    assert ('pre-train' in lower_ans or 'pre-training' in lower_ans), "Expected pre-training in answer"
    assert ('fine-tun' in lower_ans or 'fine-tuning' in lower_ans), "Expected fine-tuning in answer"

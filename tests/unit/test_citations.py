from app.agent.nodes.citation import citation_node

def test_citation_node_mapping():
    evidence = [{'chunk_id': 'c1', 'text': 'Speculative decoding leverages a draft model.', 'rerank_score': 0.95, 'metadata': {'document_title': 'Speculative Decoding', 'filename': 'spec.pdf', 'page_number': 3, 'section_title': 'Methodology'}}, {'chunk_id': 'c2', 'text': 'Medusa decoding uses tree attention.', 'rerank_score': 0.9, 'metadata': {'document_title': 'Medusa Decoding', 'filename': 'medusa.pdf', 'page_number': 4, 'section_title': 'Architecture'}}]
    answer = 'Speculative decoding uses a draft model [1], while Medusa uses tree attention [2].'
    state = {'answer': answer, 'evidence': evidence, 'execution_trace': [], 'latency': {}}
    res = citation_node(state)
    citations = res['citations']
    assert len(citations) == 2
    assert citations[0]['citation_index'] == 1
    assert citations[0]['document_title'] == 'Speculative Decoding'
    assert citations[0]['page_number'] == 3
    assert citations[1]['citation_index'] == 2
    assert citations[1]['document_title'] == 'Medusa Decoding'

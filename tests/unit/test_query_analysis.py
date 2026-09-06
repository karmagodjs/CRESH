from app.agent.nodes.query_analysis import query_analysis_node
from app.agent.nodes.decomposition import decomposition_node

def test_query_analysis_factual():
    state = {'query': 'What is FlashAttention?', 'execution_trace': [], 'latency': {}, 'token_usage': {}}
    res = query_analysis_node(state)
    assert 'query_type' in res
    assert 'Query Analysis' in res['execution_trace']

def test_query_decomposition():
    state = {'query': 'Compare speculative decoding and Medusa decoding latency characteristics.', 'query_type': 'comparative', 'execution_trace': [], 'latency': {}, 'token_usage': {}}
    res = decomposition_node(state)
    assert len(res['sub_questions']) >= 1
    assert 'Query Decomposition' in res['execution_trace']

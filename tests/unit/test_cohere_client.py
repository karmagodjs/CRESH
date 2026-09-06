from app.models.cohere_client import CohereClient

def test_cohere_client_embeddings(mock_cohere_client: CohereClient):
    texts = ['Speculative decoding draft model', 'FlashAttention memory efficiency']
    embeddings = mock_cohere_client.embed(texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 1024
    assert len(embeddings[1]) == 1024

def test_cohere_client_reranking(mock_cohere_client: CohereClient):
    query = 'Medusa decoding heads'
    docs = ['Speculative decoding utilizes a draft model.', 'Medusa decoding attaches multiple heads to LLM backbone.', 'FlashAttention optimizes GPU SRAM tiling.']
    reranked = mock_cohere_client.rerank(query=query, documents=docs, top_n=2)
    assert len(reranked) == 2
    assert reranked[0].relevance_score >= reranked[1].relevance_score
    assert reranked[0].index == 1

def test_cohere_client_generation(mock_cohere_client: CohereClient):
    prompt = 'Summarize the findings.'
    res = mock_cohere_client.generate(prompt=prompt)
    assert len(res.text) > 20
    assert res.prompt_tokens > 0
    assert res.estimated_cost_usd >= 0.0

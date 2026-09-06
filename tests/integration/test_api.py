from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'healthy'
    assert 'version' in data
    assert 'vector_store_health' in data

def test_metrics_endpoint():
    response = client.get('/metrics')
    assert response.status_code == 200
    data = response.json()
    assert 'total_queries' in data
    assert 'average_latency_ms' in data

def test_documents_upload_and_query_flow():
    sample_content = b'# FlashAttention IO Optimization\n\n## Abstract\nFlashAttention optimizes GPU SRAM tiling and avoids quadratic HBM reads.'
    files = {'file': ('flash_test.txt', sample_content, 'text/plain')}
    upload_res = client.post('/documents/upload', files=files)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    doc_id = doc_data['document_id']
    assert doc_data['title'] == 'FlashAttention IO Optimization'
    list_res = client.get('/documents')
    assert list_res.status_code == 200
    assert any((d['document_id'] == doc_id for d in list_res.json()['documents']))
    query_payload = {'query': 'How does FlashAttention optimize GPU SRAM tiling?', 'top_k': 5, 'rerank_top_k': 2}
    query_res = client.post('/query', json=query_payload)
    assert query_res.status_code == 200
    query_data = query_res.json()
    assert len(query_data['answer']) > 0
    assert 'latency_breakdown' in query_data
    del_res = client.delete(f'/documents/{doc_id}')
    assert del_res.status_code == 200

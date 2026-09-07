from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_health_endpoint():
    resp = client.get('/health')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'healthy'
    assert 'version' in data
    assert 'vector_store_health' in data
    assert 'total_indexed_chunks' in data

def test_get_ready_endpoint():
    resp = client.get('/ready')
    assert resp.status_code == 200
    data = resp.json()
    assert data['status'] == 'ready'
    assert 'dependencies' in data
    assert data['dependencies']['configuration'] == 'valid'
    assert 'vector_store' in data['dependencies']

def test_get_metrics_endpoint_percentiles():
    resp = client.get('/metrics')
    assert resp.status_code == 200
    data = resp.json()
    assert 'total_queries' in data
    assert 'average_latency_ms' in data
    assert 'latency_percentiles' in data
    assert 'model_accounting' in data

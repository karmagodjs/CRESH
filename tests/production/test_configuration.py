import pytest
from pydantic import ValidationError
from app.config import Settings

def test_configuration_validation_success():
    settings = Settings()

    settings.validate_configuration()

def test_configuration_validation_invalid_chunk_size():
    settings = Settings(CHUNK_SIZE=0)
    with pytest.raises(ValueError) as exc_info:
        settings.validate_configuration()
    assert "CHUNK_SIZE must be greater than 0" in str(exc_info.value)

def test_configuration_validation_invalid_overlap():
    settings = Settings(CHUNK_SIZE=512, CHUNK_OVERLAP=600)
    with pytest.raises(ValueError) as exc_info:
        settings.validate_configuration()
    assert "CHUNK_OVERLAP" in str(exc_info.value)

def test_safe_configuration_redaction():
    settings = Settings(COHERE_API_KEY="co_sensitive_test_key_1234567890")
    safe = settings.get_safe_dict()
    assert "co_sensitive_test_key" not in safe["COHERE_API_KEY"]
    assert safe["COHERE_API_KEY"] == "[REDACTED_SECRET]"

def test_query_length_resource_limit():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    long_query = "What is BERT? " * 300
    resp = client.post('/query', json={"query": long_query})
    assert resp.status_code == 400 or resp.status_code == 422

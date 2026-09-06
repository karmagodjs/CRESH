import time
import pytest
from app.models.cohere_client import CohereClient, _is_retryable_error


def test_is_retryable_error_classification():
    # Fast fail errors (non-retryable)
    class AuthError(Exception):
        status_code = 401
    assert _is_retryable_error(AuthError("Unauthorized API key")) is False

    class ForbiddenError(Exception):
        status_code = 403
    assert _is_retryable_error(ForbiddenError("Access forbidden")) is False

    class BadRequestError(Exception):
        status_code = 400
    assert _is_retryable_error(BadRequestError("Bad request: invalid parameters")) is False

    # Retryable transient errors
    class RateLimitError(Exception):
        status_code = 429
    assert _is_retryable_error(RateLimitError("Rate limit exceeded")) is True

    class ServerError(Exception):
        status_code = 503
    assert _is_retryable_error(ServerError("Service temporarily unavailable")) is True

    class NetworkTimeoutError(Exception):
        pass
    assert _is_retryable_error(NetworkTimeoutError("Connection timed out")) is True


def test_cohere_client_retry_and_backoff():
    client = CohereClient(api_key="mock")
    call_counts = {"attempts": 0}

    def flaky_func():
        call_counts["attempts"] += 1
        if call_counts["attempts"] < 2:
            class TransientErr(Exception):
                status_code = 429
            raise TransientErr("Simulated rate limit")
        return "recovered_success"

    res, retries = client._call_with_retry("test_op", "test_model", flaky_func)
    assert res == "recovered_success"
    assert retries == 1
    assert call_counts["attempts"] == 2


def test_cohere_client_fast_fail_on_auth_error():
    client = CohereClient(api_key="mock")

    def fatal_auth_func():
        class AuthErr(Exception):
            status_code = 401
        raise AuthErr("Invalid API key")

    with pytest.raises(Exception) as exc_info:
        client._call_with_retry("auth_op", "test_model", fatal_auth_func)
    assert "Invalid API key" in str(exc_info.value)


def test_cohere_client_safe_fallback_on_rerank_failure():
    client = CohereClient(api_key="mock")
    # Even if an external rerank call fails, client provides safe fallback
    results = client.rerank(query="BERT pretraining", documents=["Doc 1 text", "Doc 2 text"])
    assert len(results) == 2
    assert results[0].relevance_score > 0.0


def test_cohere_client_safe_fallback_on_embed_failure():
    client = CohereClient(api_key="mock")
    vecs = client.embed(texts=["Test sentence"])
    assert len(vecs) == 1
    assert len(vecs[0]) == 1024

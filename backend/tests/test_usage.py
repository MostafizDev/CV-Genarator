from datetime import datetime, timedelta, timezone

import httpx
import pytest

from services import usage
from tests.test_api import _client_as, setup_db  # noqa: F401  (setup_db is the autouse DB reset fixture)


@pytest.fixture(autouse=True)
def clear_cache():
    usage._cache.clear()
    yield
    usage._cache.clear()


def mock_client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def respond(status=200, headers=None, json=None):
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(status, headers=headers or {}, json=json if json is not None else {})

    handler.calls = calls
    return handler


GROQ_HEADERS = {
    "x-ratelimit-limit-requests": "14400",
    "x-ratelimit-remaining-requests": "14350",
    "x-ratelimit-reset-requests": "2m59.5s",
    "x-ratelimit-limit-tokens": "8000",
    "x-ratelimit-remaining-tokens": "7990",
    "x-ratelimit-reset-tokens": "1.25s",
}


def test_parse_duration_seconds():
    assert usage.parse_duration_seconds("1m30.5s") == 90.5
    assert usage.parse_duration_seconds("6m0s") == 360
    assert usage.parse_duration_seconds("20ms") == pytest.approx(0.02)
    assert usage.parse_duration_seconds("2h3m") == 2 * 3600 + 180
    assert usage.parse_duration_seconds("soon") is None
    assert usage.parse_duration_seconds("") is None
    assert usage.parse_duration_seconds(None) is None


def test_groq_reports_daily_requests_and_per_minute_tokens():
    handler = respond(headers=GROQ_HEADERS)
    result = usage.check_usage("u", "groq", "gsk_key", "openai/gpt-oss-120b", client=mock_client(handler))
    assert result.status == "healthy"
    by_id = {m.id: m for m in result.meters}
    assert (by_id["requests"].label, by_id["requests"].limit, by_id["requests"].remaining) == ("Requests per day", 14400, 14350)
    assert by_id["requests"].resets_in_seconds == 179.5
    assert (by_id["tokens"].label, by_id["tokens"].limit, by_id["tokens"].remaining) == ("Tokens per minute", 8000, 7990)
    # One minimal request with the saved model, sent with the user's key.
    request = handler.calls[0]
    assert request.headers["authorization"] == "Bearer gsk_key"
    assert b'"max_tokens":1' in request.content and b"gpt-oss-120b" in request.content
    assert "gsk_key" not in result.model_dump_json()


def test_status_low_when_a_meter_is_nearly_used_up_and_limited_at_zero():
    low = {**GROQ_HEADERS, "x-ratelimit-remaining-requests": "500"}  # 3.5% left
    assert usage.check_usage("u", "groq", "k1", "m", client=mock_client(respond(headers=low))).status == "low"
    empty = {**GROQ_HEADERS, "x-ratelimit-remaining-tokens": "0"}
    assert usage.check_usage("u", "groq", "k2", "m", client=mock_client(respond(headers=empty))).status == "limited"


def test_429_is_limited_but_still_shows_the_meters():
    result = usage.check_usage("u", "groq", "k", "m", client=mock_client(respond(429, {**GROQ_HEADERS, "x-ratelimit-remaining-requests": "0"})))
    assert result.status == "limited" and result.meters


def test_rejected_key_and_provider_errors():
    invalid = usage.check_usage("u", "openai", "bad", "gpt-4o-mini", client=mock_client(respond(401, json={"error": {"message": "Incorrect API key provided: sk-abc***"}})))
    assert invalid.status == "invalid_key"
    assert "sk-abc" not in invalid.message  # provider text (which can echo key fragments) is never surfaced on 401

    long_message = "x" * 500
    error = usage.check_usage("u", "openai", "k", "nope", client=mock_client(respond(404, json={"error": {"message": long_message}})))
    assert error.status == "error" and len(error.message) <= 200


def test_openai_uses_per_minute_labels_and_max_completion_tokens():
    handler = respond(headers={k.replace("2m59.5s", "6m0s"): v for k, v in GROQ_HEADERS.items()})
    result = usage.check_usage("u", "openai", "sk-x", "gpt-4o-mini", client=mock_client(handler))
    assert {m.label for m in result.meters} == {"Requests per minute", "Tokens per minute"}
    assert b"max_completion_tokens" in handler.calls[0].content


def test_anthropic_reads_its_own_headers_and_reset_timestamps():
    reset = (datetime.now(timezone.utc) + timedelta(seconds=45)).isoformat().replace("+00:00", "Z")
    headers = {
        "anthropic-ratelimit-requests-limit": "50",
        "anthropic-ratelimit-requests-remaining": "49",
        "anthropic-ratelimit-requests-reset": reset,
        "anthropic-ratelimit-tokens-limit": "40000",
        "anthropic-ratelimit-tokens-remaining": "39990",
        "anthropic-ratelimit-tokens-reset": reset,
    }
    handler = respond(headers=headers)
    result = usage.check_usage("u", "anthropic", "sk-ant-x", "claude-sonnet-5", client=mock_client(handler))
    assert result.status == "healthy" and len(result.meters) == 2
    assert 30 < result.meters[0].resets_in_seconds <= 45
    assert handler.calls[0].headers["x-api-key"] == "sk-ant-x" and handler.calls[0].headers["anthropic-version"]


def test_deepseek_reports_balance_not_meters():
    body = {"is_available": True, "balance_infos": [{"currency": "USD", "total_balance": "12.34", "granted_balance": "2.00", "topped_up_balance": "10.34"}]}
    result = usage.check_usage("u", "deepseek", "sk-d", "deepseek-chat", client=mock_client(respond(json=body)))
    assert result.status == "healthy" and result.meters == []
    assert (result.balance.currency, result.balance.total, result.balance.granted, result.balance.topped_up) == ("USD", "12.34", "2.00", "10.34")

    empty = usage.check_usage("u", "deepseek", "sk-d2", "deepseek-chat", client=mock_client(respond(json={**body, "is_available": False})))
    assert empty.status == "limited"


def test_gemini_only_reports_health_and_says_why():
    ok = usage.check_usage("u", "gemini", "AIza-x", "gemini-1.5-flash", client=mock_client(respond(json={"models": []})))
    assert ok.status == "healthy" and ok.meters == [] and "AI Studio" in ok.note
    bad = usage.check_usage("u", "gemini", "AIza-bad", "gemini-1.5-flash", client=mock_client(respond(400, json={"error": {"message": "API key not valid"}})))
    assert bad.status == "invalid_key"


def test_network_problems_become_a_friendly_error_and_are_not_cached():
    def boom(request):
        raise httpx.ConnectTimeout("slow", request=request)

    result = usage.check_usage("u", "groq", "k", "m", client=mock_client(boom))
    assert result.status == "error" and "too long" in result.message

    handler = respond(headers=GROQ_HEADERS)
    assert usage.check_usage("u", "groq", "k", "m", client=mock_client(handler)).status == "healthy"


def test_results_are_briefly_cached_so_page_reloads_do_not_spend_requests():
    handler = respond(headers=GROQ_HEADERS)
    client = mock_client(handler)
    usage.check_usage("u", "groq", "k", "m", client=client)
    usage.check_usage("u", "groq", "k", "m", client=client)
    assert len(handler.calls) == 1
    usage.invalidate("u", "groq")
    usage.check_usage("u", "groq", "k", "m", client=client)
    assert len(handler.calls) == 2


def test_no_key_makes_no_request():
    handler = respond()
    assert usage.check_usage("u", "groq", "", "m", client=mock_client(handler)).status == "no_key"
    assert handler.calls == []


# --- the HTTP endpoint ----------------------------------------------------------

def test_usage_endpoint_uses_the_saved_key_server_side_and_never_returns_it(monkeypatch):
    client = _client_as("usage-user")
    assert client.get("/api/settings/groq/usage").json()["status"] == "no_key"
    assert client.get("/api/settings/nonsense/usage").status_code == 404

    client.post("/api/settings", json={"provider": "groq", "api_key": "gsk_SAVED_KEY_777", "model": "openai/gpt-oss-120b", "is_default": True})
    handler = respond(headers=GROQ_HEADERS)
    monkeypatch.setattr(usage, "make_client", lambda: mock_client(handler))

    res = client.get("/api/settings/groq/usage")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy" and {m["id"] for m in body["meters"]} == {"requests", "tokens"}
    assert "gsk_SAVED_KEY_777" not in res.text
    assert handler.calls[0].headers["authorization"] == "Bearer gsk_SAVED_KEY_777"


def test_usage_endpoint_requires_sign_in():
    from fastapi.testclient import TestClient
    from tests.test_api import app

    assert TestClient(app).get("/api/settings/groq/usage").status_code == 401


def test_unexpected_provider_response_shapes_become_a_friendly_error():
    result = usage.check_usage("u", "deepseek", "sk-d", "m", client=mock_client(respond(json=["not", "a", "dict"])))
    assert result.status == "error"

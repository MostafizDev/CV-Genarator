import httpx
import pytest

from services import model_catalog as catalog, usage
from tests.test_api import _client_as, setup_db  # noqa: F401  (setup_db is the autouse DB reset fixture)


@pytest.fixture(autouse=True)
def clear_cache():
    catalog._cache.clear()
    yield
    catalog._cache.clear()


def client_returning(status=200, json=None):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(status, json=json if json is not None else {})

    c = httpx.Client(transport=httpx.MockTransport(handler))
    c.calls = calls
    return c


def data(*ids):
    return {"data": [{"id": i} for i in ids]}


def test_openai_keeps_only_chat_models_and_hides_dated_snapshots():
    ids = [
        "gpt-4o", "gpt-4o-2024-08-06", "gpt-4o-mini", "gpt-4o-mini-2024-07-18", "o3-mini", "o1",
        "text-embedding-3-small", "whisper-1", "tts-1", "dall-e-3", "gpt-4o-audio-preview", "gpt-4o-realtime-preview",
        "omni-moderation-latest", "gpt-3.5-turbo-instruct", "davinci-002", "gpt-image-1",
    ]
    result = catalog.list_models("u", "openai", "sk-x", client=client_returning(json=data(*ids)))
    assert result.status == "ok"
    assert result.models == ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"]


def test_snapshot_kept_when_no_alias_exists():
    assert catalog.hide_dated_snapshots(["gpt-4-0613", "gpt-4", "claude-haiku-4-5-20251001"]) == ["gpt-4", "claude-haiku-4-5-20251001"]


def test_groq_drops_speech_and_guard_models_and_inactive_ones():
    body = {"data": [
        {"id": "openai/gpt-oss-120b", "active": True}, {"id": "llama-3.3-70b-versatile", "active": True},
        {"id": "whisper-large-v3", "active": True}, {"id": "playai-tts", "active": True},
        {"id": "meta-llama/llama-guard-4-12b", "active": True}, {"id": "old-model", "active": False},
    ]}
    result = catalog.list_models("u", "groq", "gsk", client=client_returning(json=body))
    assert result.models == ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]


def test_anthropic_keeps_claude_models_in_the_providers_newest_first_order():
    body = data("claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001")
    c = client_returning(json=body)
    result = catalog.list_models("u", "anthropic", "sk-ant-x", client=c)
    assert result.models == ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"]
    assert c.calls[0].headers["x-api-key"] == "sk-ant-x" and c.calls[0].headers["anthropic-version"]


def test_gemini_needs_generate_content_and_strips_the_models_prefix():
    body = {"models": [
        {"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent", "countTokens"]},
        {"name": "models/gemini-1.5-pro", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/text-embedding-004", "supportedGenerationMethods": ["embedContent"]},
        {"name": "models/gemini-embedding-001", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/aqa", "supportedGenerationMethods": ["generateAnswer"]},
    ]}
    c = client_returning(json=body)
    assert catalog.list_models("u", "gemini", "AIza", client=c).models == ["gemini-1.5-flash", "gemini-1.5-pro"]
    assert c.calls[0].headers["x-goog-api-key"] == "AIza"
    assert "AIza" not in str(c.calls[0].url)  # the key goes in a header, never the URL


def test_deepseek_lists_its_models():
    result = catalog.list_models("u", "deepseek", "sk-d", client=client_returning(json=data("deepseek-reasoner", "deepseek-chat")))
    assert result.models == ["deepseek-chat", "deepseek-reasoner"]


def test_rejected_key_provider_error_and_network_failure():
    assert catalog.list_models("u", "openai", "bad", client=client_returning(401, {"error": {"message": "Incorrect API key sk-abc"}})).status == "invalid_key"
    assert "sk-abc" not in catalog.list_models("u", "openai", "bad2", client=client_returning(401)).message
    assert catalog.list_models("u", "gemini", "bad", client=client_returning(400)).status == "invalid_key"

    error = catalog.list_models("u", "groq", "k", client=client_returning(500, {"error": {"message": "boom"}}))
    assert (error.status, error.message) == ("error", "boom")

    def down(request):
        raise httpx.ConnectError("no route", request=request)

    failed = catalog.list_models("u", "groq", "k2", client=httpx.Client(transport=httpx.MockTransport(down)))
    assert failed.status == "error" and failed.models == []

    weird = catalog.list_models("u", "openai", "k3", client=client_returning(200, ["not", "a", "dict"]))
    assert weird.status == "error"


def test_no_key_makes_no_request_and_results_are_cached_until_refreshed():
    c = client_returning(json=data("gpt-4o"))
    assert catalog.list_models("u", "openai", "", client=c).status == "no_key" and c.calls == []
    catalog.list_models("u", "openai", "sk-x", client=c)
    catalog.list_models("u", "openai", "sk-x", client=c)
    assert len(c.calls) == 1
    catalog.list_models("u", "openai", "sk-x", client=c, refresh=True)
    assert len(c.calls) == 2


def test_models_endpoint_uses_the_saved_key_and_falls_back_cleanly(monkeypatch):
    client = _client_as("models-user")
    assert client.get("/api/settings/models?provider=openai").json()["status"] == "no_key"
    assert client.get("/api/settings/models?provider=nonsense").status_code == 404
    # A key can no longer be supplied in the URL.
    assert client.get("/api/settings/models?provider=openai&api_key=sk-leaky").json()["status"] == "no_key"

    client.post("/api/settings", json={"provider": "openai", "api_key": "sk-SAVED-KEY-99", "model": "gpt-4o-mini", "is_default": True})
    seen = client_returning(json=data("gpt-4o", "gpt-4o-mini", "whisper-1"))
    monkeypatch.setattr(usage, "make_client", lambda: seen)
    res = client.get("/api/settings/models?provider=openai")
    assert res.json() == {"provider": "openai", "status": "ok", "models": ["gpt-4o", "gpt-4o-mini"], "message": ""}
    assert "sk-SAVED-KEY-99" not in res.text
    assert seen.calls[0].headers["authorization"] == "Bearer sk-SAVED-KEY-99"

    # Saving a different key drops the cached list.
    client.post("/api/settings", json={"provider": "openai", "api_key": "sk-NEW-KEY-2222", "model": "gpt-4o-mini", "is_default": True})
    assert catalog._cache == {}


def test_models_endpoint_requires_sign_in():
    from fastapi.testclient import TestClient
    from tests.test_api import app

    assert TestClient(app).get("/api/settings/models?provider=openai").status_code == 401

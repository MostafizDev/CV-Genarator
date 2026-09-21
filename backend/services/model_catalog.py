"""
Live list of models each provider offers the user's key, so the Settings page can suggest
what actually exists instead of a hardcoded list.

Each provider exposes a "list models" endpoint. Those lists also contain things we can't use
for writing a CV (embeddings, speech, image, moderation...), so they are filtered down to
text-generation models, and dated snapshots are hidden when a plain alias exists.
The API key stays on the server and is never returned or logged.
"""
import re
import time
from typing import Callable, Optional

import httpx

import schemas
from services import usage

_CACHE_TTL_SECONDS = 600.0
_cache: dict[tuple, tuple[float, schemas.ModelListResponse]] = {}


def invalidate(user_id: str, provider: str) -> None:
    for key in [k for k in _cache if k[0] == user_id and k[1] == provider]:
        _cache.pop(key, None)


# --- filtering ----------------------------------------------------------------

_DATED_SUFFIX = re.compile(r"-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4})$")


def hide_dated_snapshots(ids: list[str]) -> list[str]:
    """'gpt-4o-2024-08-06' is noise when 'gpt-4o' exists; keep it only if there's no alias."""
    present = set(ids)
    return [i for i in ids if not (_DATED_SUFFIX.search(i) and _DATED_SUFFIX.sub("", i) in present)]


def _excluding(ids, words):
    return [i for i in ids if not any(w in i.lower() for w in words)]


def _clean(ids) -> list[str]:
    seen, out = set(), []
    for i in ids:
        if isinstance(i, str) and i and i not in seen:
            seen.add(i)
            out.append(i)
    return out


_NOT_TEXT = ("embed", "whisper", "tts", "audio", "speech", "transcribe", "image", "moderation", "guard", "realtime", "dall-e", "orpheus", "vision-preview")


def _filter_openai(ids: list[str]) -> list[str]:
    chat = [i for i in ids if i.startswith(("gpt-", "chatgpt-", "o1", "o3", "o4"))]
    return sorted(hide_dated_snapshots(_excluding(chat, _NOT_TEXT + ("instruct", "search", "codex-mini"))))


# --- provider fetchers (each returns the raw model ids) ----------------------------

def _fetch_groq(client: httpx.Client, key: str):
    r = client.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {key}"})
    return r, lambda: sorted(
        hide_dated_snapshots(_excluding([m["id"] for m in r.json().get("data", []) if m.get("active", True)], _NOT_TEXT))
    )


def _fetch_openai(client: httpx.Client, key: str):
    r = client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
    return r, lambda: _filter_openai([m["id"] for m in r.json().get("data", [])])


def _fetch_anthropic(client: httpx.Client, key: str):
    r = client.get(
        "https://api.anthropic.com/v1/models",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        params={"limit": 1000},
    )
    # Anthropic returns newest first; keep that order.
    return r, lambda: hide_dated_snapshots([m["id"] for m in r.json().get("data", []) if m["id"].startswith("claude")])


def _fetch_gemini(client: httpx.Client, key: str):
    r = client.get(
        "https://generativelanguage.googleapis.com/v1beta/models",
        headers={"x-goog-api-key": key},
        params={"pageSize": 1000},
    )

    def parse():
        ids = [
            m["name"].removeprefix("models/")
            for m in r.json().get("models", [])
            if "generateContent" in m.get("supportedGenerationMethods", [])
        ]
        return hide_dated_snapshots(_excluding([i for i in ids if i.startswith(("gemini", "gemma"))], _NOT_TEXT))

    return r, parse


def _fetch_deepseek(client: httpx.Client, key: str):
    r = client.get("https://api.deepseek.com/models", headers={"Authorization": f"Bearer {key}"})
    return r, lambda: sorted(m["id"] for m in r.json().get("data", []))


_FETCHERS: dict[str, Callable] = {
    "groq": _fetch_groq,
    "openai": _fetch_openai,
    "anthropic": _fetch_anthropic,
    "gemini": _fetch_gemini,
    "deepseek": _fetch_deepseek,
}


def _result(provider, status, models=None, message="") -> schemas.ModelListResponse:
    return schemas.ModelListResponse(provider=provider, status=status, models=models or [], message=message)


def list_models(
    user_id: str,
    provider: str,
    api_key: str,
    client: Optional[httpx.Client] = None,
    refresh: bool = False,
) -> schemas.ModelListResponse:
    if not api_key:
        return _result(provider, "no_key", message="Save an API key to load your available models.")

    cache_key = (user_id, provider, api_key[-6:], len(api_key))
    cached = _cache.get(cache_key)
    if cached and not refresh and time.monotonic() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    def run(c: httpx.Client) -> schemas.ModelListResponse:
        response, parse = _FETCHERS[provider](c, api_key)
        if response.status_code in (401, 403) or (provider == "gemini" and response.status_code == 400):
            return _result(provider, "invalid_key", message="The provider rejected this API key.")
        if response.status_code != 200:
            return _result(provider, "error", message=usage._error_detail(response))
        return _result(provider, "ok", _clean(parse()))

    try:
        if client is not None:
            result = run(client)
        else:
            with usage.make_client() as owned:
                result = run(owned)
    except httpx.TimeoutException:
        return _result(provider, "error", message="The provider took too long to respond.")
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        return _result(provider, "error", message="Couldn't load models from the provider.")

    if result.status == "ok":
        _cache[cache_key] = (time.monotonic(), result)
    return result

"""
What each AI provider will tell us about a key's limits and health.

Providers differ a lot, and none offers a universal "tokens left this month" call for an
ordinary API key, so this reports what is genuinely available:

  Groq       rate-limit response headers: requests per day + tokens per minute
  OpenAI     rate-limit response headers: requests + tokens per minute
  Anthropic  rate-limit response headers: requests + tokens per minute
  DeepSeek   GET /user/balance (a real account balance; no fixed limit to draw a bar for)
  Gemini     nothing -- Google exposes quota only in its console, so only key health is shown

For the three header-based providers we send one tiny request (max 1 output token) with the
user's saved model, because the headers only come back on real completions. The API key
never leaves the server and is never included in results or logs.
"""
import re
import time
from datetime import datetime, timezone
from typing import Mapping, Optional

import httpx

import schemas

_TIMEOUT = httpx.Timeout(15.0, connect=8.0)
_CACHE_TTL_SECONDS = 20.0
_LOW_THRESHOLD = 0.15  # "running low" when a meter has under 15% left

_cache: dict[tuple, tuple[float, schemas.ProviderUsageResponse]] = {}


def make_client() -> httpx.Client:
    """Separate function so tests can substitute a mock transport."""
    return httpx.Client(timeout=_TIMEOUT)


def invalidate(user_id: str, provider: str) -> None:
    for key in [k for k in _cache if k[0] == user_id and k[1] == provider]:
        _cache.pop(key, None)


# --- parsing helpers ---------------------------------------------------------

_DURATION_PART = re.compile(r"(\d+(?:\.\d+)?)(ms|h|m|s)")
_UNIT_SECONDS = {"ms": 0.001, "s": 1.0, "m": 60.0, "h": 3600.0}


def parse_duration_seconds(text: Optional[str]) -> Optional[float]:
    """'1m30.5s' -> 90.5, '6m0s' -> 360, '20ms' -> 0.02. None if it isn't a duration."""
    if not text:
        return None
    parts = _DURATION_PART.findall(text.strip())
    if not parts or "".join(n + u for n, u in parts) != text.strip():
        return None
    return sum(float(n) * _UNIT_SECONDS[u] for n, u in parts)


def _seconds_until(timestamp: Optional[str]) -> Optional[float]:
    if not timestamp:
        return None
    try:
        when = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    return max(0.0, (when - datetime.now(timezone.utc)).total_seconds())


def _int(headers: Mapping[str, str], name: str) -> Optional[int]:
    try:
        return int(float(headers[name]))
    except (KeyError, ValueError):
        return None


def _meter(meter_id, label, limit, remaining, resets_in) -> Optional[schemas.UsageMeter]:
    if limit is None or remaining is None or limit <= 0:
        return None
    return schemas.UsageMeter(
        id=meter_id, label=label, limit=limit, remaining=max(0, remaining), resets_in_seconds=resets_in
    )


def _openai_style_meters(headers: Mapping[str, str], request_label: str) -> list[schemas.UsageMeter]:
    """Groq and OpenAI share the x-ratelimit-* header family."""
    found = [
        _meter(
            "requests", request_label,
            _int(headers, "x-ratelimit-limit-requests"), _int(headers, "x-ratelimit-remaining-requests"),
            parse_duration_seconds(headers.get("x-ratelimit-reset-requests")),
        ),
        _meter(
            "tokens", "Tokens per minute",
            _int(headers, "x-ratelimit-limit-tokens"), _int(headers, "x-ratelimit-remaining-tokens"),
            parse_duration_seconds(headers.get("x-ratelimit-reset-tokens")),
        ),
    ]
    return [m for m in found if m]


def _anthropic_meters(headers: Mapping[str, str]) -> list[schemas.UsageMeter]:
    prefix = "anthropic-ratelimit-"
    found = [
        _meter(
            "requests", "Requests per minute",
            _int(headers, prefix + "requests-limit"), _int(headers, prefix + "requests-remaining"),
            _seconds_until(headers.get(prefix + "requests-reset")),
        ),
        _meter(
            "tokens", "Tokens per minute",
            _int(headers, prefix + "tokens-limit"), _int(headers, prefix + "tokens-remaining"),
            _seconds_until(headers.get(prefix + "tokens-reset")),
        ),
    ]
    return [m for m in found if m]


def _error_detail(response: httpx.Response) -> str:
    """A short provider error message, never long and never containing the key (401s are
    handled before this and replaced with a fixed message)."""
    try:
        body = response.json()
        error = body.get("error", body) if isinstance(body, dict) else {}
        message = error.get("message") if isinstance(error, dict) else None
    except ValueError:
        message = None
    return (message or response.reason_phrase or f"HTTP {response.status_code}")[:200]


# --- result construction -------------------------------------------------------

def _result(provider: str, status: str, message: str, **extra) -> schemas.ProviderUsageResponse:
    return schemas.ProviderUsageResponse(
        provider=provider, status=status, message=message, checked_at=datetime.now(timezone.utc), **extra
    )


def _classify(provider: str, response: httpx.Response, meters: list[schemas.UsageMeter]) -> schemas.ProviderUsageResponse:
    code = response.status_code
    if code in (401, 403):
        return _result(provider, "invalid_key", "The provider rejected this API key.")
    if code == 429:
        return _result(provider, "limited", "Rate limit reached right now. Try again shortly.", meters=meters)
    if code >= 400:
        return _result(provider, "error", _error_detail(response), meters=meters)

    if any(m.remaining <= 0 for m in meters):
        return _result(provider, "limited", "A limit is used up for now.", meters=meters)
    if any(m.remaining / m.limit < _LOW_THRESHOLD for m in meters):
        return _result(provider, "low", "Running low on a limit.", meters=meters)
    return _result(provider, "healthy", "Key is valid and within its limits.", meters=meters)


# --- per-provider checks ----------------------------------------------------------

def _check_groq(client: httpx.Client, api_key: str, model: str):
    response = client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1},
    )
    # Groq's request limit is per day, its token limit per minute.
    return _classify("groq", response, _openai_style_meters(response.headers, "Requests per day"))


def _check_openai(client: httpx.Client, api_key: str, model: str):
    response = client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "messages": [{"role": "user", "content": "hi"}], "max_completion_tokens": 1},
    )
    return _classify("openai", response, _openai_style_meters(response.headers, "Requests per minute"))


def _check_anthropic(client: httpx.Client, api_key: str, model: str):
    response = client.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        json={"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]},
    )
    return _classify("anthropic", response, _anthropic_meters(response.headers))


def _check_deepseek(client: httpx.Client, api_key: str, model: str):
    response = client.get("https://api.deepseek.com/user/balance", headers={"Authorization": f"Bearer {api_key}"})
    if response.status_code != 200:
        return _classify("deepseek", response, [])
    data = response.json()
    infos = data.get("balance_infos") or []
    balance = None
    if infos:
        info = infos[0]
        balance = schemas.UsageBalance(
            currency=str(info.get("currency", "")),
            total=str(info.get("total_balance", "0")),
            granted=str(info.get("granted_balance", "0")),
            topped_up=str(info.get("topped_up_balance", "0")),
        )
    if data.get("is_available") is False:
        return _result("deepseek", "limited", "Balance is too low to make requests.", balance=balance)
    return _result("deepseek", "healthy", "Key is valid and the account has balance.", balance=balance)


def _check_gemini(client: httpx.Client, api_key: str, model: str):
    response = client.get(
        "https://generativelanguage.googleapis.com/v1beta/models", headers={"x-goog-api-key": api_key}
    )
    if response.status_code in (400, 401, 403):
        return _result("gemini", "invalid_key", "Google rejected this API key.")
    result = _classify("gemini", response, [])
    result.note = "Google doesn't report remaining quota through its API. Check usage in Google AI Studio."
    return result


_CHECKS = {
    "groq": _check_groq,
    "openai": _check_openai,
    "anthropic": _check_anthropic,
    "deepseek": _check_deepseek,
    "gemini": _check_gemini,
}


def check_usage(
    user_id: str, provider: str, api_key: str, model: str, client: Optional[httpx.Client] = None
) -> schemas.ProviderUsageResponse:
    if not api_key:
        return _result(provider, "no_key", "Save an API key to see its usage.")

    cache_key = (user_id, provider, model, api_key[-6:], len(api_key))
    cached = _cache.get(cache_key)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    try:
        if client is not None:
            result = _CHECKS[provider](client, api_key, model)
        else:
            with make_client() as owned:
                result = _CHECKS[provider](owned, api_key, model)
    except httpx.TimeoutException:
        return _result(provider, "error", "The provider took too long to respond.")
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        return _result(provider, "error", "Couldn't reach the provider. Check your connection and try again.")

    if result.status != "error":
        _cache[cache_key] = (time.monotonic(), result)
    return result

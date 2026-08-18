from typing import NamedTuple, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
import models
from services.ai.base import AiProvider
from services.ai.openai_provider import OpenAiProvider
from services.ai.groq_provider import GroqProvider
from services.ai.claude_provider import ClaudeProvider
from services.ai.gemini_provider import GeminiProvider
from services.ai.deepseek_provider import DeepSeekProvider

SUPPORTED_PROVIDERS = ("openai", "groq", "anthropic", "gemini", "deepseek")


def _build_provider(provider_name: str, api_key: str, model: str) -> AiProvider:
    if provider_name == "openai":
        return OpenAiProvider(api_key=api_key, model=model)
    elif provider_name == "groq":
        return GroqProvider(api_key=api_key, model=model)
    elif provider_name == "anthropic":
        return ClaudeProvider(api_key=api_key, model=model)
    elif provider_name == "gemini":
        return GeminiProvider(api_key=api_key, model=model)
    elif provider_name == "deepseek":
        return DeepSeekProvider(api_key=api_key, model=model)

    raise HTTPException(
        status_code=400,
        detail=f"Provider '{provider_name}' is not currently supported.",
    )


class ResolvedProvider(NamedTuple):
    provider: AiProvider
    provider_name: str
    model: str


def get_provider(db: Session, user_id: int, provider_override: Optional[str] = None) -> ResolvedProvider:
    """
    Loads this user's ProviderSetting from DB and returns the initialized AiProvider
    along with which provider/model were actually resolved. If provider_override is
    given, uses that provider's saved settings instead of the user's default.
    """
    base_query = db.query(models.ProviderSetting).filter(models.ProviderSetting.user_id == user_id)

    if provider_override:
        provider_name = provider_override.lower().strip()
        setting = base_query.filter(models.ProviderSetting.provider == provider_name).first()
        if not setting or not setting.api_key or not setting.api_key.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider_name}' has no API key configured. Please add one in Settings.",
            )
    else:
        setting = base_query.filter(models.ProviderSetting.is_default == True).first()
        if not setting:
            # Fallback to the first available setting if none is marked default
            setting = base_query.first()

        if not setting or not setting.api_key or not setting.api_key.strip():
            raise HTTPException(
                status_code=400,
                detail="No active AI provider configured or API key is missing. Please configure a provider in the Settings page.",
            )

    provider_name = setting.provider.lower().strip()
    provider = _build_provider(provider_name, setting.api_key, setting.model)
    return ResolvedProvider(provider=provider, provider_name=provider_name, model=setting.model)


def get_provider_for_test(provider_name: str, api_key: str, model: str) -> AiProvider:
    """Builds a provider instance directly from given credentials, for a connection test."""
    return _build_provider(provider_name.lower().strip(), api_key, model)

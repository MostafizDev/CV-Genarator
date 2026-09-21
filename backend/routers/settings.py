from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from openai import OpenAI
from groq import Groq
from core.firebase_auth import get_current_user
from services import model_catalog, usage as usage_service

DEFAULT_MODELS = {
    "groq": "openai/gpt-oss-120b",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-5",
    "gemini": "gemini-1.5-flash",
    "deepseek": "deepseek-chat",
}

router = APIRouter(prefix="/api/settings", tags=["Settings"])


def _public_setting(setting: models.ProviderSetting) -> schemas.ProviderSettingSchema:
    """Never expose the stored API key -- only that one exists and its last four characters."""
    key = (setting.api_key or "").strip()
    return schemas.ProviderSettingSchema(
        id=setting.id,
        provider=setting.provider,
        has_api_key=bool(key),
        api_key_hint=f"••••{key[-4:]}" if len(key) >= 8 else ("••••" if key else ""),
        model=setting.model,
        is_default=setting.is_default,
    )


@router.get("", response_model=List[schemas.ProviderSettingSchema])
def get_settings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    settings = db.query(models.ProviderSetting).filter(models.ProviderSetting.user_id == current_user.id).all()
    if not settings:
        # Provide default Groq setting
        default_setting = models.ProviderSetting(
            user_id=current_user.id,
            provider="groq",
            api_key="",
            model="openai/gpt-oss-120b",
            is_default=True,
        )
        db.add(default_setting)
        db.commit()
        db.refresh(default_setting)
        return [_public_setting(default_setting)]
    return [_public_setting(s) for s in settings]


@router.get("/models", response_model=schemas.ModelListResponse)
def get_available_models(
    provider: str = Query(..., description="AI provider, e.g. groq, openai, anthropic, gemini, deepseek"),
    refresh: bool = Query(False, description="Skip the short server-side cache"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Models the provider offers this user's saved key. Uses the saved key only -- an API key
    must never travel in a URL (query strings end up in access logs and browser history)."""
    provider_name = provider.lower().strip()
    if provider_name not in DEFAULT_MODELS:
        raise HTTPException(status_code=404, detail=f"Unknown provider '{provider_name}'.")

    saved = (
        db.query(models.ProviderSetting)
        .filter(
            models.ProviderSetting.user_id == current_user.id,
            models.ProviderSetting.provider == provider_name,
        )
        .first()
    )
    api_key = (saved.api_key or "").strip() if saved else ""
    return model_catalog.list_models(current_user.id, provider_name, api_key, refresh=refresh)


@router.post("", response_model=schemas.ProviderSettingSchema)
def save_setting(
    data: schemas.ProviderSettingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    provider_name = data.provider.lower().strip()
    default_model = DEFAULT_MODELS.get(provider_name, "gpt-4o-mini")

    setting = (
        db.query(models.ProviderSetting)
        .filter(
            models.ProviderSetting.user_id == current_user.id,
            models.ProviderSetting.provider == provider_name,
        )
        .first()
    )

    if data.is_default:
        # Unset default on all of this user's other provider settings
        db.query(models.ProviderSetting).filter(models.ProviderSetting.user_id == current_user.id).update(
            {models.ProviderSetting.is_default: False}
        )

    new_key = data.api_key.strip()

    if not setting:
        setting = models.ProviderSetting(
            user_id=current_user.id,
            provider=provider_name,
            api_key=new_key,
            model=data.model.strip() or default_model,
            is_default=data.is_default,
        )
        db.add(setting)
    else:
        if new_key:
            setting.api_key = new_key
        setting.model = data.model.strip() or default_model
        setting.is_default = data.is_default

    db.commit()
    db.refresh(setting)
    usage_service.invalidate(current_user.id, provider_name)
    model_catalog.invalidate(current_user.id, provider_name)
    return _public_setting(setting)


def _test_provider_key(provider_name: str, api_key: str, model: str) -> None:
    """Makes a minimal, low-cost call to confirm an API key is valid. Raises on failure."""
    if provider_name == "openai":
        OpenAI(api_key=api_key).models.list()
    elif provider_name == "groq":
        Groq(api_key=api_key).models.list()
    elif provider_name == "deepseek":
        from services.ai.deepseek_provider import DEEPSEEK_BASE_URL

        OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL).models.list()
    elif provider_name == "anthropic":
        from anthropic import Anthropic

        Anthropic(api_key=api_key).models.list()
    elif provider_name == "gemini":
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        next(iter(genai.list_models()), None)
    else:
        raise ValueError(f"Provider '{provider_name}' is not currently supported.")


@router.get("/{provider}/usage", response_model=schemas.ProviderUsageResponse)
def get_provider_usage(
    provider: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Limits/balance/health for the user's saved key. The key is used server-side only."""
    provider_name = provider.lower().strip()
    if provider_name not in DEFAULT_MODELS:
        raise HTTPException(status_code=404, detail=f"Unknown provider '{provider_name}'.")

    saved = (
        db.query(models.ProviderSetting)
        .filter(
            models.ProviderSetting.user_id == current_user.id,
            models.ProviderSetting.provider == provider_name,
        )
        .first()
    )
    api_key = (saved.api_key or "").strip() if saved else ""
    model = (saved.model if saved and saved.model else DEFAULT_MODELS[provider_name]).strip()
    return usage_service.check_usage(current_user.id, provider_name, api_key, model)


@router.post("/{provider}/test", response_model=schemas.ProviderTestResponse)
def test_provider_connection(
    provider: str,
    data: Optional[schemas.ProviderTestRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    provider_name = provider.lower().strip()

    api_key = (data.api_key if data else "") or ""
    model = (data.model if data else "") or ""
    api_key = api_key.strip()
    model = model.strip()

    if not api_key:
        saved = (
            db.query(models.ProviderSetting)
            .filter(
                models.ProviderSetting.user_id == current_user.id,
                models.ProviderSetting.provider == provider_name,
            )
            .first()
        )
        if saved and saved.api_key:
            api_key = saved.api_key.strip()
            model = model or saved.model

    if not api_key:
        return schemas.ProviderTestResponse(
            success=False, message="No API key provided or saved for this provider."
        )

    try:
        _test_provider_key(provider_name, api_key, model or DEFAULT_MODELS.get(provider_name, ""))
        return schemas.ProviderTestResponse(success=True, message="Connection successful.")
    except Exception as e:
        return schemas.ProviderTestResponse(success=False, message=str(e))

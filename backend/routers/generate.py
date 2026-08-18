import json
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from routers.profile import _serialize_profile
import services.ai.router as ai_router
from services.prompts.cv import build_cv_prompt
from services.prompts.cover_letter import build_cover_letter_prompt
from services.project_matching import rank_and_highlight_projects
from auth import require_app_password

router = APIRouter(prefix="/api/generate", tags=["Generate"], dependencies=[Depends(require_app_password)])


def _clean_json_output(text: str) -> str:
    """
    Strips markdown code blocks like ```json ... ``` or ``` ... ``` if present.
    """
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return text


@router.post("", response_model=schemas.GenerateResponse)
def generate_cv_and_cover_letter(
    request: schemas.GenerateRequest,
    db: Session = Depends(get_db),
):
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")
    if not request.company.strip():
        raise HTTPException(status_code=400, detail="Company name cannot be empty.")
    if not request.position.strip():
        raise HTTPException(status_code=400, detail="Position title cannot be empty.")

    # 1. Load candidate profile
    profile = db.query(models.Profile).first()
    if not profile or (not profile.full_name and not profile.experiences and not profile.skills):
        raise HTTPException(
            status_code=400,
            detail="Your profile is empty. Please fill in and save your Profile first before generating a CV.",
        )

    profile_data = _serialize_profile(profile)

    # 2. Get AI Provider
    resolved = ai_router.get_provider(db, provider_override=request.provider)
    ai_provider = resolved.provider

    # 3. Generate tailored CV
    cv_system_prompt, cv_user_prompt = build_cv_prompt(
        profile=profile_data,
        job_description=request.job_description,
        company=request.company,
        position=request.position,
    )

    try:
        raw_cv_response = ai_provider.generate(
            prompt=cv_user_prompt, system_prompt=cv_system_prompt
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI Provider error during CV generation: {str(e)}",
        )

    cleaned_cv_json = _clean_json_output(raw_cv_response)
    try:
        cv_json = json.loads(cleaned_cv_json)
    except Exception as e:
        # Fallback if raw response wasn't strictly formatted
        cv_json = {
            "summary": "Generated Tailored Summary",
            "skills": profile_data.get("skills", []),
            "experience": profile_data.get("experiences", []),
            "projects": profile_data.get("projects", []),
            "certifications": profile_data.get("certifications", []),
            "education": profile_data.get("education", []),
            "raw_output": raw_cv_response,
        }

    # Contact info is never AI-tailored -- it's always the verbatim, current profile data,
    # so it always overrides anything the model might have echoed back under these keys.
    cv_json.update(
        {
            "full_name": profile_data.get("full_name", ""),
            "email": profile_data.get("email", ""),
            "phone": profile_data.get("phone", ""),
            "location": profile_data.get("location", ""),
            "linkedin": profile_data.get("linkedin", ""),
            "portfolio_url": profile_data.get("portfolio_url", ""),
        }
    )

    # Projects are never AI-rewritten either -- models have repeatedly fabricated specifics
    # (invented client names, user counts, industries) when asked to "highlight" project
    # content, especially for project names that resemble real-world systems. Relevance
    # ordering is done with plain keyword matching instead, which cannot invent facts.
    cv_json["projects"] = rank_and_highlight_projects(
        profile_data.get("projects", []), request.job_description
    )

    # 4. Generate tailored Cover Letter
    cl_system_prompt, cl_user_prompt = build_cover_letter_prompt(
        profile=profile_data,
        job_description=request.job_description,
        company=request.company,
        position=request.position,
    )

    try:
        raw_cl_response = ai_provider.generate(
            prompt=cl_user_prompt, system_prompt=cl_system_prompt
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI Provider error during Cover Letter generation: {str(e)}",
        )

    cover_letter_text = raw_cl_response.strip()

    # 5. Record this generation in the application tracker
    application = models.Application(
        company=request.company,
        position=request.position,
        job_description=request.job_description,
        provider_used=resolved.provider_name,
        model_used=resolved.model,
        generated_cv=json.dumps(cv_json),
        generated_cover_letter=cover_letter_text,
        status="Generated",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return schemas.GenerateResponse(
        cv=cv_json,
        cover_letter=cover_letter_text,
        application_id=application.id,
    )

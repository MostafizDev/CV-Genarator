import json
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import require_app_password

router = APIRouter(prefix="/api/applications", tags=["Applications"], dependencies=[Depends(require_app_password)])


def _serialize_application(app: models.Application) -> Dict[str, Any]:
    try:
        generated_cv = json.loads(app.generated_cv) if app.generated_cv else {}
        if not isinstance(generated_cv, dict):
            generated_cv = {}
    except Exception:
        generated_cv = {}

    return {
        "id": app.id,
        "company": app.company or "",
        "position": app.position or "",
        "job_description": app.job_description or "",
        "provider_used": app.provider_used or "",
        "model_used": app.model_used or "",
        "generated_cv": generated_cv,
        "generated_cover_letter": app.generated_cover_letter or "",
        "status": app.status or "Generated",
        "created_at": app.created_at,
        "updated_at": app.updated_at,
    }


@router.get("", response_model=List[schemas.ApplicationListItemSchema])
def list_applications(db: Session = Depends(get_db)):
    applications = (
        db.query(models.Application).order_by(models.Application.created_at.desc()).all()
    )
    return applications


@router.post("", response_model=schemas.ApplicationSchema)
def create_application(data: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    application = models.Application(
        company=data.company,
        position=data.position,
        job_description=data.job_description,
        provider_used=data.provider_used,
        model_used=data.model_used,
        generated_cv=json.dumps(data.generated_cv or {}),
        generated_cover_letter=data.generated_cover_letter,
        status=data.status or "Generated",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _serialize_application(application)


@router.get("/{application_id}", response_model=schemas.ApplicationSchema)
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    return _serialize_application(application)


@router.put("/{application_id}", response_model=schemas.ApplicationSchema)
def update_application(
    application_id: int, data: schemas.ApplicationUpdate, db: Session = Depends(get_db)
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if data.status is not None:
        application.status = data.status

    if data.company is not None:
        application.company = data.company
    if data.position is not None:
        application.position = data.position
    if data.job_description is not None:
        application.job_description = data.job_description
    if data.generated_cv is not None:
        application.generated_cv = json.dumps(data.generated_cv)
    if data.generated_cover_letter is not None:
        application.generated_cover_letter = data.generated_cover_letter

    db.commit()
    db.refresh(application)
    return _serialize_application(application)


@router.delete("/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(application)
    db.commit()
    return {"detail": "Application deleted."}

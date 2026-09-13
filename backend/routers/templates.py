from typing import List

from fastapi import APIRouter, Depends, HTTPException
from jinja2 import TemplateError, TemplateSyntaxError, meta
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from core.firebase_auth import get_current_user
from services.pdf.render import render_html
from services.pdf.sample_data import SAMPLE_CV, SAMPLE_COVER_LETTER_TEXT
from services.pdf.templates import ALLOWED_TEMPLATE_VARS, jinja_env

router = APIRouter(prefix="/api/templates", tags=["Templates"], dependencies=[Depends(get_current_user)])


def _validate_template_source(kind: str, template_html: str) -> None:
    """Raises a 400 HTTPException if the template doesn't parse, or references a
    variable other than what its kind allows -- shared by create and preview so both
    give the same feedback.
    """
    try:
        ast = jinja_env.parse(template_html)
    except TemplateSyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Invalid template syntax: {e}")

    used_vars = meta.find_undeclared_variables(ast)
    allowed_vars = ALLOWED_TEMPLATE_VARS[kind]
    unknown_vars = used_vars - allowed_vars
    if unknown_vars:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Template references unknown variable(s): {', '.join(sorted(unknown_vars))}. "
                f"A {kind} template may only use: {', '.join(sorted(allowed_vars))}."
            ),
        )


@router.get("", response_model=List[schemas.TemplateSchema])
def list_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Template)
        .filter(or_(models.Template.user_id.is_(None), models.Template.user_id == current_user.id))
        .order_by(models.Template.is_custom.asc(), models.Template.created_at.asc())
        .all()
    )


@router.post("/preview", response_model=schemas.TemplatePreviewResponse)
def preview_template(data: schemas.TemplatePreviewRequest):
    """Renders a template (saved or still being drafted in the create form) against
    fixed sample data, so the frontend can show a live preview without ever touching
    PDF rendering -- just the same HTML a PDF export would wrap.
    """
    if not data.template_html.strip():
        raise HTTPException(status_code=400, detail="Template content cannot be empty.")

    _validate_template_source(data.kind, data.template_html)

    sample = SAMPLE_CV if data.kind == "cv" else SAMPLE_COVER_LETTER_TEXT
    try:
        html = render_html(data.template_html, data.kind, sample)
    except TemplateError as e:
        raise HTTPException(status_code=400, detail=f"Failed to render template: {e}")

    return schemas.TemplatePreviewResponse(html=html)


@router.post("", response_model=schemas.TemplateSchema)
def create_template(
    data: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Template name cannot be empty.")
    if not data.template_html.strip():
        raise HTTPException(status_code=400, detail="Template content cannot be empty.")

    _validate_template_source(data.kind, data.template_html)

    template = models.Template(
        user_id=current_user.id,
        kind=data.kind,
        name=data.name.strip(),
        is_custom=True,
        template_html=data.template_html,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    if not template.is_custom:
        raise HTTPException(status_code=400, detail="Built-in templates cannot be deleted.")
    if template.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Template not found.")

    db.delete(template)
    db.commit()
    return {"detail": "Template deleted."}

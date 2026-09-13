from typing import Optional, Union

from fastapi import HTTPException
from sqlalchemy.orm import Session
from weasyprint import HTML

import models
from services.pdf.templates import jinja_env


def render_pdf(html: str) -> bytes:
    """Renders an HTML string to PDF bytes using WeasyPrint."""
    return HTML(string=html).write_pdf()


def _resolve_template(db: Session, template_id: Optional[int], kind: str, user_id: str) -> models.Template:
    """Looks up which Template row to render with. template_id=None means "use this
    kind's canonical default" -- the first-seeded built-in row (see migrations.py,
    which seeds BUILTIN_CV_TEMPLATES/BUILTIN_COVER_LETTER_TEMPLATES in order).
    """
    if template_id is None:
        template = (
            db.query(models.Template)
            .filter(models.Template.kind == kind, models.Template.is_custom.is_(False))
            .order_by(models.Template.id.asc())
            .first()
        )
    else:
        template = db.query(models.Template).get(template_id)
        if (
            not template
            or template.kind != kind
            or (template.user_id is not None and template.user_id != user_id)
        ):
            raise HTTPException(status_code=404, detail="Template not found.")

    if not template:
        raise HTTPException(status_code=500, detail=f"No built-in template is seeded for kind '{kind}'.")
    return template


def render_html(template_html: str, kind: str, data: Union[dict, str]) -> str:
    """Renders a template's Jinja2 source with the given content -- shared by the real
    export path (render_by_template, below) and the template-gallery live preview
    endpoint (routers/templates.py), so both always render identically.
    """
    context = {"cv": data} if kind == "cv" else {"text": data}
    return jinja_env.from_string(template_html).render(**context)


def render_by_template(
    db: Session,
    template_id: Optional[int],
    kind: str,
    user_id: str,
    data: Union[dict, str],
) -> bytes:
    """Renders CV/cover-letter content to PDF bytes using either the kind's default
    built-in template or one of the user's own custom templates.
    """
    template = _resolve_template(db, template_id, kind, user_id)
    html = render_html(template.template_html, kind, data)
    return render_pdf(html)

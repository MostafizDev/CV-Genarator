from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services.pdf.render import render_by_template
from core.firebase_auth import get_current_user

router = APIRouter(prefix="/api", tags=["Export"])


@router.post("/export-pdf")
def export_pdf(
    request: schemas.ExportPdfRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if request.type == "cv":
        if not isinstance(request.content, dict):
            raise HTTPException(status_code=400, detail="CV content must be a JSON object.")
        filename = "cv.pdf"
    else:
        if not isinstance(request.content, str):
            raise HTTPException(status_code=400, detail="Cover letter content must be plain text.")
        filename = "cover_letter.pdf"

    try:
        pdf_bytes = render_by_template(
            db, request.template_id, request.type, current_user.id, request.content
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

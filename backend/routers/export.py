from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

import schemas
from services.pdf.templates import build_cv_html, build_cover_letter_html
from services.pdf.render import render_pdf

router = APIRouter(prefix="/api", tags=["Export"])


@router.post("/export-pdf")
def export_pdf(request: schemas.ExportPdfRequest):
    if request.type == "cv":
        if not isinstance(request.content, dict):
            raise HTTPException(status_code=400, detail="CV content must be a JSON object.")
        html = build_cv_html(request.content)
        filename = "cv.pdf"
    else:
        if not isinstance(request.content, str):
            raise HTTPException(status_code=400, detail="Cover letter content must be plain text.")
        html = build_cover_letter_html(request.content)
        filename = "cover_letter.pdf"

    try:
        pdf_bytes = render_pdf(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

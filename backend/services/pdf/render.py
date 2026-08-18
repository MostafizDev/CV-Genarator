from weasyprint import HTML


def render_pdf(html: str) -> bytes:
    """Renders an HTML string to PDF bytes using WeasyPrint."""
    return HTML(string=html).write_pdf()

import html as html_lib
import re
from typing import Any, Dict, List, Optional

# Decorative pictographs/icons that sometimes end up in contact fields (e.g. copied from a
# resume that used "📞 555-1234"). ATS parsers can misread these as garbled characters, so
# strip them before rendering plain contact text.
_ICON_PATTERN = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]+",
    flags=re.UNICODE,
)


def _strip_icons(value: str) -> str:
    return _ICON_PATTERN.sub("", value).strip()


def _normalize_url(value: str) -> str:
    value = value.strip()
    if not value:
        return value
    if not re.match(r"^https?://", value, flags=re.IGNORECASE):
        return f"https://{value}"
    return value


CV_STYLE = """
<style>
  @page { size: Letter; margin: 0.75in; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #111111;
    margin: 0;
  }
  h1 { font-size: 18pt; margin: 0 0 4px 0; font-weight: bold; }
  .contact { font-size: 9.5pt; color: #333333; margin-bottom: 14px; }
  h2 {
    font-size: 11pt;
    border-bottom: 1px solid #333333;
    padding-bottom: 2px;
    margin: 16px 0 8px 0;
    break-after: avoid;
  }
  h2:first-of-type { margin-top: 0; }
  p { margin: 0 0 6px 0; }
  ul { margin: 4px 0 10px 0; padding-left: 18px; list-style-type: disc; }
  li { margin-bottom: 3px; }
  .entry { margin-bottom: 10px; break-inside: avoid; }
  .entry-header { font-weight: bold; }
  .entry-sub { font-size: 9.5pt; color: #333333; margin-bottom: 2px; }
  a { color: #111111; text-decoration: none; }
</style>
"""

COVER_LETTER_STYLE = """
<style>
  @page { size: Letter; margin: 1in; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111111;
  }
  .letter { white-space: pre-wrap; }
</style>
"""


def _esc(value: Any) -> str:
    return html_lib.escape(str(value)) if value not in (None, "") else ""


def _format_date_range(start: Optional[str], end: Optional[str]) -> str:
    start = (start or "").strip()
    end = (end or "").strip()
    if not start and not end:
        return ""
    if not end:
        end = "Present"
    if not start:
        return _esc(end)
    return f"{_esc(start)} - {_esc(end)}"


def _render_entries(entries: List[Dict[str, Any]]) -> str:
    return "".join(entries)


def build_cv_html(cv: Dict[str, Any]) -> str:
    """Builds ATS-safe, single-column HTML for a structured CV JSON object."""
    sections: List[str] = []

    full_name = cv.get("full_name") or cv.get("name") or ""

    plain_contact_bits = [
        _strip_icons(str(cv.get("email") or "")),
        _strip_icons(str(cv.get("phone") or "")),
        _strip_icons(str(cv.get("location") or "")),
    ]
    contact_parts = [_esc(b) for b in plain_contact_bits if b]

    for link_value in (cv.get("linkedin"), cv.get("portfolio_url")):
        link_value = _strip_icons(str(link_value or ""))
        if link_value:
            url = _normalize_url(link_value)
            # Plain text follows the link so ATS text-extraction still sees the readable
            # URL even if the anchor href itself gets dropped during parsing.
            contact_parts.append(f'<a href="{_esc(url)}">{_esc(link_value)}</a>')

    contact_line = " | ".join(contact_parts)

    if full_name or contact_line:
        header = "<div>"
        if full_name:
            header += f"<h1>{_esc(full_name)}</h1>"
        if contact_line:
            header += f'<div class="contact">{contact_line}</div>'
        header += "</div>"
        sections.append(header)

    summary = cv.get("summary")
    if summary:
        sections.append(f"<h2>SUMMARY</h2><p>{_esc(summary)}</p>")

    skills = cv.get("skills") or []
    if skills:
        skills_line = " | ".join(_esc(s) for s in skills if s)
        sections.append(f"<h2>SKILLS</h2><p>{skills_line}</p>")

    experience = cv.get("experience") or cv.get("experiences") or []
    if experience:
        items = []
        for exp in experience:
            title = _esc(exp.get("title"))
            company = _esc(exp.get("company"))
            location = _esc(exp.get("location"))
            date_range = _format_date_range(exp.get("start_date"), exp.get("end_date"))
            bullets = exp.get("bullet_points") or []
            bullet_html = "".join(f"<li>{_esc(b)}</li>" for b in bullets if b)

            header_line = title
            if company:
                header_line = f"{title} - {company}" if title else company

            sub_bits = [b for b in [location, date_range] if b]
            sub_line = " | ".join(sub_bits)

            entry = '<div class="entry">'
            if header_line:
                entry += f'<div class="entry-header">{header_line}</div>'
            if sub_line:
                entry += f'<div class="entry-sub">{sub_line}</div>'
            if bullet_html:
                entry += f"<ul>{bullet_html}</ul>"
            entry += "</div>"
            items.append(entry)
        sections.append("<h2>EXPERIENCE</h2>" + _render_entries(items))

    projects = cv.get("projects") or []
    if projects:
        items = []
        for proj in projects:
            name = _esc(proj.get("name"))
            tech = _esc(proj.get("tech_stack"))
            desc = _esc(proj.get("description"))

            entry = '<div class="entry">'
            if name:
                entry += f'<div class="entry-header">{name}</div>'
            if tech:
                entry += f'<div class="entry-sub">{tech}</div>'
            if desc:
                entry += f"<p>{desc}</p>"
            entry += "</div>"
            items.append(entry)
        sections.append("<h2>PROJECTS</h2>" + _render_entries(items))

    # Only render the Certifications header when there's actual content — an empty
    # section header with nothing under it looks like a mistake on a printed/exported PDF,
    # and ATS scoring doesn't require the header to exist if there's nothing to parse.
    certifications = cv.get("certifications") or []
    if certifications:
        items = []
        for cert in certifications:
            name = _esc(cert.get("name"))
            sub = " | ".join(x for x in [_esc(cert.get("issuer")), _esc(cert.get("date_earned"))] if x)

            entry = '<div class="entry">'
            if name:
                entry += f'<div class="entry-header">{name}</div>'
            if sub:
                entry += f'<div class="entry-sub">{sub}</div>'
            entry += "</div>"
            items.append(entry)
        sections.append("<h2>CERTIFICATIONS</h2>" + _render_entries(items))

    education = cv.get("education") or []
    if education:
        items = []
        for edu in education:
            degree = _esc(edu.get("degree"))
            field = _esc(edu.get("field"))
            title_line = f"{degree} in {field}" if degree and field else (degree or field)
            sub = " | ".join(x for x in [_esc(edu.get("institution")), _esc(edu.get("graduation_year"))] if x)

            entry = '<div class="entry">'
            if title_line:
                entry += f'<div class="entry-header">{title_line}</div>'
            if sub:
                entry += f'<div class="entry-sub">{sub}</div>'
            entry += "</div>"
            items.append(entry)
        sections.append("<h2>EDUCATION</h2>" + _render_entries(items))

    # Languages was present in the CV JSON schema but was never rendered — added here so
    # it actually appears in the exported document.
    languages = cv.get("languages") or []
    if languages:
        languages_line = " | ".join(_esc(l) for l in languages if l)
        sections.append(f"<h2>LANGUAGES</h2><p>{languages_line}</p>")

    body = "".join(sections)
    return f'<!doctype html><html><head><meta charset="utf-8">{CV_STYLE}</head><body>{body}</body></html>'


def build_cover_letter_html(text: str) -> str:
    """Wraps plain cover letter text in a simple, clean HTML letter layout."""
    content = _esc(text or "")
    return (
        f'<!doctype html><html><head><meta charset="utf-8">{COVER_LETTER_STYLE}</head>'
        f'<body><div class="letter">{content}</div></body></html>'
    )


def render_cv_pdf(cv: Dict[str, Any], output_path: str) -> str:
    """
    Renders a structured CV JSON object to a single-column, ATS-safe PDF file.

    Requires WeasyPrint: pip install weasyprint --break-system-packages
    (WeasyPrint also needs system libraries — Pango/Cairo — already present on most
    Linux servers; see https://doc.courtbouillon.org/weasyprint/stable/first_steps.html
    if you hit an import error in your deployment environment.)

    Returns the output_path for convenience.
    """
    from weasyprint import HTML  # imported lazily so this module still loads without it

    html_content = build_cv_html(cv)
    HTML(string=html_content).write_pdf(output_path)
    return output_path


def render_cover_letter_pdf(text: str, output_path: str) -> str:
    """Renders a plain-text cover letter to PDF. Requires WeasyPrint (see render_cv_pdf)."""
    from weasyprint import HTML

    html_content = build_cover_letter_html(text)
    HTML(string=html_content).write_pdf(output_path)
    return output_path
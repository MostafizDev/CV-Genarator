import re
from typing import Any, Dict

from jinja2 import Environment
from markupsafe import Markup, escape

# Shared environment for rendering EVERY template -- built-in and user-created custom
# ones alike (see routers/templates.py for creation/validation and services/pdf/render.py
# for how a template_id resolves to HTML). Built-ins are just Template rows nobody but
# this codebase can edit or delete; there's no separate "native" rendering path.
jinja_env = Environment(autoescape=True)

# The only top-level variable each template kind is allowed to reference -- enforced at
# creation/preview time in routers/templates.py.
ALLOWED_TEMPLATE_VARS = {
    "cv": {"cv"},
    "cover_letter": {"text"},
}

# Decorative pictographs/icons that sometimes end up in contact fields (e.g. copied from a
# resume that used "📞 555-1234"). ATS parsers can misread these as garbled characters, so
# strip them before rendering plain contact text.
_ICON_PATTERN = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]+",
    flags=re.UNICODE,
)


def _strip_icons(value: Any) -> str:
    return _ICON_PATTERN.sub("", str(value or "")).strip()


def _normalize_url(value: Any) -> str:
    value = str(value or "").strip()
    if not value:
        return value
    if not re.match(r"^https?://", value, flags=re.IGNORECASE):
        return f"https://{value}"
    return value


def _contact_line(cv: Dict[str, Any]) -> Markup:
    """Joins a CV's contact fields into one "a | b | c" line, with linkedin/portfolio_url
    rendered as clickable links (plain text follows the URL so ATS text-extraction still
    sees it even if the anchor href gets dropped during parsing). Registered as the
    `contact_line` filter so every template can just write `{{ cv | contact_line }}`.
    """
    parts = []
    for key in ("email", "phone", "location"):
        value = _strip_icons(cv.get(key))
        if value:
            parts.append(str(escape(value)))
    for key in ("linkedin", "portfolio_url"):
        value = _strip_icons(cv.get(key))
        if value:
            url = _normalize_url(value)
            parts.append(f'<a href="{escape(url)}">{escape(value)}</a>')
    return Markup(" | ".join(parts))


jinja_env.filters["strip_icons"] = _strip_icons
jinja_env.filters["normalize_url"] = _normalize_url
jinja_env.filters["contact_line"] = _contact_line


# ---------------------------------------------------------------------------
# Built-in templates. Each is a complete, self-contained Jinja2 source string --
# exactly what gets seeded into the templates table (see migrations.py) and rendered
# the same way a user's own custom template would be (services/pdf/render.py).
# "Default" is seeded first for each kind, so it's the one used when no template_id
# is specified (see render.py's _resolve_template).
# ---------------------------------------------------------------------------

DEFAULT_CV_TEMPLATE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: Letter; margin: 0.75in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111111; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 4px 0; font-weight: bold; }
  .contact { font-size: 9.5pt; color: #333333; margin-bottom: 14px; }
  h2 { font-size: 11pt; border-bottom: 1px solid #333333; padding-bottom: 2px; margin: 16px 0 8px 0; }
  h2:first-of-type { margin-top: 0; }
  p { margin: 0 0 6px 0; }
  ul { margin: 4px 0 10px 0; padding-left: 18px; list-style-type: disc; }
  li { margin-bottom: 3px; }
  .entry { margin-bottom: 10px; }
  .entry-header { font-weight: bold; }
  .entry-sub { font-size: 9.5pt; color: #333333; margin-bottom: 2px; }
  a { color: #111111; text-decoration: none; }
</style>
</head><body>
{% if cv.full_name or cv.email or cv.phone or cv.location %}
<div>
  {% if cv.full_name %}<h1>{{ cv.full_name }}</h1>{% endif %}
  <div class="contact">{{ cv | contact_line }}</div>
</div>
{% endif %}
{% if cv.summary %}<h2>SUMMARY</h2><p>{{ cv.summary }}</p>{% endif %}
{% if cv.skills %}<h2>SKILLS</h2><p>{{ cv.skills|join(' | ') }}</p>{% endif %}
{% if cv.experience %}
<h2>EXPERIENCE</h2>
{% for exp in cv.experience %}
<div class="entry">
  <div class="entry-header">{{ exp.title }}{% if exp.company %} - {{ exp.company }}{% endif %}</div>
  <div class="entry-sub">{% if exp.start_date or exp.end_date %}{{ exp.start_date }} - {{ exp.end_date or "Present" }}{% endif %}</div>
  {% if exp.bullet_points %}<ul>{% for b in exp.bullet_points %}<li>{{ b }}</li>{% endfor %}</ul>{% endif %}
</div>
{% endfor %}
{% endif %}
{% if cv.projects %}
<h2>PROJECTS</h2>
{% for proj in cv.projects %}
<div class="entry">
  <div class="entry-header">{{ proj.name }}</div>
  {% if proj.tech_stack %}<div class="entry-sub">{{ proj.tech_stack }}</div>{% endif %}
  {% if proj.description %}<p>{{ proj.description }}</p>{% endif %}
</div>
{% endfor %}
{% endif %}
{% if cv.certifications %}
<h2>CERTIFICATIONS</h2>
{% for cert in cv.certifications %}
<div class="entry">
  <div class="entry-header">{{ cert.name }}</div>
  <div class="entry-sub">{{ [cert.issuer, cert.date_earned]|select|join(' | ') }}</div>
</div>
{% endfor %}
{% endif %}
{% if cv.education %}
<h2>EDUCATION</h2>
{% for edu in cv.education %}
<div class="entry">
  <div class="entry-header">{% if edu.degree and edu.field %}{{ edu.degree }} in {{ edu.field }}{% else %}{{ edu.degree or edu.field }}{% endif %}</div>
  <div class="entry-sub">{{ [edu.institution, edu.graduation_year]|select|join(' | ') }}</div>
</div>
{% endfor %}
{% endif %}
{% if cv.languages %}<h2>LANGUAGES</h2><p>{{ cv.languages|join(' | ') }}</p>{% endif %}
</body></html>"""


NAVY_SIDEBAR_CV_TEMPLATE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: Letter; margin: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1f2937; margin: 0; }
  .page { display: flex; min-height: 100%; }
  .sidebar { background: #1e3a5f; color: #ffffff; width: 32%; padding: 28px 20px; }
  .main { width: 68%; padding: 28px 24px; }
  .sidebar h1 { font-size: 16pt; margin: 0 0 2px 0; line-height: 1.25; }
  .sidebar .role { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #a9c4e0; margin-bottom: 20px; }
  .sidebar h3 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #a9c4e0; border-bottom: 1px solid rgba(255,255,255,0.25); padding-bottom: 4px; margin: 18px 0 8px 0; }
  .sidebar h3:first-of-type { margin-top: 0; }
  .sidebar ul { list-style: none; margin: 0; padding: 0; }
  .sidebar li { margin-bottom: 6px; font-size: 9.5pt; }
  .main h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a5f; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px; margin: 18px 0 8px 0; }
  .main h2:first-of-type { margin-top: 0; }
  .main p { margin: 0 0 6px 0; line-height: 1.5; }
  .entry { margin-bottom: 12px; }
  .entry-header { font-weight: 700; }
  .entry-sub { font-size: 9pt; color: #4b5563; margin-bottom: 3px; }
  .main ul { margin: 4px 0 8px 0; padding-left: 16px; }
  .main li { margin-bottom: 3px; }
</style>
</head>
<body>
<div class="page">
  <div class="sidebar">
    <h1>{{ cv.full_name }}</h1>
    {% if cv.title %}<div class="role">{{ cv.title }}</div>{% endif %}
    <h3>Contact</h3>
    <ul>
      {% if cv.phone %}<li>{{ cv.phone|strip_icons }}</li>{% endif %}
      {% if cv.email %}<li>{{ cv.email|strip_icons }}</li>{% endif %}
      {% if cv.location %}<li>{{ cv.location|strip_icons }}</li>{% endif %}
    </ul>
    {% if cv.skills %}
    <h3>Skills</h3>
    <ul>{% for s in cv.skills %}<li>{{ s }}</li>{% endfor %}</ul>
    {% endif %}
    {% if cv.languages %}
    <h3>Languages</h3>
    <ul>{% for l in cv.languages %}<li>{{ l }}</li>{% endfor %}</ul>
    {% endif %}
  </div>
  <div class="main">
    {% if cv.summary %}<h2>Professional Summary</h2><p>{{ cv.summary }}</p>{% endif %}
    {% if cv.experience %}
    <h2>Experience</h2>
    {% for exp in cv.experience %}
    <div class="entry">
      <div class="entry-header">{{ exp.title }}</div>
      <div class="entry-sub">{{ exp.company }}{% if exp.start_date or exp.end_date %} &middot; {{ exp.start_date }} - {{ exp.end_date or "Present" }}{% endif %}</div>
      {% if exp.bullet_points %}<ul>{% for b in exp.bullet_points %}<li>{{ b }}</li>{% endfor %}</ul>{% endif %}
    </div>
    {% endfor %}
    {% endif %}
    {% if cv.education %}
    <h2>Education</h2>
    {% for edu in cv.education %}
    <div class="entry">
      <div class="entry-header">{% if edu.degree and edu.field %}{{ edu.degree }} in {{ edu.field }}{% else %}{{ edu.degree or edu.field }}{% endif %}</div>
      <div class="entry-sub">{{ [edu.institution, edu.graduation_year]|select|join(' &middot; ') }}</div>
    </div>
    {% endfor %}
    {% endif %}
    {% if cv.certifications %}
    <h2>Certifications</h2>
    {% for cert in cv.certifications %}
    <div class="entry">
      <div class="entry-header">{{ cert.name }}</div>
      <div class="entry-sub">{{ [cert.issuer, cert.date_earned]|select|join(' &middot; ') }}</div>
    </div>
    {% endfor %}
    {% endif %}
  </div>
</div>
</body></html>"""


TEAL_HEADER_CV_TEMPLATE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: Letter; margin: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1f2937; margin: 0; }
  .header { background: #1d6f79; color: #fff; padding: 26px 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 20pt; letter-spacing: 1px; }
  .header .role { margin-top: 4px; font-size: 10pt; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9; }
  .body { display: flex; padding: 24px 32px; }
  .col-main { width: 66%; padding-right: 24px; }
  .col-side { width: 34%; border-left: 1px solid #e5e7eb; padding-left: 20px; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #1d6f79; margin: 16px 0 8px 0; }
  h2:first-of-type { margin-top: 0; }
  .entry { margin-bottom: 12px; }
  .entry-header { font-weight: 700; }
  .entry-sub { font-size: 9pt; color: #6b7280; margin-bottom: 3px; }
  ul { margin: 4px 0 8px 0; padding-left: 16px; }
  li { margin-bottom: 3px; }
  .col-side ul { list-style: none; padding: 0; }
  .col-side li { margin-bottom: 6px; font-size: 9.5pt; }
</style>
</head>
<body>
<div class="header">
  <h1>{{ cv.full_name }}</h1>
  {% if cv.title %}<div class="role">{{ cv.title }}</div>{% endif %}
</div>
<div class="body">
  <div class="col-main">
    {% if cv.summary %}<h2>Professional Summary</h2><p>{{ cv.summary }}</p>{% endif %}
    {% if cv.experience %}
    <h2>Experience</h2>
    {% for exp in cv.experience %}
    <div class="entry">
      <div class="entry-header">{{ exp.title }}</div>
      <div class="entry-sub">{{ exp.company }}{% if exp.start_date or exp.end_date %} | {{ exp.start_date }} - {{ exp.end_date or "Present" }}{% endif %}</div>
      {% if exp.bullet_points %}<ul>{% for b in exp.bullet_points %}<li>{{ b }}</li>{% endfor %}</ul>{% endif %}
    </div>
    {% endfor %}
    {% endif %}
  </div>
  <div class="col-side">
    <h2>Contact</h2>
    <ul>
      {% if cv.phone %}<li>{{ cv.phone|strip_icons }}</li>{% endif %}
      {% if cv.email %}<li>{{ cv.email|strip_icons }}</li>{% endif %}
      {% if cv.location %}<li>{{ cv.location|strip_icons }}</li>{% endif %}
    </ul>
    {% if cv.skills %}<h2>Skills</h2><ul>{% for s in cv.skills %}<li>{{ s }}</li>{% endfor %}</ul>{% endif %}
    {% if cv.education %}
    <h2>Education</h2>
    {% for edu in cv.education %}
    <div class="entry">
      <div class="entry-header">{% if edu.degree and edu.field %}{{ edu.degree }} in {{ edu.field }}{% else %}{{ edu.degree or edu.field }}{% endif %}</div>
      <div class="entry-sub">{{ [edu.institution, edu.graduation_year]|select|join(' | ') }}</div>
    </div>
    {% endfor %}
    {% endif %}
    {% if cv.languages %}<h2>Languages</h2><ul>{% for l in cv.languages %}<li>{{ l }}</li>{% endfor %}</ul>{% endif %}
  </div>
</div>
</body></html>"""


MINIMALIST_CV_TEMPLATE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: Letter; margin: 0.75in; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10.5pt; color: #1f2937; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2px 0; color: #111827; }
  .role { color: #2563eb; font-weight: 600; margin-bottom: 10px; }
  .contact { font-size: 9.5pt; color: #4b5563; margin-bottom: 16px; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
  h2:first-of-type { margin-top: 0; }
  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-pill { background: #eff6ff; color: #1d4ed8; font-size: 9pt; padding: 3px 10px; border-radius: 999px; }
  .entry { margin-bottom: 12px; }
  .entry-header { font-weight: 700; }
  .entry-sub { color: #2563eb; font-size: 9.5pt; margin-bottom: 3px; }
  ul { margin: 4px 0 8px 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
</style>
</head>
<body>
<h1>{{ cv.full_name }}</h1>
{% if cv.title %}<div class="role">{{ cv.title }}</div>{% endif %}
<div class="contact">{{ cv | contact_line }}</div>
{% if cv.summary %}<h2>Professional Summary</h2><p>{{ cv.summary }}</p>{% endif %}
{% if cv.skills %}<h2>Skills</h2><div class="skills">{% for s in cv.skills %}<span class="skill-pill">{{ s }}</span>{% endfor %}</div>{% endif %}
{% if cv.experience %}
<h2>Experience</h2>
{% for exp in cv.experience %}
<div class="entry">
  <div class="entry-header">{{ exp.title }}{% if exp.company %}, {{ exp.company }}{% endif %}</div>
  <div class="entry-sub">{% if exp.start_date or exp.end_date %}{{ exp.start_date }} - {{ exp.end_date or "Present" }}{% endif %}</div>
  {% if exp.bullet_points %}<ul>{% for b in exp.bullet_points %}<li>{{ b }}</li>{% endfor %}</ul>{% endif %}
</div>
{% endfor %}
{% endif %}
{% if cv.education %}
<h2>Education</h2>
{% for edu in cv.education %}
<div class="entry">
  <div class="entry-header">{% if edu.degree and edu.field %}{{ edu.degree }} in {{ edu.field }}{% else %}{{ edu.degree or edu.field }}{% endif %}</div>
  <div class="entry-sub">{{ [edu.institution, edu.graduation_year]|select|join(' | ') }}</div>
</div>
{% endfor %}
{% endif %}
{% if cv.certifications %}
<h2>Certifications</h2>
{% for cert in cv.certifications %}
<div class="entry">
  <div class="entry-header">{{ cert.name }}</div>
  <div class="entry-sub">{{ [cert.issuer, cert.date_earned]|select|join(' | ') }}</div>
</div>
{% endfor %}
{% endif %}
</body></html>"""


DEFAULT_COVER_LETTER_TEMPLATE_HTML = """<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: Letter; margin: 1in; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.6; color: #111111; }
  .letter { white-space: pre-wrap; }
</style>
</head><body><div class="letter">{{ text }}</div></body></html>"""


# Seeded into the templates table by migrations.py, in this order -- the first entry
# per kind is the canonical "no template_id specified" default (see render.py).
BUILTIN_CV_TEMPLATES = [
    ("Default", DEFAULT_CV_TEMPLATE_HTML),
    ("Navy Sidebar", NAVY_SIDEBAR_CV_TEMPLATE_HTML),
    ("Teal Header", TEAL_HEADER_CV_TEMPLATE_HTML),
    ("Minimalist", MINIMALIST_CV_TEMPLATE_HTML),
]
BUILTIN_COVER_LETTER_TEMPLATES = [
    ("Default", DEFAULT_COVER_LETTER_TEMPLATE_HTML),
]

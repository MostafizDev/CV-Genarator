import re
from typing import Any, Dict, List

_WORD_PATTERN = re.compile(r"[a-zA-Z0-9\+\#\.]{2,}")


def _keywords(text: str) -> set:
    return set(_WORD_PATTERN.findall((text or "").lower()))


def rank_and_highlight_projects(
    projects: List[Dict[str, Any]], job_description: str
) -> List[Dict[str, Any]]:
    """
    Reorders the candidate's own projects (verbatim, never rewritten) by relevance to the
    job description, and reorders each project's comma-separated tech_stack so terms that
    genuinely appear in that project's own data AND in the job description come first.

    This is pure string/set matching -- no LLM involved -- so it carries zero risk of
    fabricating facts, unlike asking a model to "highlight" or "rephrase" project content.
    """
    jd_keywords = _keywords(job_description)

    scored = []
    for proj in projects:
        tech_stack = proj.get("tech_stack") or ""
        description = proj.get("description") or ""
        project_keywords = _keywords(f"{tech_stack} {description}")
        score = len(jd_keywords & project_keywords)

        items = [t.strip() for t in tech_stack.split(",") if t.strip()]
        matched_items = [t for t in items if _keywords(t) & jd_keywords]
        other_items = [t for t in items if t not in matched_items]
        reordered_tech_stack = ", ".join(matched_items + other_items) if items else tech_stack

        scored.append((score, {**proj, "tech_stack": reordered_tech_stack}))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [proj for _, proj in scored]

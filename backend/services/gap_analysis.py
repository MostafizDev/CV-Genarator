"""
Gap Analysis: after each generation, compares the job's explicit requirements against the
candidate's profile and surfaces concrete gaps.

Three steps, deliberately kept separate:

  1. Requirement extraction (`_extract_requirements`) -- one AI call. Reads ONLY the job
     description (never the candidate's data, so it can't shade "required" toward whatever
     the candidate happens to have). Pulls out a minimum years-of-experience number (if
     literally given), required skills, and required certifications, each tagged "required"
     or "preferred" from the posting's own wording (see services/prompts/gap_analysis.py).

  2. Related-skill check (`_find_related_skills`) -- a second, narrow AI call, made only for
     skills that turn out to be missing. It's given just the missing skill names and the
     candidate's own listed skills, and asked whether a missing skill is really a specific
     tool/variant within the same family as one the candidate already has (Bitbucket/GitHub;
     TestFlight/App Store). Every answer is verified against the candidate's actual skill list
     before being trusted -- if the model points at a skill the candidate doesn't really list,
     that answer is discarded, never taken on faith.

  3. Gap computation (`compute_gaps`) -- plain Python, no AI. Years of experience are computed
     by parsing the candidate's own start/end dates (never guessed), and each extracted
     requirement is checked against the candidate's actual profile text. A gap is only ever
     reported when both sides are explicit: a requirement the job actually states, and an
     absence (or shortfall) the profile actually shows. A missing skill with a verified related
     skill becomes a minor gap with partial credit instead of a blocking one.

If the AI can't produce usable requirements, no score or gaps are fabricated -- the result
comes back with a `note` explaining that instead.
"""
import json
import re
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import schemas
from services.ai.base import AiProvider
from services.prompts.gap_analysis import build_related_skills_prompt, build_requirements_extraction_prompt

# A shortfall this large (or larger) is "blocking"; anything smaller is "minor".
_BLOCKING_SHORTFALL_YEARS = 1.0

# Fraction of an item's weight credited toward the score for any "minor" miss: a missing
# skill with a verified related skill, or a missing "preferred" (never required) skill or
# certification. Real, but partial, credit -- a minor gap should cost half, not zero, so it
# consistently means something lighter than a blocking gap rather than looking identical in
# the score.
_MINOR_GAP_CREDIT = 0.5

# Relative weight of a "required" vs "preferred" item when computing the overall score.
_WEIGHT = {"required": 2.0, "preferred": 1.0}


# --- requirement extraction (the one AI call) --------------------------------------

def _clean_json_output(text: str) -> str:
    text = (text or "").strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    return match.group(1).strip() if match else text


def _extract_requirements(ai_provider: AiProvider, job_description: str) -> Optional[Dict[str, Any]]:
    """Returns the parsed extraction, or None if the model didn't return usable JSON."""
    system_prompt, user_prompt = build_requirements_extraction_prompt(job_description)
    try:
        raw = ai_provider.generate(prompt=user_prompt, system_prompt=system_prompt)
        data = json.loads(_clean_json_output(raw))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _find_related_skills(
    ai_provider: AiProvider, missing_skills: List[str], candidate_skills: List[str]
) -> Dict[str, str]:
    """For skills the job requires that the candidate's profile doesn't literally mention,
    asks whether one is really just a variant of a skill the candidate already has. Returns
    {missing skill name (lowercased): the candidate's own skill string it matches}.

    Every match is verified against `candidate_skills` before being trusted -- if the model
    names something the candidate doesn't actually list, that answer is thrown out. On any
    failure (bad JSON, provider error), returns {} so callers just see no matches, never a
    fabricated one.
    """
    system_prompt, user_prompt = build_related_skills_prompt(missing_skills, candidate_skills)
    try:
        raw = ai_provider.generate(prompt=user_prompt, system_prompt=system_prompt)
        data = json.loads(_clean_json_output(raw))
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}

    matches = data.get("matches")
    if not isinstance(matches, list):
        return {}

    # Verbatim (case-insensitive) lookup -- the only way a "related_skill" can be trusted is if
    # it's actually, exactly one of the skills the candidate's own profile lists.
    candidate_lookup = {s.strip().lower(): s.strip() for s in candidate_skills if isinstance(s, str) and s.strip()}
    missing_lookup = {name.strip().lower() for name in missing_skills}

    result: Dict[str, str] = {}
    for entry in matches:
        if not isinstance(entry, dict):
            continue
        missing_name = str(entry.get("missing_skill") or "").strip().lower()
        related_name = str(entry.get("related_skill") or "").strip()
        verified_related = candidate_lookup.get(related_name.lower())
        if missing_name in missing_lookup and verified_related:
            result[missing_name] = verified_related
    return result


def _normalize_items(raw_items: Any) -> List[Dict[str, str]]:
    """Tolerates a plain list of names as well as the requested {name, importance} shape --
    providers don't always follow a schema exactly -- while still only accepting a real name."""
    items = []
    for item in raw_items if isinstance(raw_items, list) else []:
        if isinstance(item, str):
            name, importance = item.strip(), "required"
        elif isinstance(item, dict):
            name = str(item.get("name") or "").strip()
            importance = "preferred" if str(item.get("importance") or "").lower() == "preferred" else "required"
        else:
            continue
        if name:
            items.append({"name": name, "importance": importance})
    return items


def _normalize_min_years(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if value > 0 else None


# --- date parsing (real logic, never a guess about a date that isn't there) --------------

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3, "apr": 4, "april": 4,
    "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7, "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10, "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}
_CURRENT_WORDS = ("present", "current", "currently", "now", "ongoing", "to date")


def _parse_month_year(text: Optional[str], *, today: date) -> Optional[Tuple[int, int]]:
    """Parses a free-text resume date into (year, month). Recognizes 'Mar 2021', 'March 2021',
    '2021-03', '03/2021', a bare '2021', and 'Present'/'Current' (-> today).
    Returns None for missing/unrecognizable text -- callers decide what that means (an
    unusable start date is skipped; a blank end_date is treated as "still there" -- see
    total_months_of_experience), rather than this function guessing on their behalf.
    """
    if not text or not text.strip():
        return None
    normalized = text.strip().lower()
    if any(word in normalized for word in _CURRENT_WORDS):
        return (today.year, today.month)

    match = re.match(r"^(\d{4})[-/](\d{1,2})\b", normalized)
    if match:
        return (int(match.group(1)), max(1, min(12, int(match.group(2)))))

    match = re.match(r"^(\d{1,2})[-/](\d{4})$", normalized)
    if match:
        return (int(match.group(2)), max(1, min(12, int(match.group(1)))))

    match = re.search(r"([a-z]{3,9})\.?\s+(\d{4})", normalized) or re.search(r"(\d{4})\s+([a-z]{3,9})", normalized)
    if match:
        word, year = (match.group(1), match.group(2)) if not match.group(1).isdigit() else (match.group(2), match.group(1))
        month = _MONTHS.get(word) or _MONTHS.get(word[:3])
        if month:
            return (int(year), month)

    match = re.fullmatch(r"(\d{4})", normalized)
    if match:
        return (int(match.group(1)), 1)  # unknown month within the year; counts the whole year

    return None


def _month_index(year: int, month: int) -> int:
    return year * 12 + (month - 1)


def total_months_of_experience(experiences: List[Dict[str, Any]], *, today: Optional[date] = None) -> int:
    """Total months of work experience, from parsing the candidate's own dates. Overlapping
    roles (e.g. concurrent contracts) are merged so the same month is never counted twice.
    An experience whose start date can't be parsed is left out rather than guessed at.
    """
    today = today or date.today()
    intervals = []
    for exp in experiences or []:
        start = _parse_month_year(exp.get("start_date"), today=today)
        if start is None:
            continue
        end = _parse_month_year(exp.get("end_date"), today=today) or (today.year, today.month)
        start_idx, end_idx = _month_index(*start), _month_index(*end)
        if end_idx >= start_idx:
            intervals.append((start_idx, end_idx))

    if not intervals:
        return 0

    intervals.sort()
    merged = [intervals[0]]
    for start_idx, end_idx in intervals[1:]:
        last_start, last_end = merged[-1]
        if start_idx <= last_end + 1:
            merged[-1] = (last_start, max(last_end, end_idx))
        else:
            merged.append((start_idx, end_idx))
    return sum(end_idx - start_idx + 1 for start_idx, end_idx in merged)


def total_years_of_experience(experiences: List[Dict[str, Any]], *, today: Optional[date] = None) -> float:
    return round(total_months_of_experience(experiences, today=today) / 12, 1)


def _format_years(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


# --- matching a requirement against the candidate's own profile text --------------------

_WORD_PATTERN = re.compile(r"[a-z0-9\+\#\.]+")


def _normalize(text: str) -> str:
    return " ".join(_WORD_PATTERN.findall((text or "").lower()))


def _profile_evidence_text(profile: Dict[str, Any]) -> str:
    """Everything in the profile that counts as evidence: the skills list, every certification
    name, every experience's title and bullet points, and every project's tech stack and
    description -- the same "candidate's own words only" spirit as project_matching.py."""
    parts: List[str] = list(profile.get("skills") or [])
    for cert in profile.get("certifications") or []:
        parts.append(cert.get("name") or "")
    for exp in profile.get("experiences") or []:
        parts.append(exp.get("title") or "")
        parts.extend(exp.get("bullet_points") or [])
    for proj in profile.get("projects") or []:
        parts.append(proj.get("tech_stack") or "")
        parts.append(proj.get("description") or "")
    return _normalize(" ".join(parts))


def _has_evidence(term: str, haystack: str) -> bool:
    """True if every word of `term` appears as a whole word somewhere in the profile text
    (so "CI/CD" -> "ci" and "cd" must both appear; "Python" won't match "pythonic-ish" noise)."""
    words = _normalize(term).split()
    if not words:
        return False
    return all(re.search(rf"(?<![a-z0-9]){re.escape(word)}(?![a-z0-9])", haystack) for word in words)


# --- gap computation (plain Python; the only place a "gap" is decided) ------------------

def _experience_gap(min_years: float, candidate_years: float) -> Optional[schemas.Gap]:
    shortfall = round(min_years - candidate_years, 1)
    if shortfall <= 0:
        return None
    severity = "blocking" if shortfall >= _BLOCKING_SHORTFALL_YEARS else "minor"
    return schemas.Gap(
        category="experience",
        severity=severity,
        requirement=f"{_format_years(min_years)}+ years of experience",
        candidate_has=f"{_format_years(candidate_years)} years, based on your saved work history",
        recommendation=(
            f"You're {_format_years(shortfall)} year(s) short of the stated minimum. "
            "Add any relevant experience missing from your profile, or use your cover letter "
            "to address the gap directly."
        ),
    )


def _requirement_gap(category: str, item: Dict[str, str]) -> schemas.Gap:
    severity = "blocking" if item["importance"] == "required" else "minor"
    kind = "requirement" if severity == "blocking" else "preferred qualification"
    return schemas.Gap(
        category=category,
        severity=severity,
        requirement=item["name"],
        candidate_has="Not found in your saved profile",
        recommendation=(
            f'The job description lists "{item["name"]}" as a {kind}. Add it to your profile '
            f"if you have it, or address the gap in your cover letter."
        ),
    )


def _related_skill_gap(requirement: str, related_skill: str) -> schemas.Gap:
    """A missing skill that's a close variant of one the candidate already has (e.g. the job
    wants Bitbucket and the candidate lists GitHub) -- real, but only a partial match, so it's
    always minor regardless of how the job description phrased its importance."""
    return schemas.Gap(
        category="skill",
        severity="minor",
        requirement=requirement,
        candidate_has=f'Not listed by name, but you have "{related_skill}", which is closely related',
        recommendation=(
            f'"{requirement}" wasn\'t found by name, but it\'s closely related to "{related_skill}", '
            "which you already have. Consider adding it to your profile by name too, since some "
            "ATS systems match exact keywords."
        ),
    )


def compute_gaps(
    requirements: Dict[str, Any],
    profile: Dict[str, Any],
    related_skills: Optional[Dict[str, str]] = None,
) -> schemas.GapAnalysis:
    """`related_skills` (see _find_related_skills) maps a missing skill's lowercased name to a
    verified, closely-related skill the candidate actually has. Passing it in (rather than
    computing it here) keeps this function itself plain and AI-free -- run_gap_analysis is the
    only place that ever calls the model."""
    min_years = _normalize_min_years(requirements.get("min_years_experience"))
    required_skills = _normalize_items(requirements.get("required_skills"))
    required_certifications = _normalize_items(requirements.get("required_certifications"))
    related_skills = related_skills or {}

    haystack = _profile_evidence_text(profile)
    candidate_years = total_years_of_experience(profile.get("experiences") or [])

    gaps: List[schemas.Gap] = []
    matched_weight = total_weight = 0.0
    matched_count = total_count = 0

    if min_years is not None:
        weight = _WEIGHT["required"]
        total_weight += weight
        total_count += 1
        met = candidate_years >= min_years
        matched_weight += weight * (1.0 if met else min(1.0, candidate_years / min_years))
        if met:
            matched_count += 1
        else:
            gaps.append(_experience_gap(min_years, candidate_years))

    for category, items in (("skill", required_skills), ("certification", required_certifications)):
        for item in items:
            weight = _WEIGHT[item["importance"]]
            total_weight += weight
            total_count += 1
            if _has_evidence(item["name"], haystack):
                matched_weight += weight
                matched_count += 1
                continue

            related = related_skills.get(item["name"].strip().lower()) if category == "skill" else None
            if related:
                matched_weight += weight * _MINOR_GAP_CREDIT
                gaps.append(_related_skill_gap(item["name"], related))
            elif item["importance"] == "preferred":
                # Fully missing, but the job only ever called it "preferred" -- that's a minor
                # gap by definition, so it costs half its weight rather than all of it.
                matched_weight += weight * _MINOR_GAP_CREDIT
                gaps.append(_requirement_gap(category, item))
            else:
                gaps.append(_requirement_gap(category, item))

    if total_weight == 0:
        return schemas.GapAnalysis(
            score=None,
            gaps=[],
            matched_count=0,
            total_count=0,
            note=(
                "This job description didn't state a checkable years-of-experience figure, "
                "named skill, or certification, so there's nothing concrete to score against."
            ),
        )

    severity_order = {"blocking": 0, "minor": 1}
    gaps.sort(key=lambda gap: (severity_order[gap.severity], gap.category, gap.requirement))

    return schemas.GapAnalysis(
        score=round(100 * matched_weight / total_weight),
        gaps=gaps,
        matched_count=matched_count,
        total_count=total_count,
        note=None,
    )


def run_gap_analysis(ai_provider: AiProvider, job_description: str, profile: Dict[str, Any]) -> schemas.GapAnalysis:
    requirements = _extract_requirements(ai_provider, job_description)
    if requirements is None:
        return schemas.GapAnalysis(
            note="Gap analysis is unavailable: couldn't read structured requirements from this job description."
        )

    # Only spend a second AI call when there's actually something to check: skills required by
    # the job that the exact-text match didn't find, and a candidate skill list to compare them
    # against. If either is empty, related_skills stays {} and compute_gaps behaves as before.
    candidate_skills = [s for s in (profile.get("skills") or []) if isinstance(s, str) and s.strip()]
    haystack = _profile_evidence_text(profile)
    missing_skill_names = [
        item["name"]
        for item in _normalize_items(requirements.get("required_skills"))
        if not _has_evidence(item["name"], haystack)
    ]

    related_skills: Dict[str, str] = {}
    if missing_skill_names and candidate_skills:
        related_skills = _find_related_skills(ai_provider, missing_skill_names, candidate_skills)

    return compute_gaps(requirements, profile, related_skills=related_skills)


def serialize(gap_analysis: schemas.GapAnalysis) -> str:
    return gap_analysis.model_dump_json()


def deserialize(raw: Optional[str]) -> Optional[schemas.GapAnalysis]:
    if not raw:
        return None
    try:
        return schemas.GapAnalysis.model_validate_json(raw)
    except Exception:
        return None

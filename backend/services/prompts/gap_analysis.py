import json
import re
from typing import List, Optional, Tuple

_PUNCTUATION_RE = re.compile(r"[^\w\s]")


def _normalize_skill_name(name: str) -> str:
    """
    Lowercases and strips punctuation only. Deliberately does NOT strip any
    hardcoded list of "activity words" -- a list like that only knows one
    field (e.g. "release", "deployment" for software) and silently fails for
    every other profession this system serves (HR, banking, finance, skilled
    trades, healthcare, etc). The generic layer that replaces a word list is
    find_trivial_skill_match()'s token-subset check below, which works the
    same way regardless of vocabulary or industry.
    """
    return _PUNCTUATION_RE.sub("", name).lower().strip()


def find_trivial_skill_match(missing_skill: str, candidate_skills: List[str]) -> Optional[str]:
    """
    Plain-code, domain-agnostic check to run BEFORE build_related_skills_prompt.

    Catches the case where a required skill and a candidate skill are the same
    underlying thing, just phrased with an extra word attached -- in ANY field:
      - "Google Play Store release" vs "Google Play Store"      (software)
      - "Payroll processing" vs "Payroll"                       (HR)
      - "Loan underwriting" vs "Underwriting"                   (banking)
      - "Forklift operation" vs "Forklift"                      (warehouse/labor)
      - "Financial statement preparation" vs "Financial statements" (finance)

    The mechanism is generic on purpose: it does NOT recognize "release" or
    "processing" or "operation" as special words. It just checks whether one
    phrase's set of words is fully contained in the other's. That containment
    test is what generalizes across every profession without needing a
    hardcoded vocabulary list per industry -- it has no idea what a forklift
    or an underwriting is, it only compares word sets.

    Returns the matching candidate skill exactly as the candidate wrote it, or
    None if nothing trivially matches -- in which case it still may be a
    genuine candidate for the AI relatedness check (different NAMES for the
    same/adjacent thing, e.g. "Bitbucket" vs "GitHub", or "chartered
    accountant" vs "CPA" -- cases no amount of word-set comparison can catch,
    because the words themselves are completely different).
    """
    normalized_missing = _normalize_skill_name(missing_skill)
    if not normalized_missing:
        return None

    missing_words = set(normalized_missing.split())

    for candidate_skill in candidate_skills:
        normalized_candidate = _normalize_skill_name(candidate_skill)
        if not normalized_candidate:
            continue

        if normalized_missing == normalized_candidate:
            return candidate_skill

        candidate_words = set(normalized_candidate.split())
        if not candidate_words:
            continue

        # Whole-word-set containment, either direction. This is the
        # domain-agnostic replacement for a hardcoded activity-word list --
        # it only ever compares sets of words, never looks up a fixed
        # vocabulary, so it applies equally to a job posting for a software
        # engineer, a bank teller, an HR coordinator, or a machine operator.
        if missing_words <= candidate_words or candidate_words <= missing_words:
            return candidate_skill

    return None


def build_requirements_extraction_prompt(job_description: str) -> Tuple[str, str]:
    """
    Builds the system prompt and user prompt for extracting a job posting's explicit,
    checkable requirements. Works for a posting in any field -- software, finance,
    banking, HR, healthcare, skilled trades, retail, etc. This is EXTRACTION only --
    the actual gap analysis (comparing requirements against the candidate's profile,
    and computing years of experience) happens afterward with plain Python logic,
    never inside the model. Returns (system_prompt, user_prompt).
    """
    system_prompt = (
        "You are a REQUIREMENTS EXTRACTION assistant for a job posting in ANY field -- "
        "software, finance, banking, HR, healthcare, skilled trades, retail, or any other "
        "profession. Do not assume the posting is for a technical role. "
        "STRICT: only extract what is explicitly stated in the text below -- never infer a "
        "requirement from the job title, seniority level, or industry norms.\n\n"
        "EXTRACTION GUIDELINES:\n"
        "1. `min_years_experience`: a single number, only if the text literally states a minimum "
        "years-of-experience figure (e.g. \"5+ years\", \"at least 3 years\", \"3-5 years experience\" "
        "-> use 3, the low end of the range). If no such number appears anywhere, use null. Do not "
        "estimate a number from the seniority title alone (e.g. \"Senior\" does not imply a number).\n"
        "2. `required_skills`: an array of concrete skills, tools, platforms, systems, licenses-in-"
        "practice, or named competencies the text says the candidate should have -- whatever form "
        "those take in this specific field (a software platform, a piece of machinery, an "
        "accounting system, a clinical procedure, a regulatory framework, etc). Do not include "
        "generic soft skills (\"communication\", \"team player\") or the job title itself.\n"
        "   IMPORTANT -- extract the underlying skill/tool/system itself, not the task or activity "
        "performed with it, when the text names both together. For example: \"Google Play Store "
        "release\" -> \"Google Play Store\"; \"payroll processing\" -> \"payroll\"; \"forklift "
        "operation\" -> \"forklift\"; \"loan underwriting\" -> \"underwriting\". The task word "
        "(release, processing, operation, preparation, management, etc.) describes what the job "
        "wants done, not a separate skill -- keeping it attached causes false mismatches against a "
        "candidate who lists the same underlying skill without that exact task word. This rule "
        "applies the same way regardless of the field the posting is in.\n"
        "3. `required_certifications`: an array of specific named certifications, licenses, or "
        "credentials the text mentions (e.g. \"PMP\", \"AWS Certified Solutions Architect\", \"CPA\", "
        "\"RN license\", \"Series 7\", \"Red Seal certification\"). Do not include a degree "
        "requirement here -- that is not a certification.\n"
        "4. For every entry in `required_skills` and `required_certifications`, set `importance` to "
        "\"preferred\" ONLY if the text hedges it with language like \"preferred\", \"nice to have\", "
        "\"a plus\", \"bonus\", or \"desired\". Otherwise set it to \"required\" -- most requirement "
        "bullets are stated as compulsory even without the word \"required\" appearing.\n"
        "5. Never invent an item that is not named in the text, and never duplicate the same skill or "
        "certification under two different names.\n"
        "6. Return ONLY a valid, parseable JSON object -- no markdown code blocks, backticks, or "
        "commentary.\n\n"
        "OUTPUT JSON SCHEMA:\n"
        "{\n"
        '  "min_years_experience": 5,\n'
        '  "required_skills": [\n'
        '    {"name": "Python", "importance": "required"},\n'
        '    {"name": "Google Play Store", "importance": "required"},\n'
        '    {"name": "Payroll", "importance": "required"},\n'
        '    {"name": "Kubernetes", "importance": "preferred"}\n'
        "  ],\n"
        '  "required_certifications": [\n'
        '    {"name": "AWS Certified Solutions Architect", "importance": "preferred"}\n'
        "  ]\n"
        "}"
    )

    user_prompt = (
        "Here is the job posting text:\n\n"
        f"--- START JOB DESCRIPTION ---\n{job_description}\n--- END JOB DESCRIPTION ---\n\n"
        "Extract its requirements into the schema above. Return valid JSON only."
    )

    return system_prompt, user_prompt


def build_related_skills_prompt(missing_skills: List[str], candidate_skills: List[str]) -> Tuple[str, str]:
    """
    Builds the system prompt and user prompt for a bounded, GENERIC relatedness check that
    works across any profession -- software, finance, banking, HR, healthcare, skilled
    trades, etc. For skills the job requires that the candidate's profile doesn't literally
    mention, this asks three separate questions (see the three categories below), because
    collapsing them into one "related, so downgrade to minor" bucket was hiding a real bug:
    a candidate who lists Swift + SwiftUI was still shown "Xcode" as a MAJOR gap, and a
    candidate who lists Git + GitHub Actions was shown "GitLab" as a MAJOR gap. Neither is a
    genuine gap the same way "GraphQL" or "Unit testing" (never mentioned anywhere) is --
    Xcode is the mandatory tool you cannot write Swift/SwiftUI without, and GitLab is a
    directly swappable variant of the Git hosting/CI the candidate already demonstrably uses.
    Treating all three the same severity is what made the gap list read as noisy/wrong.

    This is deliberately an AI judgment call, not a hardcoded mapping, because the universe of
    "different name, same thing" and "mandatory companion tool" pairs is infinite across
    fields (e.g. "Bitbucket"/"GitHub" in software, "CPA"/"Chartered Professional Accountant"
    in finance, "Red Seal"/"journeyman certification" in skilled trades) -- no fixed list
    could cover every field this system is used for. The model reasons generically about
    whatever field the terms belong to, rather than being told a list of known equivalents.

    This never adds a skill to the candidate or silently removes a gap -- the calling code in
    services/gap_analysis.py decides severity per category (see mapping below), and only
    accepts a `candidate_skill` value that is verified, byte-for-byte case-insensitive, to
    actually be in the candidate's profile.

    IMPORTANT: call find_trivial_skill_match() on each missing skill FIRST and only pass
    skills here that came back None. That plain-code, domain-agnostic check already resolves
    same-thing-different-wording cases for free (see its docstring) -- this AI check exists
    only for genuinely different NAMES that word-matching cannot catch.

    SEVERITY MAPPING for the calling code (services/gap_analysis.py):
      "same_skill"     -> not a gap at all; drop it from the results entirely.
      "implied_skill"  -> not a gap; at most a "you likely already have this, add it to your
                          skill list explicitly" note. Never render as MAJOR.
      "related_skill"  -> minor gap ("transferable"), never MAJOR.
      no match found   -> genuine gap; severity stands (major/minor per your existing rule
                          based on the job posting's `importance` field).

    Returns (system_prompt, user_prompt).
    """
    system_prompt = (
        "You are a SKILL/QUALIFICATION RELATEDNESS assistant that works across EVERY "
        "profession -- software, finance, banking, HR, healthcare, skilled trades, retail, "
        "education, or any other field. You are given skills a job requires that a candidate's "
        "profile does not literally mention, and the skills the candidate's profile does "
        "literally list. (Cases where the two are the same thing phrased with an extra task "
        "word, e.g. \"payroll processing\" vs \"payroll\", have already been filtered out "
        "before reaching you -- only genuinely different NAMES remain.)\n\n"
        "For each missing item, classify it into exactly one of three categories by reasoning "
        "about what field these terms belong to and what a practitioner in that field would "
        "consider true -- do not rely on a fixed list of known pairs, since the terms could be "
        "from any profession:\n\n"
        "- \"same_skill\": the missing item and a candidate skill are the SAME real-world "
        "qualification, tool, system, or credential, just called by a different name or "
        "abbreviation (e.g. \"CPA\" and \"Chartered Professional Accountant\").\n"
        "- \"implied_skill\": the missing item is a tool, platform, or step that is PRACTICALLY "
        "MANDATORY to have used, given a skill the candidate already lists -- meaning it would "
        "be highly unusual or impossible to have genuine experience in the candidate's listed "
        "skill without having also used the missing item. Ask yourself: \"could someone "
        "realistically have done what the candidate's skill claims, without this?\" If no, it's "
        "implied. Examples: a candidate listing \"Swift\" and \"SwiftUI\" has necessarily used "
        "\"Xcode\" (it's the only IDE that compiles either); a candidate listing \"Apple App "
        "Store\" deployment has necessarily encountered \"TestFlight\" or code-signing "
        "certificates; a candidate listing \"React Native\" has necessarily used \"npm\" or "
        "\"yarn\". This is a STRONGER claim than related_skill below -- only use it when the "
        "dependency is genuinely near-unavoidable, not just common.\n"
        "- \"related_skill\": the missing item is a DIFFERENT, swappable tool, platform, or "
        "variant within the same narrow family as a candidate skill -- proficiency likely "
        "transfers, but it was NOT necessarily already used (e.g. \"GitLab\" vs a candidate who "
        "lists \"Git\"/\"GitHub\": both are Git hosting/CI platforms, skills transfer directly, "
        "but the candidate may genuinely never have opened GitLab specifically; \"QuickBooks\" "
        "vs \"Xero\" -- both small-business accounting platforms).\n\n"
        "Do NOT classify two items as related merely because they belong to the same broad "
        "field (\"Python\" and \"Java\" are both programming languages but are NOT related for "
        "this purpose; \"AWS\" and \"Azure\" are NOT related just because both are cloud "
        "providers). The match must be narrow and specific, not merely same-industry.\n"
        "For every `candidate_skill` value you return, copy it EXACTLY as it appears in the "
        "candidate's skill list below -- never invent, rename, paraphrase, or partially quote "
        "a skill the candidate doesn't list verbatim. If nothing in the candidate's list is "
        "genuinely the same, implied by, or related to a missing item, leave that missing item "
        "out of the results entirely -- it's a real gap.\n"
        "Return ONLY a valid, parseable JSON object -- no markdown code blocks, backticks, or "
        "commentary.\n\n"
        "OUTPUT JSON SCHEMA:\n"
        "{\n"
        '  "matches": [\n'
        '    {"missing_skill": "Chartered Professional Accountant", "candidate_skill": "CPA", '
        '"category": "same_skill"},\n'
        '    {"missing_skill": "Xcode", "candidate_skill": "SwiftUI", '
        '"category": "implied_skill"},\n'
        '    {"missing_skill": "GitLab", "candidate_skill": "Git", '
        '"category": "related_skill"}\n'
        "  ]\n"
        "}"
    )

    user_prompt = (
        "Skills/qualifications the job requires that were NOT found in the candidate's profile:\n"
        f"{json.dumps(missing_skills)}\n\n"
        "Skills/qualifications the candidate's profile actually lists:\n"
        f"{json.dumps(candidate_skills)}\n\n"
        "Classify each match following the schema above. Return valid JSON only."
    )

    return system_prompt, user_prompt
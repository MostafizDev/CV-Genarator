from datetime import date

import pytest

import schemas
import services.ai.router as ai_router
from services import gap_analysis as ga
from tests.test_api import MockAiProvider, _client_as, client, setup_db  # noqa: F401  (client/setup_db are fixtures)


# --- date parsing --------------------------------------------------------------------

TODAY = date(2026, 6, 15)


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Mar 2021", (2021, 3)),
        ("March 2021", (2021, 3)),
        ("2021-03", (2021, 3)),
        ("2021/03-15", (2021, 3)),
        ("03/2021", (2021, 3)),
        ("2021", (2021, 1)),
        ("2021 March", (2021, 3)),
        ("Present", (2026, 6)),
        ("Current", (2026, 6)),
    ],
)
def test_parse_month_year_recognized_formats(text, expected):
    assert ga._parse_month_year(text, today=TODAY) == expected


@pytest.mark.parametrize("text", [None, "", "sometime last year", "N/A", "TBD"])
def test_parse_month_year_unparseable_or_missing_returns_none(text):
    assert ga._parse_month_year(text, today=TODAY) is None


# --- total years of experience --------------------------------------------------------

def test_total_years_sums_sequential_roles():
    experiences = [
        {"company": "A", "start_date": "Jan 2018", "end_date": "Dec 2019"},  # 24 months
        {"company": "B", "start_date": "Jan 2020", "end_date": "Present"},  # 78 months to Jun 2026
    ]
    assert ga.total_months_of_experience(experiences, today=TODAY) == 24 + 78
    assert ga.total_years_of_experience(experiences, today=TODAY) == round((24 + 78) / 12, 1)


def test_total_years_merges_overlapping_roles_instead_of_double_counting():
    experiences = [
        {"start_date": "Jan 2020", "end_date": "Dec 2021"},
        {"start_date": "Jun 2021", "end_date": "Jun 2022"},  # overlaps Jun-Dec 2021
    ]
    # Merged span: Jan 2020 -> Jun 2022 = 30 months, not 24 + 13 = 37.
    assert ga.total_months_of_experience(experiences, today=TODAY) == 30


def test_total_years_skips_entries_with_unparseable_or_missing_start_date():
    experiences = [
        {"start_date": "", "end_date": "Present"},
        {"start_date": None, "end_date": "Present"},
        {"start_date": "Jan 2024", "end_date": "Dec 2024"},  # Jan..Dec inclusive = 12 months
    ]
    assert ga.total_months_of_experience(experiences, today=TODAY) == 12


def test_total_years_treats_blank_or_missing_end_date_as_still_ongoing():
    # A start date with no end_date at all (or an empty string) means "current role", matching
    # how the profile schema stores it -- NOT "unparseable, skip this experience".
    for end_date in (None, ""):
        experiences = [{"start_date": "Jan 2026", "end_date": end_date}]
        assert ga.total_months_of_experience(experiences, today=TODAY) == 6  # Jan..Jun 2026


def test_total_years_skips_malformed_range_where_end_precedes_start():
    experiences = [{"start_date": "Jan 2024", "end_date": "Jan 2020"}]
    assert ga.total_months_of_experience(experiences, today=TODAY) == 0


def test_total_years_with_no_experience_is_zero():
    assert ga.total_years_of_experience([], today=TODAY) == 0
    assert ga.total_years_of_experience(None, today=TODAY) == 0


# --- evidence matching -----------------------------------------------------------

def test_has_evidence_matches_whole_words_only():
    haystack = ga._normalize("Python FastAPI React ci cd pipelines")
    assert ga._has_evidence("Python", haystack)
    assert ga._has_evidence("CI/CD", haystack)
    assert not ga._has_evidence("Pythonic", haystack)  # not the same word as "python"
    assert not ga._has_evidence("Java", haystack)


def test_profile_evidence_text_covers_skills_certs_bullets_and_projects():
    profile = {
        "skills": ["Python"],
        "certifications": [{"name": "AWS Certified Solutions Architect"}],
        "experiences": [{"title": "Backend Engineer", "bullet_points": ["Built services with Go and Kafka"]}],
        "projects": [{"tech_stack": "Rust, WASM", "description": "A compiler"}],
    }
    haystack = ga._profile_evidence_text(profile)
    for term in ("Python", "AWS Certified Solutions Architect", "Go", "Kafka", "Rust", "compiler"):
        assert ga._has_evidence(term, haystack), term


# --- compute_gaps: the actual gap/score logic -----------------------------------------

BASE_PROFILE = {
    "skills": ["Python", "FastAPI"],
    "certifications": [],
    "experiences": [{"start_date": "Jan 2021", "end_date": "Present"}],  # ~5.5 years as of TODAY
    "projects": [],
}


def test_no_extracted_requirements_yields_no_score_and_a_note():
    result = ga.compute_gaps({}, BASE_PROFILE)
    assert result.score is None and result.gaps == [] and result.total_count == 0
    assert "note" not in {} and result.note  # a note is always given when nothing was checkable


def test_experience_met_produces_no_gap_and_full_credit(monkeypatch):
    monkeypatch.setattr(ga, "total_years_of_experience", lambda experiences, today=None: 6.0)
    result = ga.compute_gaps({"min_years_experience": 5}, BASE_PROFILE)
    assert result.gaps == [] and result.score == 100 and result.matched_count == 1


def test_experience_shortfall_severity_thresholds(monkeypatch):
    monkeypatch.setattr(ga, "total_years_of_experience", lambda experiences, today=None: 4.5)
    minor = ga.compute_gaps({"min_years_experience": 5}, BASE_PROFILE)
    assert len(minor.gaps) == 1 and minor.gaps[0].severity == "minor"
    assert minor.gaps[0].category == "experience"
    assert "5+ years" in minor.gaps[0].requirement and "4.5 years" in minor.gaps[0].candidate_has

    monkeypatch.setattr(ga, "total_years_of_experience", lambda experiences, today=None: 2.0)
    blocking = ga.compute_gaps({"min_years_experience": 5}, BASE_PROFILE)
    assert blocking.gaps[0].severity == "blocking"
    # Partial credit for 2/5 years, not zero.
    assert 0 < blocking.score < 100


def test_missing_required_skill_is_blocking_missing_preferred_skill_is_minor():
    requirements = {
        "required_skills": [
            {"name": "Python", "importance": "required"},  # present -> no gap
            {"name": "Go", "importance": "required"},  # missing, required -> blocking
            {"name": "Kubernetes", "importance": "preferred"},  # missing, preferred -> minor
        ]
    }
    result = ga.compute_gaps(requirements, BASE_PROFILE)
    by_requirement = {g.requirement: g for g in result.gaps}
    assert set(by_requirement) == {"Go", "Kubernetes"}
    assert by_requirement["Go"].severity == "blocking" and by_requirement["Go"].category == "skill"
    assert by_requirement["Kubernetes"].severity == "minor"
    assert result.matched_count == 1 and result.total_count == 3


def test_missing_certification_gap():
    requirements = {"required_certifications": [{"name": "PMP", "importance": "required"}]}
    result = ga.compute_gaps(requirements, BASE_PROFILE)
    assert len(result.gaps) == 1
    gap = result.gaps[0]
    assert (gap.category, gap.severity, gap.requirement) == ("certification", "blocking", "PMP")
    assert gap.candidate_has == "Not found in your saved profile"


def test_present_certification_produces_no_gap():
    profile = {**BASE_PROFILE, "certifications": [{"name": "PMP"}]}
    requirements = {"required_certifications": [{"name": "PMP", "importance": "required"}]}
    result = ga.compute_gaps(requirements, profile)
    assert result.gaps == [] and result.score == 100


def test_gaps_are_sorted_blocking_before_minor():
    requirements = {
        "required_skills": [
            {"name": "Rust", "importance": "preferred"},
            {"name": "Go", "importance": "required"},
        ]
    }
    result = ga.compute_gaps(requirements, BASE_PROFILE)
    assert [g.severity for g in result.gaps] == ["blocking", "minor"]


def test_tolerates_plain_string_items_and_non_numeric_years():
    requirements = {"min_years_experience": "five", "required_skills": ["Go"]}
    result = ga.compute_gaps(requirements, BASE_PROFILE)
    # The bogus min_years_experience is ignored entirely; the plain-string skill still counts.
    assert result.total_count == 1
    assert result.gaps[0].requirement == "Go" and result.gaps[0].severity == "blocking"


# --- related skills: a missing skill that's really a variant of one the candidate has -------

def test_compute_gaps_downgrades_a_related_missing_skill_to_minor_with_partial_credit():
    # The job requires Bitbucket (required); the candidate doesn't list it, but "GitHub" was
    # verified as related and passed in -- so this is a minor gap with partial credit, not a
    # blocking "not found at all", even though the job phrased it as required.
    requirements = {"required_skills": [{"name": "Bitbucket", "importance": "required"}]}
    result = ga.compute_gaps(requirements, BASE_PROFILE, related_skills={"bitbucket": "GitHub"})
    assert len(result.gaps) == 1
    gap = result.gaps[0]
    assert (gap.category, gap.severity, gap.requirement) == ("skill", "minor", "Bitbucket")
    assert 'you have "GitHub"' in gap.candidate_has
    assert "GitHub" in gap.recommendation and "Bitbucket" in gap.recommendation
    # Partial (not zero, not full) credit toward the score for a required-but-related skill.
    assert 0 < result.score < 100


def test_compute_gaps_ignores_related_skills_lookup_for_certifications():
    # related_skills only ever applies to the "skill" category -- a matching key under a
    # certification name must not soften it (there's no certification-relatedness feature).
    requirements = {"required_certifications": [{"name": "PMP", "importance": "required"}]}
    result = ga.compute_gaps(requirements, BASE_PROFILE, related_skills={"pmp": "Something"})
    assert result.gaps[0].severity == "blocking" and result.gaps[0].category == "certification"


def test_find_related_skills_matches_and_verifies_against_the_candidates_real_skills():
    class Provider:
        def generate(self, prompt, system_prompt=""):
            return json.dumps(
                {
                    "matches": [
                        {"missing_skill": "TestFlight", "related_skill": "App Store"},
                        {"missing_skill": "Bitbucket", "related_skill": "GitHub"},
                    ]
                }
            )

    result = ga._find_related_skills(Provider(), ["TestFlight", "Bitbucket"], ["App Store", "GitHub", "Swift"])
    assert result == {"testflight": "App Store", "bitbucket": "GitHub"}


def test_find_related_skills_discards_a_match_the_candidate_does_not_actually_have():
    # The model claims the candidate has "GitLab", but the candidate's real skill list doesn't
    # include it -- that answer must be thrown out, never trusted at face value.
    class Provider:
        def generate(self, prompt, system_prompt=""):
            return json.dumps({"matches": [{"missing_skill": "Bitbucket", "related_skill": "GitLab"}]})

    result = ga._find_related_skills(Provider(), ["Bitbucket"], ["GitHub", "Python"])
    assert result == {}


def test_find_related_skills_ignores_a_missing_skill_not_in_the_requested_list():
    # Even a verified related_skill is ignored if it's for a skill we never asked about.
    class Provider:
        def generate(self, prompt, system_prompt=""):
            return json.dumps({"matches": [{"missing_skill": "Docker", "related_skill": "GitHub"}]})

    result = ga._find_related_skills(Provider(), ["Bitbucket"], ["GitHub"])
    assert result == {}


def test_find_related_skills_returns_empty_on_bad_json_or_wrong_shape():
    class Garbage:
        def generate(self, prompt, system_prompt=""):
            return "not json"

    class WrongShape:
        def generate(self, prompt, system_prompt=""):
            return json.dumps({"matches": "not a list"})

    assert ga._find_related_skills(Garbage(), ["Bitbucket"], ["GitHub"]) == {}
    assert ga._find_related_skills(WrongShape(), ["Bitbucket"], ["GitHub"]) == {}


def test_run_gap_analysis_softens_related_skills_using_the_candidates_real_skill_list():
    # End-to-end, mirroring the exact scenario reported: job wants App Store + TestFlight +
    # Bitbucket; candidate's profile lists App Store, Git and GitHub (not TestFlight/Bitbucket
    # by name). TestFlight and Bitbucket should come back as minor, related gaps -- not blocking.
    profile = {**BASE_PROFILE, "skills": ["App Store", "Git", "GitHub"]}

    class Provider:
        def generate(self, prompt, system_prompt=""):
            if "REQUIREMENTS EXTRACTION" in system_prompt:
                return json.dumps(
                    {
                        "required_skills": [
                            {"name": "App Store", "importance": "required"},
                            {"name": "TestFlight", "importance": "required"},
                            {"name": "Bitbucket", "importance": "required"},
                        ]
                    }
                )
            assert "SKILL RELATEDNESS" in system_prompt
            return json.dumps(
                {
                    "matches": [
                        {"missing_skill": "TestFlight", "related_skill": "App Store"},
                        {"missing_skill": "Bitbucket", "related_skill": "GitHub"},
                    ]
                }
            )

    result = ga.run_gap_analysis(Provider(), "Needs App Store, TestFlight, and Bitbucket.", profile)
    by_requirement = {g.requirement: g for g in result.gaps}
    assert "App Store" not in by_requirement  # exact match, no gap at all
    assert by_requirement["TestFlight"].severity == "minor"
    assert 'you have "App Store"' in by_requirement["TestFlight"].candidate_has
    assert by_requirement["Bitbucket"].severity == "minor"
    assert 'you have "GitHub"' in by_requirement["Bitbucket"].candidate_has
    assert 0 < result.score < 100


def test_run_gap_analysis_skips_the_relatedness_call_when_nothing_is_missing_or_no_skills():
    calls = []

    class Provider:
        def generate(self, prompt, system_prompt=""):
            calls.append(system_prompt)
            if "REQUIREMENTS EXTRACTION" in system_prompt:
                return json.dumps({"required_skills": [{"name": "Python", "importance": "required"}]})
            return json.dumps({"matches": []})

    # Nothing missing (Python is in BASE_PROFILE's skills) -> only the extraction call happens.
    ga.run_gap_analysis(Provider(), "job", BASE_PROFILE)
    assert len(calls) == 1

    # Something missing (Python, since there are no skills to match against), but the
    # candidate has no skills at all to compare against -> still only the extraction call.
    calls.clear()
    ga.run_gap_analysis(Provider(), "job", {**BASE_PROFILE, "skills": []})
    assert len(calls) == 1


# --- run_gap_analysis: the AI extraction step ------------------------------------

def test_run_gap_analysis_returns_a_note_when_the_model_output_is_not_json():
    class Garbage:
        def generate(self, prompt, system_prompt=""):
            return "not json at all"

    result = ga.run_gap_analysis(Garbage(), "Some job description", BASE_PROFILE)
    assert result.score is None and result.gaps == [] and "unavailable" in result.note


def test_run_gap_analysis_strips_markdown_code_fences():
    class Fenced:
        def generate(self, prompt, system_prompt=""):
            return '```json\n{"required_skills": [{"name": "Go", "importance": "required"}]}\n```'

    result = ga.run_gap_analysis(Fenced(), "job", BASE_PROFILE)
    assert result.gaps and result.gaps[0].requirement == "Go"


def test_serialize_and_deserialize_round_trip():
    original = ga.compute_gaps({"required_skills": [{"name": "Go", "importance": "required"}]}, BASE_PROFILE)
    restored = ga.deserialize(ga.serialize(original))
    assert restored == original


def test_deserialize_tolerates_missing_or_malformed_data():
    assert ga.deserialize(None) is None
    assert ga.deserialize("") is None
    assert ga.deserialize("not json") is None


# --- end-to-end through /api/generate --------------------------------------------

PROFILE_PAYLOAD = {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555 123 4567",
    "location": "New York, NY",
    "summary": "Experienced engineer.",
    "skills": ["Python", "FastAPI", "React"],
    "experiences": [
        {
            "company": "Tech Corp",
            "title": "Lead Software Engineer",
            "start_date": "Jan 2021",
            "end_date": "Present",
            "bullet_points": ["Architected high-throughput microservices."],
        }
    ],
    "projects": [],
    "certifications": [],
    "education": [],
}


def _mock_get_provider(db, user_id=None, provider_override=None):
    return ai_router.ResolvedProvider(provider=MockAiProvider(), provider_name="groq", model="llama-3.3-70b-versatile")


def test_generate_endpoint_returns_and_persists_gap_analysis(client, monkeypatch):
    client.post("/api/profile", json=PROFILE_PAYLOAD)
    client.post(
        "/api/settings",
        json={"provider": "groq", "api_key": "gsk_test_key", "model": "llama-3.3-70b-versatile", "is_default": True},
    )
    monkeypatch.setattr(ai_router, "get_provider", _mock_get_provider)

    res = client.post(
        "/api/generate",
        json={
            "company": "InnovateTech",
            "position": "Staff Backend Engineer",
            "job_description": "We need 5+ years experience with Python and Go.",
        },
    )
    assert res.status_code == 200
    body = res.json()
    gap = body["gap_analysis"]
    # MockAiProvider's extraction branch: min 5 years, Python (present) + Go (missing, required).
    assert gap["score"] is not None
    assert any(g["requirement"] == "Go" and g["severity"] == "blocking" for g in gap["gaps"])
    assert not any(g["requirement"] == "Python" for g in gap["gaps"])

    application_id = body["application_id"]
    fetched = client.get(f"/api/applications/{application_id}").json()
    assert fetched["gap_analysis"] == gap  # persisted and returned identically on refetch

    # The stored value is encrypted at rest, like the rest of the application row -- read it
    # with a raw query, since going through the ORM would transparently decrypt it back.
    from sqlalchemy import text as sql_text

    from tests.test_api import test_engine

    with test_engine.connect() as conn:
        raw_stored = conn.execute(
            sql_text("select gap_analysis from applications where id = :id"), {"id": application_id}
        ).scalar()
    # (Not asserting on the ciphertext's content: it's base64 of random-looking encrypted
    # bytes, so a short substring like "Go" can coincidentally appear in it by pure chance
    # depending on the nonce -- that would make this test flaky without proving anything
    # test_security.py's dedicated encryption tests don't already cover with longer, safe
    # values.)
    assert raw_stored.startswith("enc:")


def test_generate_endpoint_still_succeeds_when_gap_analysis_extraction_fails(client, monkeypatch):
    class BrokenExtractionProvider(MockAiProvider):
        def generate(self, prompt, system_prompt=""):
            if "REQUIREMENTS EXTRACTION" in system_prompt:
                raise RuntimeError("provider is down")
            return super().generate(prompt, system_prompt)

    client.post("/api/profile", json=PROFILE_PAYLOAD)
    client.post(
        "/api/settings",
        json={"provider": "groq", "api_key": "gsk_test_key", "model": "llama-3.3-70b-versatile", "is_default": True},
    )
    monkeypatch.setattr(
        ai_router,
        "get_provider",
        lambda db, user_id=None, provider_override=None: ai_router.ResolvedProvider(
            provider=BrokenExtractionProvider(), provider_name="groq", model="llama-3.3-70b-versatile"
        ),
    )

    res = client.post(
        "/api/generate",
        json={"company": "A", "position": "B", "job_description": "Needs Python."},
    )
    assert res.status_code == 200  # CV/cover letter generation is unaffected
    body = res.json()
    assert "cv" in body and body["cover_letter"]
    assert body["gap_analysis"]["score"] is None
    assert "unavailable" in body["gap_analysis"]["note"]


def test_applications_list_endpoint_does_not_include_gap_analysis(client, monkeypatch):
    """The list view stays light, consistent with generated_cv already being left out of it."""
    client.post("/api/profile", json=PROFILE_PAYLOAD)
    client.post(
        "/api/settings",
        json={"provider": "groq", "api_key": "gsk_test_key", "model": "llama-3.3-70b-versatile", "is_default": True},
    )
    monkeypatch.setattr(ai_router, "get_provider", _mock_get_provider)
    client.post("/api/generate", json={"company": "A", "position": "B", "job_description": "Needs Python and Go."})

    listed = client.get("/api/applications").json()
    assert listed and "gap_analysis" not in listed[0] and "generated_cv" not in listed[0]


# --- disabling Gap Analysis in Preferences must spend zero extra AI calls -----------------

def test_disabling_gap_analysis_makes_no_gap_analysis_ai_calls(client, monkeypatch):
    """Empirical proof, not just code review: records every system_prompt sent to the AI
    provider during a full /api/generate call with the preference off, and asserts neither
    the requirements-extraction prompt nor the related-skills prompt was ever sent -- only
    the CV and cover-letter prompts. Compares against the same call with it left on, which
    must trigger the requirements-extraction prompt."""
    calls = []

    class RecordingProvider(MockAiProvider):
        def generate(self, prompt, system_prompt=""):
            calls.append(system_prompt)
            return super().generate(prompt, system_prompt)

    def mock_get_provider(db, user_id=None, provider_override=None):
        return ai_router.ResolvedProvider(
            provider=RecordingProvider(), provider_name="groq", model="llama-3.3-70b-versatile"
        )

    client.post("/api/profile", json=PROFILE_PAYLOAD)
    client.post(
        "/api/settings",
        json={"provider": "groq", "api_key": "gsk_test_key", "model": "llama-3.3-70b-versatile", "is_default": True},
    )
    monkeypatch.setattr(ai_router, "get_provider", mock_get_provider)
    payload = {"company": "A", "position": "B", "job_description": "Needs 5+ years, Python and Go."}

    # -- OFF: turn the preference off, then generate. --
    put_res = client.put("/api/preferences", json={"gap_analysis_enabled": False})
    assert put_res.json() == {"gap_analysis_enabled": False}

    off_res = client.post("/api/generate", json=payload)
    assert off_res.status_code == 200
    off_body = off_res.json()
    assert off_body["gap_analysis"] is None  # nothing returned to the frontend either
    assert len(calls) == 2  # exactly: CV generation + cover letter -- nothing else
    assert not any("REQUIREMENTS EXTRACTION" in p for p in calls)
    assert not any("SKILL RELATEDNESS" in p for p in calls)

    fetched = client.get(f"/api/applications/{off_body['application_id']}").json()
    assert fetched["gap_analysis"] is None  # nothing persisted for this application either

    # -- Sanity check the test's own instrumentation: ON must add the extraction call. --
    calls.clear()
    client.put("/api/preferences", json={"gap_analysis_enabled": True})
    on_res = client.post("/api/generate", json=payload)
    assert on_res.json()["gap_analysis"] is not None
    assert any("REQUIREMENTS EXTRACTION" in p for p in calls)

from typing import Tuple


def build_parse_cv_prompt(raw_text: str) -> Tuple[str, str]:
    """
    Builds the system prompt and user prompt for parsing raw resume text into a structured profile.
    Returns (system_prompt, user_prompt).
    """
    system_prompt = (
        "You are an expert HR data parsing assistant. "
        "Your task is to parse raw text extracted from a candidate's resume/CV into a strictly structured JSON object "
        "matching the candidate profile schema.\n\n"
        "EXTRACTION GUIDELINES:\n"
        "1. This is EXTRACTION, not writing. Every fact in your output must be traceable to specific words in the source text below. Do NOT invent, infer, or add: employer/client/organization names not literally written in the source; user counts, scale figures, or any other statistic not literally written in the source; an industry, product type, or purpose more specific than what the source states (e.g. if the source says a project is \"for digital collectors\", do not turn it into \"an NFT trading platform\"); a government body, ministry, or institutional affiliation not literally named in the source; app store availability, geographic reach, or partnerships not literally stated in the source. If a detail isn't in the text, leave it out rather than filling the gap with a plausible-sounding guess.\n"
        "2. Parse contact info (full name, email, phone, location, linkedin URL, portfolio/website URL) exactly as written -- do not normalize, guess, or complete a partial value.\n"
        "3. The summary must be assembled ONLY from claims made elsewhere in the source text -- you may condense and rephrase, but introduce no new claim, employer, technology, or achievement that isn't stated elsewhere in the document.\n"
        "4. Extract an array of discrete skills (technical skills, tools, languages, frameworks, methodologies) that are explicitly named in the source text. Do not add a skill because it is commonly paired with one that IS named (e.g. do not add \"React Native\" just because \"Flutter\" is present).\n"
        "5. Extract work experiences into a list of objects, each containing: company, title, start_date, end_date (or null if current), and bullet_points (list of strings), copied and lightly cleaned up from the source -- do not add detail beyond what each bullet already says.\n"
        "6. Extract projects into a list of objects: name, description, tech_stack, link (or null) -- description and tech_stack must only restate what the source says about that specific project.\n"
        "7. Extract certifications into a list of objects: name, issuer, date_earned (or null).\n"
        "8. Extract education history into a list of objects: institution, degree, field (or null), graduation_year (or null). Copy the degree/field text verbatim -- do not duplicate or repeat any part of it.\n"
        "9. You MUST return ONLY a valid, parseable JSON object without markdown code blocks, backticks, or extra commentary.\n\n"
        "OUTPUT JSON SCHEMA:\n"
        "{\n"
        '  "full_name": "Full Name",\n'
        '  "email": "email@example.com",\n'
        '  "phone": "+1 555 123 4567",\n'
        '  "location": "City, State or Country",\n'
        '  "linkedin": "https://linkedin.com/in/username or null",\n'
        '  "portfolio_url": "https://portfolio.dev or null",\n'
        '  "summary": "Professional summary...",\n'
        '  "skills": ["Skill 1", "Skill 2", ...],\n'
        '  "experiences": [\n'
        "    {\n"
        '      "company": "Company Name",\n'
        '      "title": "Job Title",\n'
        '      "start_date": "Start Date",\n'
        '      "end_date": "End Date or Present",\n'
        '      "bullet_points": ["Achievement 1", "Achievement 2"]\n'
        "    }\n"
        "  ],\n"
        '  "projects": [\n'
        "    {\n"
        '      "name": "Project Name",\n'
        '      "description": "Project details",\n'
        '      "tech_stack": "Tech stack used",\n'
        '      "link": "URL or null"\n'
        "    }\n"
        "  ],\n"
        '  "certifications": [\n'
        "    {\n"
        '      "name": "Certification Name",\n'
        '      "issuer": "Issuer",\n'
        '      "date_earned": "Year/Date or null"\n'
        "    }\n"
        "  ],\n"
        '  "education": [\n'
        "    {\n"
        '      "institution": "Institution Name",\n'
        '      "degree": "Degree",\n'
        '      "field": "Field of study or null",\n'
        '      "graduation_year": "Year or null"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        "Here is the raw resume document text to parse:\n\n"
        f"--- START RESUME TEXT ---\n{raw_text}\n--- END RESUME TEXT ---\n\n"
        "Parse the resume text into the requested JSON schema. Return valid JSON only."
    )

    return system_prompt, user_prompt

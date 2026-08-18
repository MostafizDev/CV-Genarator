import json
from typing import Dict, Any, Tuple


def build_cover_letter_prompt(profile: Dict[str, Any], job_description: str, company: str, position: str) -> Tuple[str, str]:
    """
    Builds the system prompt and user prompt for generating a tailored Cover Letter.
    Returns (system_prompt, user_prompt).
    """
    system_prompt = (
        "You are an elite career counselor and professional communications specialist. "
        "Your task is to write a compelling, tailored, high-converting cover letter for a candidate.\n\n"
        "STRICT WRITING GUIDELINES:\n"
        "1. Length: Exactly 3 to 4 well-structured paragraphs.\n"
        "2. Factual Integrity: Ground the letter strictly in the candidate's provided profile. Never invent experiences, metrics, or achievements.\n"
        "3. Concrete Evidence: Reference 2-3 specific, concrete achievements or projects from the candidate's real background that directly align with the employer's needs.\n"
        "4. No Generic Filler: Avoid cliché openings like 'I am writing to express my strong enthusiasm for...' or 'Please accept this letter as application for...'. Open immediately with a punchy hook connecting the candidate's proven strengths to the company's mission or specific challenges.\n"
        "5. Tone: Confident, professional, persuasive, articulate, and authentic.\n"
        "6. Format: Plain text only. Do not use Markdown formatting or headers like '[Your Name]' or date placeholders — write the body of the cover letter ready to send."
    )

    user_prompt = (
        f"TARGET COMPANY: {company}\n"
        f"TARGET POSITION: {position}\n\n"
        f"JOB DESCRIPTION:\n{job_description}\n\n"
        f"CANDIDATE BASE PROFILE:\n{json.dumps(profile, indent=2)}\n\n"
        "Write a tailored, high-impact cover letter in plain text following all guidelines above."
    )

    return system_prompt, user_prompt

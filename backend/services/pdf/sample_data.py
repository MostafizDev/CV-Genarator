"""Fixed sample CV/cover-letter content used only for template previews (see
routers/templates.py's /preview endpoint and the frontend Templates gallery) --
never used for a real export. Every template preview shows this same persona so
users can compare template designs on equal footing, unrelated to their own profile.
"""

SAMPLE_CV = {
    "full_name": "Kelly Blackwell",
    "title": "Administrative Assistant",
    "email": "kelly.blackwell@gmail.com",
    "phone": "(210) 286-1624",
    "location": "San Antonio, TX 78023",
    "linkedin": "",
    "portfolio_url": "",
    "summary": (
        "Administrative assistant with 9+ years of experience organizing presentations, "
        "preparing facility reports, and maintaining the utmost confidentiality. Possess a "
        "B.A. in history and expertise in Microsoft Excel. Looking to leverage my wealth of "
        "knowledge and experience into the open administrative assistant role at your "
        "organization."
    ),
    "skills": [
        "Analytical Thinking",
        "Tolerant & Flexible",
        "Team Leadership",
        "Organization & Prioritization",
        "Strong Communication",
        "Web app development",
        "Computer engineering",
        "Web security",
    ],
    "experience": [
        {
            "company": "Redford & Sons",
            "title": "Administrative Assistant",
            "start_date": "September 2017",
            "end_date": "Present",
            "bullet_points": [
                "Schedule and coordinate meetings, appointments, and travel arrangements "
                "for supervisors, managers, and C-level executives",
                "Trained 2 administrative assistants during a period of company expansion "
                "to ensure attention to detail and adherence to company policy",
                "Developed new filing and organizational practices, saving the company "
                "$3,000 per year in contracted labor expenses",
            ],
        },
        {
            "company": "Bright Spot LTD",
            "title": "Secretary",
            "start_date": "June 2016",
            "end_date": "August 2017",
            "bullet_points": [
                "Typed documents such as correspondence, drafts, memos, and emails, and "
                "prepared 3 reports weekly for management",
                "Opened, sorted, and distributed incoming messages and correspondence to "
                "the appropriate personnel",
                "Greeted visitors and determined to whom and when they could speak with "
                "specific individuals",
            ],
        },
    ],
    "projects": [],
    "certifications": [
        {"name": "CPR Certified", "issuer": "", "date_earned": "2018"},
        {"name": "PMP Certified", "issuer": "", "date_earned": "2009"},
    ],
    "education": [
        {
            "institution": "Brown University",
            "degree": "Bachelor of Arts (B.A.)",
            "field": "Finance",
            "graduation_year": "05/2009",
        },
        {
            "institution": "San Antonio Community College",
            "degree": "Associate of Arts",
            "field": "Business",
            "graduation_year": "05/2007",
        },
    ],
    "languages": ["Irish (Native)", "English (Native)"],
}

SAMPLE_COVER_LETTER_TEXT = (
    "Dear Hiring Manager,\n\n"
    "I am excited to apply for the Administrative Assistant position at your organization. "
    "With over 9 years of experience organizing presentations, preparing facility reports, "
    "and maintaining the utmost confidentiality, I am confident I would be a valuable "
    "addition to your team.\n\n"
    "In my current role at Redford & Sons, I schedule and coordinate meetings, appointments, "
    "and travel arrangements for supervisors, managers, and C-level executives, and developed "
    "new filing and organizational practices that saved the company $3,000 per year in "
    "contracted labor expenses.\n\n"
    "I would welcome the opportunity to bring this same level of dedication and organization "
    "to your organization.\n\n"
    "Sincerely,\n"
    "Kelly Blackwell"
)

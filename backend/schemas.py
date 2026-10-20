import re
from datetime import datetime
from typing import List, Optional, Any, Dict, Literal, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator

APPLICATION_STATUSES = ("Generated", "Applied", "Interview", "Offer", "Rejected")


class ExperienceBase(BaseModel):
    company: str = ""
    title: str = ""
    start_date: str = ""
    end_date: Optional[str] = None
    bullet_points: List[str] = []


class ExperienceSchema(ExperienceBase):
    id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str = ""
    description: str = ""
    tech_stack: str = ""
    link: Optional[str] = None


class ProjectSchema(ProjectBase):
    id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class CertificationBase(BaseModel):
    name: str = ""
    issuer: str = ""
    date_earned: Optional[str] = None


class CertificationSchema(CertificationBase):
    id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class EducationBase(BaseModel):
    institution: str = ""
    degree: str = ""
    field: Optional[str] = None
    graduation_year: Optional[str] = None


class EducationSchema(EducationBase):
    id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class ProfileBase(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: str = ""
    skills: List[str] = []


class ProfileSchema(ProfileBase):
    id: Optional[int] = None
    experiences: List[ExperienceSchema] = []
    projects: List[ProjectSchema] = []
    certifications: List[CertificationSchema] = []
    education: List[EducationSchema] = []

    model_config = ConfigDict(from_attributes=True)


class ProfileSaveRequest(ProfileBase):
    experiences: List[ExperienceBase] = []
    projects: List[ProjectBase] = []
    certifications: List[CertificationBase] = []
    education: List[EducationBase] = []


class ProviderSettingSchema(BaseModel):
    """What the browser sees of a saved provider. The API key itself is write-only: it is
    never sent back, only whether one is saved and its last four characters."""

    id: Optional[int] = None
    provider: str = "openai"
    has_api_key: bool = False
    api_key_hint: str = ""
    model: str = "gpt-4o-mini"
    is_default: bool = False


class ProviderSettingCreate(BaseModel):
    provider: str = "openai"
    # Blank means "keep the key that's already saved".
    api_key: str = ""
    model: str = "gpt-4o-mini"
    is_default: bool = False


FilenameField = Literal["first_name", "last_name", "year_of_experience", "company", "designation"]


class UserPreferences(BaseModel):
    """Feature toggles the user controls from Settings -> Preferences. New settings (e.g. a
    future notifications toggle) are added here as another field with its own default --
    existing stored preferences JSON without that key just falls back to the default."""

    gap_analysis_enabled: bool = True
    # Which pieces go into an exported CV/cover-letter PDF's filename, and in what order.
    # Default matches the filename used before this preference existed ("CV_<company>.pdf").
    pdf_filename_fields: List[FilenameField] = ["company"]

    @field_validator("pdf_filename_fields")
    @classmethod
    def _dedupe_filename_fields(cls, value: List[FilenameField]) -> List[FilenameField]:
        seen = set()
        deduped = []
        for field in value:
            if field not in seen:
                seen.add(field)
                deduped.append(field)
        return deduped


class UserPreferencesUpdate(BaseModel):
    """Partial update: only the fields actually sent are changed (see routers/preferences.py),
    so setting one preference never resets the others to their defaults."""

    gap_analysis_enabled: Optional[bool] = None
    pdf_filename_fields: Optional[List[FilenameField]] = None

    @field_validator("pdf_filename_fields")
    @classmethod
    def _dedupe_filename_fields(cls, value: Optional[List[FilenameField]]) -> Optional[List[FilenameField]]:
        if value is None:
            return None
        seen = set()
        deduped = []
        for field in value:
            if field not in seen:
                seen.add(field)
                deduped.append(field)
        return deduped


class UploadCvResponse(BaseModel):
    text: str


class ParseCvResponse(BaseModel):
    parsed_profile: ProfileSaveRequest
    raw_text: str


class GenerateRequest(BaseModel):
    job_description: str
    company: str
    position: str
    provider: Optional[str] = None


class Gap(BaseModel):
    """One concrete gap between the job's requirements and the candidate's profile.
    Every gap must trace back to something the job description explicitly asks for and
    something the profile explicitly does (or does not) show -- see services/gap_analysis.py.
    """

    category: Literal["experience", "skill", "certification"]
    severity: Literal["blocking", "minor"]
    requirement: str
    candidate_has: str
    recommendation: str


class GapAnalysis(BaseModel):
    """Result of comparing the job's explicit requirements against the candidate's profile.
    `score` and the gap list are both None/empty when the job description didn't state any
    requirement concrete enough to check -- see `note` in that case, never a guess."""

    score: Optional[int] = None
    gaps: List[Gap] = []
    matched_count: int = 0
    total_count: int = 0
    note: Optional[str] = None


class GenerateResponse(BaseModel):
    cv: Dict[str, Any]
    cover_letter: str
    application_id: Optional[int] = None
    gap_analysis: Optional[GapAnalysis] = None


class ExportPdfRequest(BaseModel):
    type: Literal["cv", "cover_letter"]
    content: Union[Dict[str, Any], str]
    template_id: Optional[int] = None


class ApplicationSchema(BaseModel):
    id: int
    company: str = ""
    position: str = ""
    job_description: str = ""
    provider_used: str = ""
    model_used: str = ""
    generated_cv: Dict[str, Any] = {}
    generated_cover_letter: str = ""
    gap_analysis: Optional[GapAnalysis] = None
    status: str = "Generated"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationListItemSchema(BaseModel):
    id: int
    company: str = ""
    position: str = ""
    provider_used: str = ""
    model_used: str = ""
    status: str = "Generated"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    company: str = ""
    position: str = ""
    job_description: str = ""
    provider_used: str = ""
    model_used: str = ""
    generated_cv: Dict[str, Any] = {}
    generated_cover_letter: str = ""
    status: str = "Generated"


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    job_description: Optional[str] = None
    generated_cv: Optional[Dict[str, Any]] = None
    generated_cover_letter: Optional[str] = None
    status: Optional[Literal[APPLICATION_STATUSES]] = None


class ProviderTestRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None


class UsageMeter(BaseModel):
    """One limit a provider reports, e.g. requests per day or tokens per minute."""

    id: str
    label: str
    limit: int
    remaining: int
    resets_in_seconds: Optional[float] = None


class UsageBalance(BaseModel):
    currency: str
    total: str
    granted: str = "0"
    topped_up: str = "0"


class ProviderUsageResponse(BaseModel):
    provider: str
    status: Literal["healthy", "low", "limited", "invalid_key", "error", "no_key"]
    message: str
    checked_at: datetime
    meters: List[UsageMeter] = []
    balance: Optional[UsageBalance] = None
    # Explains what this provider can NOT tell us (e.g. Gemini exposes no quota API).
    note: Optional[str] = None


class ModelListResponse(BaseModel):
    """Models the provider says this key can use. `ok` with an empty list is possible;
    anything else means the caller should fall back to its built-in suggestions."""

    provider: str
    status: Literal["ok", "no_key", "invalid_key", "error"]
    models: List[str] = []
    message: str = ""


class ProviderTestResponse(BaseModel):
    success: bool
    message: str


class CurrentUserResponse(BaseModel):
    id: str
    email: str = ""
    display_name: str = ""
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not _EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address.")
    return email


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class AuthTokenResponse(BaseModel):
    token: str
    user: CurrentUserResponse


class TemplateBase(BaseModel):
    name: str
    kind: Literal["cv", "cover_letter"]
    template_html: str


class TemplateCreate(TemplateBase):
    pass


class TemplatePreviewRequest(BaseModel):
    kind: Literal["cv", "cover_letter"]
    template_html: str


class TemplatePreviewResponse(BaseModel):
    html: str


class TemplateSchema(TemplateBase):
    id: int
    user_id: Optional[str] = None
    is_custom: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

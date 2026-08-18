from datetime import datetime
from typing import List, Optional, Any, Dict, Literal, Union
from pydantic import BaseModel, ConfigDict

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
    id: Optional[int] = None
    provider: str = "openai"
    api_key: str = ""
    model: str = "gpt-4o-mini"
    is_default: bool = False

    model_config = ConfigDict(from_attributes=True)


class ProviderSettingCreate(BaseModel):
    provider: str = "openai"
    api_key: str = ""
    model: str = "gpt-4o-mini"
    is_default: bool = False


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


class GenerateResponse(BaseModel):
    cv: Dict[str, Any]
    cover_letter: str
    application_id: Optional[int] = None


class ExportPdfRequest(BaseModel):
    type: Literal["cv", "cover_letter"]
    content: Union[Dict[str, Any], str]


class ApplicationSchema(BaseModel):
    id: int
    company: str = ""
    position: str = ""
    job_description: str = ""
    provider_used: str = ""
    model_used: str = ""
    generated_cv: Dict[str, Any] = {}
    generated_cover_letter: str = ""
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


class ProviderTestResponse(BaseModel):
    success: bool
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    username: str
    is_admin: bool


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    password: str


class UserSchema(BaseModel):
    id: int
    username: str
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

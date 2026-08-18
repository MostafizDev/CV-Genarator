from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    linkedin = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    summary = Column(Text, default="")
    skills = Column(Text, default="[]")  # JSON string list of skills

    experiences = relationship(
        "Experience", back_populates="profile", cascade="all, delete-orphan", lazy="joined"
    )
    projects = relationship(
        "Project", back_populates="profile", cascade="all, delete-orphan", lazy="joined"
    )
    certifications = relationship(
        "Certification", back_populates="profile", cascade="all, delete-orphan", lazy="joined"
    )
    education = relationship(
        "Education", back_populates="profile", cascade="all, delete-orphan", lazy="joined"
    )


class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    company = Column(String, default="")
    title = Column(String, default="")
    start_date = Column(String, default="")
    end_date = Column(String, nullable=True)
    bullet_points = Column(Text, default="[]")  # JSON string list of bullet points

    profile = relationship("Profile", back_populates="experiences")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, default="")
    description = Column(Text, default="")
    tech_stack = Column(String, default="")
    link = Column(String, nullable=True)

    profile = relationship("Profile", back_populates="projects")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, default="")
    issuer = Column(String, default="")
    date_earned = Column(String, nullable=True)

    profile = relationship("Profile", back_populates="certifications")


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    institution = Column(String, default="")
    degree = Column(String, default="")
    field = Column(String, nullable=True)
    graduation_year = Column(String, nullable=True)

    profile = relationship("Profile", back_populates="education")


class ProviderSetting(Base):
    __tablename__ = "provider_settings"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, default="openai")
    api_key = Column(String, default="")
    model = Column(String, default="gpt-4o-mini")
    is_default = Column(Boolean, default=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, default="")
    position = Column(String, default="")
    job_description = Column(Text, default="")
    provider_used = Column(String, default="")
    model_used = Column(String, default="")
    generated_cv = Column(Text, default="{}")  # JSON string of the generated CV
    generated_cover_letter = Column(Text, default="")
    status = Column(String, default="Generated")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

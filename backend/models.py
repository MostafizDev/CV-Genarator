from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Index, text
from sqlalchemy.orm import relationship
from database import Base
from core.crypto import EncryptedText


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # One account per email, however the person signs in (Google or password).
        # Partial: a Google account may lack an email, and those rows must not collide.
        Index(
            "uq_users_email",
            "email",
            unique=True,
            sqlite_where=text("email != ''"),
            postgresql_where=text("email != ''"),
        ),
        Index("ix_users_firebase_uid", "firebase_uid", unique=True),
    )

    # Primary key is a string, not an auto-increment integer: the Firebase UID for
    # accounts created through Google, or a random UUID for email/password accounts.
    id = Column(String, primary_key=True, index=True)
    # Stored lowercase. Set once a Google sign-in is tied to this account -- either
    # because it created it (then equal to id) or because its verified email matched an
    # existing email/password account, which is then linked instead of duplicated.
    firebase_uid = Column(String, nullable=True)
    email = Column(String, default="")
    display_name = Column(String, default="")
    first_name = Column(String, default="")
    last_name = Column(String, default="")
    # Salted scrypt hash (see core/local_auth.py), never the password itself. NULL for
    # Google sign-in accounts, which have no local password.
    password_hash = Column(String, nullable=True)
    # No admin-only features currently route through this -- kept dormant in case
    # an admin-facing feature is reintroduced later.
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(EncryptedText, default="")
    email = Column(EncryptedText, default="")
    phone = Column(EncryptedText, default="")
    location = Column(EncryptedText, default="")
    linkedin = Column(EncryptedText, nullable=True)
    portfolio_url = Column(EncryptedText, nullable=True)
    summary = Column(EncryptedText, default="")
    skills = Column(EncryptedText, default="[]")  # JSON string list of skills

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
    company = Column(EncryptedText, default="")
    title = Column(EncryptedText, default="")
    start_date = Column(EncryptedText, default="")
    end_date = Column(EncryptedText, nullable=True)
    bullet_points = Column(EncryptedText, default="[]")  # JSON string list of bullet points

    profile = relationship("Profile", back_populates="experiences")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(EncryptedText, default="")
    description = Column(EncryptedText, default="")
    tech_stack = Column(EncryptedText, default="")
    link = Column(EncryptedText, nullable=True)

    profile = relationship("Profile", back_populates="projects")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(EncryptedText, default="")
    issuer = Column(EncryptedText, default="")
    date_earned = Column(EncryptedText, nullable=True)

    profile = relationship("Profile", back_populates="certifications")


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    institution = Column(EncryptedText, default="")
    degree = Column(EncryptedText, default="")
    field = Column(EncryptedText, nullable=True)
    graduation_year = Column(EncryptedText, nullable=True)

    profile = relationship("Profile", back_populates="education")


class ProviderSetting(Base):
    __tablename__ = "provider_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String, default="openai")
    api_key = Column(EncryptedText, default="")
    model = Column(String, default="gpt-4o-mini")
    is_default = Column(Boolean, default=False)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company = Column(EncryptedText, default="")
    position = Column(EncryptedText, default="")
    job_description = Column(EncryptedText, default="")
    provider_used = Column(String, default="")
    model_used = Column(String, default="")
    generated_cv = Column(EncryptedText, default="{}")  # JSON string of the generated CV
    generated_cover_letter = Column(EncryptedText, default="")
    gap_analysis = Column(EncryptedText, nullable=True)  # JSON string; see schemas.GapAnalysis
    status = Column(String, default="Generated")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    # NULL user_id = a built-in template, seeded once and available to everyone.
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    kind = Column(String, nullable=False)  # "cv" | "cover_letter"
    name = Column(String, nullable=False)
    is_custom = Column(Boolean, default=True)
    template_html = Column(Text, nullable=False)  # Jinja2 source
    created_at = Column(DateTime, default=_utcnow)

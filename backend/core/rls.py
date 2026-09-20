from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

import models
from database import IS_POSTGRES

"""
Row Level Security helpers.

On Postgres every table is protected by policies keyed on the `app.user_id` setting, so
even a buggy query can't read another user's rows. Before a user is known (sign-in,
registration, Google sync) the few lookups that must cross user boundaries go through
narrow SECURITY DEFINER functions that only ever return an id / a status string -- see
migrations.apply_row_level_security. On SQLite (tests, small local setups) there is no RLS
and these helpers fall back to plain queries.
"""


def set_rls_user(db: Session, user_id: str) -> None:
    """Makes `user_id` the acting user for this session's current and future transactions."""
    db.info["rls_user_id"] = user_id
    if IS_POSTGRES:
        db.execute(text("SELECT set_config('app.user_id', :uid, true)"), {"uid": user_id})


def find_user_id_by_email(db: Session, email: str, *, password_accounts_only: bool = False) -> Optional[str]:
    if IS_POSTGRES:
        return db.execute(
            text("SELECT auth_user_id_by_email(:email, :pw_only)"),
            {"email": email, "pw_only": password_accounts_only},
        ).scalar()
    query = db.query(models.User.id).filter(models.User.email == email)
    if password_accounts_only:
        query = query.filter(models.User.password_hash.isnot(None))
    row = query.first()
    return row[0] if row else None


def find_user_id_by_firebase_uid(db: Session, firebase_uid: str) -> Optional[str]:
    if IS_POSTGRES:
        return db.execute(text("SELECT auth_user_id_by_firebase_uid(:uid)"), {"uid": firebase_uid}).scalar()
    row = db.query(models.User.id).filter(models.User.firebase_uid == firebase_uid).first()
    return row[0] if row else None


def email_account_kind(db: Session, email: str) -> Optional[str]:
    """'password' or 'google' if an account with this email exists, else None."""
    if IS_POSTGRES:
        return db.execute(text("SELECT auth_email_kind(:email)"), {"email": email}).scalar()
    row = db.query(models.User.password_hash).filter(models.User.email == email).first()
    if row is None:
        return None
    return "password" if row[0] else "google"


def load_user(db: Session, user_id: str) -> Optional[models.User]:
    """Fetches a user as themselves (subject to RLS)."""
    set_rls_user(db, user_id)
    return db.query(models.User).get(user_id)

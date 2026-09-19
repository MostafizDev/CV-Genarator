import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

import models
from services.pdf.templates import BUILTIN_CV_TEMPLATES, BUILTIN_COVER_LETTER_TEMPLATES


def seed_builtin_templates(engine: Engine) -> None:
    """Ensures every built-in template (see services/pdf/templates.py's
    BUILTIN_CV_TEMPLATES/BUILTIN_COVER_LETTER_TEMPLATES) exists, identified by
    (kind, name). Existing rows have their content refreshed on every startup --
    built-ins are never user-edited, so it's safe (and useful) to always keep them
    in sync with whatever the current code defines, rather than only seeding once.
    """
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        for kind, entries in (("cv", BUILTIN_CV_TEMPLATES), ("cover_letter", BUILTIN_COVER_LETTER_TEMPLATES)):
            for name, template_html in entries:
                row = (
                    db.query(models.Template)
                    .filter_by(kind=kind, name=name, is_custom=False)
                    .first()
                )
                if row:
                    row.template_html = template_html
                else:
                    db.add(
                        models.Template(
                            user_id=None,
                            kind=kind,
                            name=name,
                            is_custom=False,
                            template_html=template_html,
                        )
                    )
        db.commit()
    finally:
        db.close()


# Columns added to "users" after the table first shipped. create_all() skips tables that
# already exist, so an existing app.db needs them added in place (SQLite supports
# ADD COLUMN for nullable / defaulted columns).
_USER_COLUMNS_ADDED_LATER = {
    "first_name": "VARCHAR DEFAULT ''",
    "last_name": "VARCHAR DEFAULT ''",
    "password_hash": "VARCHAR",
    "firebase_uid": "VARCHAR",
}

logger = logging.getLogger(__name__)


def add_missing_user_columns(engine: Engine) -> None:
    existing = {col["name"] for col in inspect(engine).get_columns("users")}
    with engine.begin() as conn:
        for name, ddl in _USER_COLUMNS_ADDED_LATER.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))


def enforce_one_account_per_email(engine: Engine) -> None:
    """Backfills firebase_uid, lowercases emails and adds the unique indexes that
    create_all() can't add to an already-existing users table."""
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET email = lower(trim(email)) WHERE email != lower(trim(email))"))
        # Before linking existed, every password-less user was a Google account whose id IS the Firebase UID.
        conn.execute(text("UPDATE users SET firebase_uid = id WHERE firebase_uid IS NULL AND password_hash IS NULL"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_firebase_uid ON users (firebase_uid)"))
    try:
        with engine.begin() as conn:
            conn.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email) WHERE email != ''")
            )
    except IntegrityError:
        # Pre-existing duplicate emails must be merged by hand first; startup shouldn't
        # crash over it. Register/sign-in still refuse to create new duplicates.
        logger.warning("Users table has duplicate emails; unique email index not created until they are merged.")


def run_migrations(engine: Engine) -> None:
    """Runs one-time, idempotent setup that create_all() alone doesn't cover, such as
    seeding fixed reference rows. There is no schema-migration logic here: this app
    treats local SQLite data as disposable across breaking schema changes (SQLite
    can't ALTER a column's type), so a breaking change means deleting app.db and
    letting Base.metadata.create_all() rebuild it from scratch.
    """
    add_missing_user_columns(engine)
    enforce_one_account_per_email(engine)
    seed_builtin_templates(engine)

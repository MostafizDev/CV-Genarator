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


# Columns added to existing tables after they first shipped. create_all() skips tables that
# already exist, so an existing database needs them added in place (both SQLite and Postgres
# support ADD COLUMN for nullable / defaulted columns).
_COLUMNS_ADDED_LATER = {
    "users": {
        "first_name": "VARCHAR DEFAULT ''",
        "last_name": "VARCHAR DEFAULT ''",
        "password_hash": "VARCHAR",
        "firebase_uid": "VARCHAR",
    },
    "applications": {
        "gap_analysis": "TEXT",  # JSON string; see schemas.GapAnalysis. NULL on rows generated before this existed.
    },
}

logger = logging.getLogger(__name__)


def add_missing_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _COLUMNS_ADDED_LATER.items():
            existing = {col["name"] for col in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


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


_OWNED_BY_USER_ID = ("profiles", "provider_settings", "applications")
_OWNED_VIA_PROFILE = ("experiences", "projects", "certifications", "education")

_RLS_FUNCTIONS = [
    """
    CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$
    """,
    # The only ways to find a user before we know who is acting. SECURITY DEFINER lets them
    # look across rows, but they return just an id or a label -- never any user data.
    """
    CREATE OR REPLACE FUNCTION auth_user_id_by_email(p_email text, p_password_only boolean) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT id FROM users
        WHERE email = p_email AND (NOT p_password_only OR password_hash IS NOT NULL) LIMIT 1
    $$
    """,
    """
    CREATE OR REPLACE FUNCTION auth_user_id_by_firebase_uid(p_uid text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT id FROM users WHERE firebase_uid = p_uid LIMIT 1
    $$
    """,
    """
    CREATE OR REPLACE FUNCTION auth_email_kind(p_email text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT CASE WHEN password_hash IS NOT NULL THEN 'password' ELSE 'google' END
        FROM users WHERE email = p_email LIMIT 1
    $$
    """,
]
_AUTH_FUNCTION_SIGNATURES = (
    "auth_user_id_by_email(text, boolean)",
    "auth_user_id_by_firebase_uid(text)",
    "auth_email_kind(text)",
)


def apply_row_level_security(migration_engine: Engine, app_engine: Engine) -> None:
    """Postgres only. Enables RLS on every user-data table and grants the runtime role the
    minimum it needs. Idempotent -- safe to run on every startup."""
    if migration_engine.dialect.name != "postgresql":
        return

    app_role = app_engine.url.username
    quote = migration_engine.dialect.identifier_preparer.quote

    with migration_engine.begin() as conn:
        for statement in _RLS_FUNCTIONS:
            conn.execute(text(statement))

        def owner_policy(table: str, condition: str) -> None:
            conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
            conn.execute(text(f"DROP POLICY IF EXISTS {table}_owner ON {table}"))
            conn.execute(text(f"CREATE POLICY {table}_owner ON {table} USING ({condition})"))

        owner_policy("users", "id = app_current_user_id()")
        for table in _OWNED_BY_USER_ID:
            owner_policy(table, "user_id = app_current_user_id()")
        for table in _OWNED_VIA_PROFILE:
            owner_policy(
                table,
                f"EXISTS (SELECT 1 FROM profiles p WHERE p.id = {table}.profile_id "
                "AND p.user_id = app_current_user_id())",
            )

        # Built-in templates (user_id NULL) are readable by everyone but only the seeding
        # process (owner role) can change them; custom templates belong to their creator.
        conn.execute(text("ALTER TABLE templates ENABLE ROW LEVEL SECURITY"))
        for policy in ("templates_read", "templates_write"):
            conn.execute(text(f"DROP POLICY IF EXISTS {policy} ON templates"))
        conn.execute(
            text("CREATE POLICY templates_read ON templates FOR SELECT USING (user_id IS NULL OR user_id = app_current_user_id())")
        )
        conn.execute(
            text("CREATE POLICY templates_write ON templates FOR ALL USING (user_id = app_current_user_id())")
        )

        if app_role and app_role != migration_engine.url.username:
            role = quote(app_role)
            conn.execute(text(f"GRANT USAGE ON SCHEMA public TO {role}"))
            conn.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {role}"))
            conn.execute(text(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {role}"))
            for signature in _AUTH_FUNCTION_SIGNATURES:
                conn.execute(text(f"REVOKE ALL ON FUNCTION {signature} FROM PUBLIC"))
                conn.execute(text(f"GRANT EXECUTE ON FUNCTION {signature} TO {role}"))

    with app_engine.connect() as conn:
        bypasses = conn.execute(
            text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user")
        ).scalar()
        owns = conn.execute(
            text("SELECT pg_get_userbyid(relowner) = current_user FROM pg_class WHERE relname = 'profiles'")
        ).scalar()
    if bypasses or owns:
        logger.warning(
            "The runtime database role %s owns the tables or bypasses RLS, so Row Level Security is NOT "
            "enforced. Point DATABASE_URL at a separate low-privilege role and keep the owner in "
            "MIGRATION_DATABASE_URL.",
            app_role,
        )


def run_migrations(engine: Engine, app_engine: Engine = None) -> None:
    """Runs one-time, idempotent setup that create_all() alone doesn't cover, such as
    seeding fixed reference rows. There is no schema-migration logic here: this app
    treats local SQLite data as disposable across breaking schema changes (SQLite
    can't ALTER a column's type), so a breaking change means deleting app.db and
    letting Base.metadata.create_all() rebuild it from scratch.
    """
    add_missing_columns(engine)
    enforce_one_account_per_email(engine)
    seed_builtin_templates(engine)
    apply_row_level_security(engine, app_engine or engine)

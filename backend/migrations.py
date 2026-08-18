from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

import auth
import models
from database import SessionLocal


def _column_names(engine: Engine, table: str) -> set:
    return {col["name"] for col in inspect(engine).get_columns(table)}


def _add_column(engine: Engine, table: str, column_def_sql: str) -> None:
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_def_sql}"))


def run_migrations(engine: Engine) -> None:
    """
    One-time upgrade from the single-tenant schema to the multi-user schema: adds
    user_id to profiles/provider_settings/applications and backfills any pre-existing
    rows onto the bootstrap admin account, so upgrading never loses data. A no-op on a
    brand-new database, since create_all() already builds the current schema from
    scratch there.
    """
    existing_tables = set(inspect(engine).get_table_names())
    if "profiles" not in existing_tables:
        return

    if "user_id" in _column_names(engine, "profiles"):
        return  # already migrated

    db = SessionLocal()
    try:
        auth.ensure_bootstrap_admin(db)
        admin = db.query(models.User).filter(models.User.is_admin == True).first()  # noqa: E712
        admin_id = admin.id
    finally:
        db.close()

    for table in ("profiles", "provider_settings", "applications"):
        if "user_id" not in _column_names(engine, table):
            _add_column(engine, table, "user_id INTEGER REFERENCES users(id)")

    with engine.begin() as conn:
        for table in ("profiles", "provider_settings", "applications"):
            conn.execute(
                text(f"UPDATE {table} SET user_id = :admin_id WHERE user_id IS NULL"),
                {"admin_id": admin_id},
            )

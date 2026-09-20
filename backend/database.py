import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Secrets (DATABASE_URL, DATA_ENCRYPTION_KEYS, ...) live in backend/.env locally, which is
# gitignored, and in the host's secret store in production. Real environment variables win.
load_dotenv()

logger = logging.getLogger(__name__)

# Overridable so a deployment can point at Postgres (recommended: row level security) or a
# mounted SQLite volume (e.g. "sqlite:////data/app.db"). Use "?sslmode=require" (or
# stricter) on hosted Postgres so data is encrypted in transit.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
# The runtime role must NOT own the tables or bypass RLS. Schema changes and one-time data
# migrations use this owner connection instead; if unset, the runtime URL is used for both.
MIGRATION_DATABASE_URL = os.environ.get("MIGRATION_DATABASE_URL", SQLALCHEMY_DATABASE_URL)

IS_POSTGRES = SQLALCHEMY_DATABASE_URL.startswith("postgres")


def _make_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # psycopg3 is the driver; accept plain "postgresql://" URLs too.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return create_engine(url, pool_pre_ping=True)


engine = _make_engine(SQLALCHEMY_DATABASE_URL)
migration_engine = engine if MIGRATION_DATABASE_URL == SQLALCHEMY_DATABASE_URL else _make_engine(MIGRATION_DATABASE_URL)

if IS_POSTGRES and "sslmode" not in SQLALCHEMY_DATABASE_URL and "localhost" not in SQLALCHEMY_DATABASE_URL and "127.0.0.1" not in SQLALCHEMY_DATABASE_URL:
    logger.warning("DATABASE_URL has no sslmode: add ?sslmode=require so database traffic is encrypted in transit.")


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _):
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return
    # SQLite ignores FK constraints (including ON DELETE CASCADE) unless told
    # otherwise per-connection -- this makes deleting a user actually clean up
    # their profile/settings/applications instead of leaving orphaned rows.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if IS_POSTGRES:

    @event.listens_for(SessionLocal, "after_begin")
    def _apply_rls_user(session, transaction, connection):
        """Tells Postgres which user this transaction acts for. Every RLS policy compares
        rows against app.user_id, so a query can only ever see that user's own data. The
        setting is transaction-local, so it can't leak to the next request on a pooled
        connection; sessions with no user set see nothing."""
        connection.execute(
            text("SELECT set_config('app.user_id', :uid, true)"),
            {"uid": session.info.get("rls_user_id") or ""},
        )


Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

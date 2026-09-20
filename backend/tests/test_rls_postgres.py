"""
Row Level Security tests against a REAL Postgres, using two roles exactly as in production:
an owner (creates tables, bypasses RLS) and a restricted app role (RLS applies).

Skipped unless both URLs are set, and they must point at a scratch database -- the tables
are truncated. With the dev cluster from scripts/dev_db.sh:

    createdb-style setup (once):  CREATE DATABASE cvgen_test OWNER cvgen_owner; GRANT CONNECT ... TO cvgen_app;
    export RLS_TEST_ADMIN_URL=postgresql://cvgen_owner:<pw>@127.0.0.1:54329/cvgen_test
    export RLS_TEST_APP_URL=postgresql://cvgen_app:<pw>@127.0.0.1:54329/cvgen_test
    pytest tests/test_rls_postgres.py
"""
import os

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

ADMIN_URL = os.environ.get("RLS_TEST_ADMIN_URL")
APP_URL = os.environ.get("RLS_TEST_APP_URL")

pytestmark = pytest.mark.skipif(
    not (ADMIN_URL and APP_URL), reason="set RLS_TEST_ADMIN_URL and RLS_TEST_APP_URL to run the Postgres RLS tests"
)


@pytest.fixture()
def dbs():
    import database
    import migrations
    import models

    admin = database._make_engine(ADMIN_URL)
    app_engine = database._make_engine(APP_URL)
    models.Base.metadata.create_all(admin)
    migrations.run_migrations(admin, app_engine)

    with admin.begin() as conn:
        conn.execute(text("TRUNCATE users, templates RESTART IDENTITY CASCADE"))
        for uid in ("alice", "bob"):
            conn.execute(text("INSERT INTO users (id, email, firebase_uid) VALUES (:id, :email, :fuid)"),
                         {"id": uid, "email": f"{uid}@example.com", "fuid": f"fb-{uid}"})
            pid = conn.execute(text("INSERT INTO profiles (user_id, full_name) VALUES (:u, :n) RETURNING id"),
                               {"u": uid, "n": f"{uid} profile"}).scalar()
            conn.execute(text("INSERT INTO experiences (profile_id, company) VALUES (:p, :c)"), {"p": pid, "c": f"{uid} corp"})
            conn.execute(text("INSERT INTO provider_settings (user_id, provider, api_key, model) VALUES (:u, 'groq', 'k', 'm')"), {"u": uid})
            conn.execute(text("INSERT INTO applications (user_id, company) VALUES (:u, 'co')"), {"u": uid})
            conn.execute(text("INSERT INTO templates (user_id, kind, name, is_custom, template_html) VALUES (:u, 'cv', 'mine', true, '<p/>')"), {"u": uid})
        conn.execute(text("INSERT INTO templates (user_id, kind, name, is_custom, template_html) VALUES (NULL, 'cv', 'builtin', false, '<p/>')"))
    yield admin, app_engine
    with admin.begin() as conn:
        conn.execute(text("TRUNCATE users, templates RESTART IDENTITY CASCADE"))
    admin.dispose()
    app_engine.dispose()


def as_user(engine, user_id):
    """A connection acting for `user_id`, the way get_current_user sets it up per request."""
    conn = engine.connect()
    trans = conn.begin()
    conn.execute(text("SELECT set_config('app.user_id', :u, true)"), {"u": user_id or ""})
    return conn, trans


TABLES = ("users", "profiles", "experiences", "provider_settings", "applications")


def count(conn, table, where="true"):
    return conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {where}")).scalar()


def test_app_role_is_actually_restricted(dbs):
    _, app_engine = dbs
    with app_engine.connect() as conn:
        assert conn.execute(text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user")).scalar() is False
        assert conn.execute(text("SELECT pg_get_userbyid(relowner) = current_user FROM pg_class WHERE relname = 'profiles'")).scalar() is False


def test_no_user_context_sees_nothing(dbs):
    _, app_engine = dbs
    conn, trans = as_user(app_engine, None)
    try:
        assert all(count(conn, t) == 0 for t in TABLES)
    finally:
        trans.rollback(); conn.close()


def test_each_user_sees_only_their_own_rows(dbs):
    _, app_engine = dbs
    for me, other in (("alice", "bob"), ("bob", "alice")):
        conn, trans = as_user(app_engine, me)
        try:
            for table in TABLES:
                assert count(conn, table) == 1, f"{me} sees {count(conn, table)} rows in {table}"
            assert count(conn, "users", f"id = '{other}'") == 0
            assert count(conn, "experiences", f"company = '{other} corp'") == 0
        finally:
            trans.rollback(); conn.close()


def test_cannot_modify_or_delete_another_users_rows(dbs):
    admin, app_engine = dbs
    conn, trans = as_user(app_engine, "alice")
    try:
        assert conn.execute(text("UPDATE profiles SET full_name = 'hacked' WHERE user_id = 'bob'")).rowcount == 0
        assert conn.execute(text("UPDATE users SET email = 'x@x.co' WHERE id = 'bob'")).rowcount == 0
        assert conn.execute(text("DELETE FROM applications WHERE user_id = 'bob'")).rowcount == 0
        assert conn.execute(text("DELETE FROM users WHERE id = 'bob'")).rowcount == 0
    finally:
        trans.rollback(); conn.close()
    with admin.connect() as conn:
        assert conn.execute(text("SELECT full_name FROM profiles WHERE user_id = 'bob'")).scalar() == "bob profile"


def test_cannot_insert_rows_for_another_user(dbs):
    _, app_engine = dbs
    for statement in (
        "INSERT INTO provider_settings (user_id, provider, api_key, model) VALUES ('bob', 'x', 'k', 'm')",
        "INSERT INTO applications (user_id, company) VALUES ('bob', 'evil')",
        "INSERT INTO users (id, email) VALUES ('bob2', 'b2@example.com')",
    ):
        conn, trans = as_user(app_engine, "alice")
        try:
            with pytest.raises(DBAPIError):
                conn.execute(text(statement))
        finally:
            trans.rollback(); conn.close()


def test_child_rows_cannot_be_attached_to_another_users_profile(dbs):
    admin, app_engine = dbs
    with admin.connect() as conn:
        bob_profile = conn.execute(text("SELECT id FROM profiles WHERE user_id = 'bob'")).scalar()
    conn, trans = as_user(app_engine, "alice")
    try:
        with pytest.raises(DBAPIError):
            conn.execute(text("INSERT INTO experiences (profile_id, company) VALUES (:p, 'planted')"), {"p": bob_profile})
    finally:
        trans.rollback(); conn.close()


def test_templates_builtins_are_shared_read_only_and_custom_ones_are_private(dbs):
    _, app_engine = dbs
    conn, trans = as_user(app_engine, "alice")
    try:
        names = {r[0] for r in conn.execute(text("SELECT name FROM templates"))}
        assert names == {"mine", "builtin"}
        assert count(conn, "templates", "user_id = 'bob'") == 0
        assert conn.execute(text("UPDATE templates SET name = 'pwned' WHERE user_id IS NULL")).rowcount == 0
        assert conn.execute(text("DELETE FROM templates WHERE user_id IS NULL")).rowcount == 0
    finally:
        trans.rollback(); conn.close()


def test_auth_lookup_functions_work_without_context_and_return_only_ids(dbs):
    _, app_engine = dbs
    conn, trans = as_user(app_engine, None)
    try:
        assert conn.execute(text("SELECT auth_user_id_by_email('alice@example.com', false)")).scalar() == "alice"
        assert conn.execute(text("SELECT auth_user_id_by_firebase_uid('fb-bob')")).scalar() == "bob"
        assert conn.execute(text("SELECT auth_email_kind('alice@example.com')")).scalar() == "google"
        assert conn.execute(text("SELECT auth_user_id_by_email('nobody@example.com', false)")).scalar() is None
        # ...but the underlying table is still closed.
        assert count(conn, "users") == 0
    finally:
        trans.rollback(); conn.close()


def test_transaction_local_user_does_not_leak_across_pooled_connections(dbs):
    _, app_engine = dbs
    conn, trans = as_user(app_engine, "alice")
    assert count(conn, "profiles") == 1
    trans.commit(); conn.close()  # connection returns to the pool
    with app_engine.connect() as conn2:
        assert count(conn2, "profiles") == 0

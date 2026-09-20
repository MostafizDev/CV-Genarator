import base64

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from core import crypto
from tests.test_api import TestingSessionLocal, _client_as, app, models, setup_db, test_engine  # noqa: F401  (setup_db is the autouse DB reset fixture)


# --- encryption primitives ------------------------------------------------------

def test_encrypt_decrypt_round_trip_and_randomised_ciphertext():
    secret = "+1 555 010 0199 — Zoë's address, 12 Rue Saint-Denis"
    first, second = crypto.encrypt(secret), crypto.encrypt(secret)
    assert first.startswith("enc:test1:") and secret not in first
    assert first != second  # fresh nonce every time, so equal values don't look equal
    assert crypto.decrypt(first) == crypto.decrypt(second) == secret


def test_decrypt_rejects_tampering_and_wrong_key(monkeypatch):
    token = crypto.encrypt("hello")
    body = token.rsplit(":", 1)[1]
    flipped = base64.urlsafe_b64encode(bytes([base64.urlsafe_b64decode(body)[0] ^ 1]) + base64.urlsafe_b64decode(body)[1:]).decode()
    with pytest.raises(crypto.CryptoError):
        crypto.decrypt(f"enc:test1:{flipped}")

    with pytest.raises(crypto.CryptoError):
        crypto.decrypt(token.replace("enc:test1:", "enc:other:"))


def test_legacy_plaintext_is_returned_unchanged():
    # Rows written before encryption existed must still be readable.
    assert crypto.decrypt("just an old plain value") == "just an old plain value"
    assert crypto.decrypt("") == ""


def test_key_rotation_new_key_encrypts_old_key_still_decrypts(monkeypatch):
    old_token = crypto.encrypt("rotate me")
    new_key = base64.urlsafe_b64encode(b"\x02" * 32).decode()
    old_key = base64.urlsafe_b64encode(b"\x01" * 32).decode()
    monkeypatch.setenv("DATA_ENCRYPTION_KEYS", f"test2:{new_key},test1:{old_key}")
    crypto._keys.cache_clear()
    try:
        assert crypto.encrypt("x").startswith("enc:test2:")
        assert crypto.decrypt(old_token) == "rotate me"
    finally:
        monkeypatch.undo()
        crypto._keys.cache_clear()


def test_missing_or_malformed_key_fails_fast(monkeypatch):
    for bad in ("", "nocolon", "k:not-base64!!", "k:" + base64.urlsafe_b64encode(b"short").decode()):
        monkeypatch.setenv("DATA_ENCRYPTION_KEYS", bad)
        crypto._keys.cache_clear()
        with pytest.raises(crypto.CryptoConfigError):
            crypto.assert_configured()
    monkeypatch.undo()
    crypto._keys.cache_clear()


# --- encryption at rest through the real models ------------------------------------

def test_sensitive_columns_are_ciphertext_in_the_database_but_plain_through_the_api():
    client = _client_as("enc-user", email="enc@example.com", display_name="Enc User")
    res = client.post(
        "/api/profile",
        json={
            "full_name": "Enc User",
            "email": "enc@example.com",
            "phone": "+1 555 010 0199",
            "location": "12 Secret Lane, Toronto",
            "summary": "private summary",
            "skills": ["Python"],
            "experiences": [
                {"company": "Acme Secret Corp", "title": "Engineer", "start_date": "2020", "end_date": None, "bullet_points": ["did things"]}
            ],
            "projects": [],
            "certifications": [],
            "education": [],
        },
    )
    assert res.status_code == 200
    assert client.get("/api/profile").json()["phone"] == "+1 555 010 0199"

    client.post("/api/settings", json={"provider": "groq", "api_key": "gsk_SECRET_KEY_9999", "model": "m", "is_default": True})

    with test_engine.connect() as conn:
        raw = {
            "phone": conn.execute(text("select phone from profiles")).scalar(),
            "location": conn.execute(text("select location from profiles")).scalar(),
            "summary": conn.execute(text("select summary from profiles")).scalar(),
            "company": conn.execute(text("select company from experiences")).scalar(),
            "api_key": conn.execute(text("select api_key from provider_settings")).scalar(),
        }
    for column, stored in raw.items():
        assert stored.startswith("enc:"), f"{column} is stored as plain text"
    joined = " ".join(raw.values())
    for secret in ("555 010", "Secret Lane", "private summary", "Acme", "SECRET_KEY"):
        assert secret not in joined


def test_generated_cv_and_cover_letter_are_encrypted_at_rest():
    db = TestingSessionLocal()
    try:
        db.add(models.User(id="u-app", email="app@example.com"))
        db.flush()
        db.add(
            models.Application(
                user_id="u-app",
                company="Globex",
                position="Analyst",
                job_description="confidential job text",
                generated_cv='{"name": "cv body"}',
                generated_cover_letter="Dear hiring manager, cover letter body",
            )
        )
        db.commit()
    finally:
        db.close()
    with test_engine.connect() as conn:
        row = conn.execute(text("select job_description, generated_cv, generated_cover_letter from applications")).one()
    assert all(value.startswith("enc:") for value in row)
    db = TestingSessionLocal()
    try:
        app_row = db.query(models.Application).one()
        assert app_row.generated_cover_letter == "Dear hiring manager, cover letter body"
    finally:
        db.close()


# --- HTTP hardening -----------------------------------------------------------

def test_api_responses_carry_security_headers_and_are_not_cacheable():
    client = _client_as("hdr-user")
    res = client.get("/api/settings")
    assert res.headers["cache-control"] == "no-store"
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" not in res.headers  # plain http in tests

    https = TestClient(app).get("/healthz", headers={"x-forwarded-proto": "https"})
    assert "max-age=" in https.headers["strict-transport-security"]


def test_validation_errors_do_not_echo_submitted_values():
    res = TestClient(app).post(
        "/api/auth/register",
        json={"first_name": "A", "last_name": "B", "email": "a@b.co", "password": "hunter2"},
    )
    assert res.status_code == 422
    assert "hunter2" not in res.text
    assert res.json()["detail"][0]["loc"] == ["body", "password"]


def test_blank_api_key_keeps_the_saved_key():
    client = _client_as("keep-key")
    client.post("/api/settings", json={"provider": "openai", "api_key": "sk-original-1234", "model": "m", "is_default": True})
    res = client.post("/api/settings", json={"provider": "openai", "api_key": "", "model": "m2", "is_default": True})
    assert res.json()["has_api_key"] is True and res.json()["api_key_hint"] == "••••1234"
    db = TestingSessionLocal()
    try:
        assert db.query(models.ProviderSetting).one().api_key == "sk-original-1234"
    finally:
        db.close()

from services import preferences as prefs_module
from tests.test_api import _client_as, client, setup_db  # noqa: F401  (client/setup_db are fixtures)


# --- parse/serialize -------------------------------------------------------

def test_parse_preferences_defaults_for_missing_blank_or_malformed_values():
    for raw in (None, "", "not json", "[]", '"just a string"'):
        assert prefs_module.parse_preferences(raw).gap_analysis_enabled is True


def test_parse_preferences_ignores_unknown_keys_and_reads_known_ones():
    parsed = prefs_module.parse_preferences('{"gap_analysis_enabled": false, "some_future_key": "x"}')
    assert parsed.gap_analysis_enabled is False


def test_serialize_deserialize_round_trip():
    import schemas

    original = schemas.UserPreferences(gap_analysis_enabled=False)
    assert prefs_module.parse_preferences(prefs_module.serialize_preferences(original)) == original


# --- HTTP endpoints ---------------------------------------------------------

def test_get_preferences_defaults_to_enabled_for_a_new_user(client):
    res = client.get("/api/preferences")
    assert res.status_code == 200
    assert res.json() == {"gap_analysis_enabled": True}


def test_put_preferences_updates_and_persists(client):
    res = client.put("/api/preferences", json={"gap_analysis_enabled": False})
    assert res.status_code == 200
    assert res.json() == {"gap_analysis_enabled": False}

    # Persisted -- a fresh GET (and a fresh request context) sees the same value.
    assert client.get("/api/preferences").json()["gap_analysis_enabled"] is False


def test_put_preferences_partial_update_never_resets_other_fields():
    """Sending {} (nothing set) must leave whatever's already stored untouched -- this is what
    keeps a future second preference safe when an older client only ever sends the first one."""
    client = _client_as("prefs-partial-user")
    client.put("/api/preferences", json={"gap_analysis_enabled": False})
    res = client.put("/api/preferences", json={})
    assert res.json()["gap_analysis_enabled"] is False


def test_preferences_require_sign_in():
    from fastapi.testclient import TestClient

    from tests.test_api import app

    assert TestClient(app).get("/api/preferences").status_code == 401
    assert TestClient(app).put("/api/preferences", json={}).status_code == 401


def test_preferences_are_isolated_per_user(client):
    other = _client_as("prefs-other-user")
    client.put("/api/preferences", json={"gap_analysis_enabled": False})
    assert other.get("/api/preferences").json()["gap_analysis_enabled"] is True

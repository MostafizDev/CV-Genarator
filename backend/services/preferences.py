"""
Per-user feature toggles (Settings -> Preferences), stored as a JSON string on users.preferences.

Kept deliberately simple: `parse_preferences` tolerates a missing/blank/malformed value (a new
column defaulting to "{}", a row from before a given preference existed, or corrupted data) by
falling back to schemas.UserPreferences' defaults rather than erroring -- a broken preferences
blob must never break sign-in or generation.
"""
from typing import Optional

import schemas


def parse_preferences(raw: Optional[str]) -> schemas.UserPreferences:
    if not raw:
        return schemas.UserPreferences()
    try:
        return schemas.UserPreferences.model_validate_json(raw)
    except Exception:
        return schemas.UserPreferences()


def serialize_preferences(preferences: schemas.UserPreferences) -> str:
    return preferences.model_dump_json()

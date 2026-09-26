from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from core.firebase_auth import get_current_user
from services.preferences import parse_preferences, serialize_preferences

router = APIRouter(prefix="/api/preferences", tags=["Preferences"])


@router.get("", response_model=schemas.UserPreferences)
def get_preferences(current_user: models.User = Depends(get_current_user)):
    return parse_preferences(current_user.preferences)


@router.put("", response_model=schemas.UserPreferences)
def update_preferences(
    data: schemas.UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Only the fields actually present in the request body are changed -- a client that only
    knows about today's one toggle can never accidentally reset a future preference it has
    never heard of back to its default."""
    current = parse_preferences(current_user.preferences)
    changes = data.model_dump(exclude_unset=True)
    updated = current.model_copy(update=changes)
    current_user.preferences = serialize_preferences(updated)
    # merge() (rather than assuming current_user is already attached to this session) is what
    # makes this safe regardless of how get_current_user fetched it -- e.g. the test suite's
    # fake auth deliberately uses its own separate session.
    db.merge(current_user)
    db.commit()
    return updated

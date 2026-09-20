import json
import logging
import os

import firebase_admin
from firebase_admin import auth as firebase_auth_sdk
from firebase_admin import credentials
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from core import local_auth
from core.rls import find_user_id_by_firebase_uid, load_user

logger = logging.getLogger(__name__)


def _firebase_configured() -> bool:
    return bool(
        firebase_admin._apps
        or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    )


def _init_firebase_app() -> None:
    if firebase_admin._apps:
        return

    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
    elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        cred = credentials.ApplicationDefault()
    else:
        raise HTTPException(
            status_code=500,
            detail=(
                "Firebase is not configured on the server: set FIREBASE_SERVICE_ACCOUNT_JSON "
                "(a service account JSON string) or GOOGLE_APPLICATION_CREDENTIALS (a path to one)."
            ),
        )

    firebase_admin.initialize_app(cred, {"projectId": os.environ.get("FIREBASE_PROJECT_ID")})


def _extract_bearer_token(authorization: str) -> str:
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


def verify_firebase_token(authorization: str = Header(default="")) -> dict:
    """Verifies a Firebase ID token and returns its decoded claims (uid/email/name).
    No DB lookup -- used by /api/auth/sync, which runs before the local User row exists.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    _init_firebase_app()
    try:
        return firebase_auth_sdk.verify_id_token(token)
    except Exception as exc:
        # Log the reason (expired, wrong project, ...) but never the exception text or
        # traceback: for malformed tokens those contain the token itself.
        logger.warning("Firebase ID token verification failed: %s", type(exc).__name__)
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")


def get_current_user(
    authorization: str = Header(default=""), db: Session = Depends(get_db)
) -> models.User:
    # Email/password accounts send our own JWT; Google accounts send a Firebase ID token.
    local_user_id = local_auth.decode_access_token(_extract_bearer_token(authorization))
    if local_user_id:
        user = load_user(db, local_user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found. Please sign in again.")
        return user

    # Not one of our tokens. Without Firebase configured (email/password-only setup) it
    # can't be a valid Google session either, so answer 401 rather than a config 500.
    if not _firebase_configured():
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")

    claims = verify_firebase_token(authorization)
    # Look up by firebase_uid, not id: a Google login linked to an email/password account
    # resolves to that account's row, whose id is not the Firebase UID.
    user_id = find_user_id_by_firebase_uid(db, claims["uid"])
    user = load_user(db, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please sign in again.")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

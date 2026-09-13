import json
import os

import firebase_admin
from firebase_admin import auth as firebase_auth_sdk
from firebase_admin import credentials
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models


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
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")


def get_current_user(
    authorization: str = Header(default=""), db: Session = Depends(get_db)
) -> models.User:
    claims = verify_firebase_token(authorization)
    user = db.query(models.User).get(claims["uid"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please sign in again.")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

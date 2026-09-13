from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from core.firebase_auth import get_current_user, verify_firebase_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/sync", response_model=schemas.CurrentUserResponse)
def sync_user(claims: dict = Depends(verify_firebase_token), db: Session = Depends(get_db)):
    """Self-service account creation: verifies the caller's Firebase ID token and, on a
    user's first-ever sign-in, creates their local User row and an empty Profile. No
    admin action is involved -- anyone who can sign in with Google gets an account.
    """
    uid = claims["uid"]
    user = db.query(models.User).get(uid)
    if user is None:
        email = claims.get("email", "") or ""
        name = claims.get("name", "") or ""
        user = models.User(id=uid, email=email, display_name=name)
        db.add(user)
        db.flush()
        db.add(models.Profile(user_id=uid, email=email, full_name=name))
        db.commit()
        db.refresh(user)
    return user


@router.get("/me", response_model=schemas.CurrentUserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

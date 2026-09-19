import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from core import local_auth
from core.firebase_auth import get_current_user, verify_firebase_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _split_name(full_name: str) -> tuple:
    first, _, last = full_name.strip().partition(" ")
    return first, last.strip()


@router.post("/sync", response_model=schemas.CurrentUserResponse)
def sync_user(claims: dict = Depends(verify_firebase_token), db: Session = Depends(get_db)):
    """Called after every Google sign-in. Finds the account for this Firebase user, or --
    on first-ever sign-in -- either links it to the existing account with the same
    (verified) email or creates a new one with an empty Profile. There is one account
    per email: a person who registered with a password and later uses Google (or the
    reverse) always lands on the same user row.
    """
    uid = claims["uid"]
    email = (claims.get("email") or "").strip().lower()
    name = claims.get("name") or ""

    user = db.query(models.User).filter(models.User.firebase_uid == uid).first()
    if user is None and email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is not None:
            if not claims.get("email_verified"):
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists. Sign in with your password instead.",
                )
            user.firebase_uid = uid
            # The password was set on an email nobody had verified, so it can't be
            # trusted to belong to this person -- drop it so a stranger who pre-registered
            # this address can't keep access to the account the real owner just claimed.
            user.password_hash = None

    if user is None:
        first, last = _split_name(name)
        user = models.User(
            id=uid, firebase_uid=uid, email=email, display_name=name, first_name=first, last_name=last
        )
        db.add(user)
        db.flush()
        db.add(models.Profile(user_id=uid, email=email, full_name=name))
    elif name and not user.first_name and not user.last_name:
        user.first_name, user.last_name = _split_name(name)

    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=schemas.AuthTokenResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Creates an email/password account (no email verification) and signs it in."""
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        # Never attach a password to an existing account here: the email isn't verified,
        # so anyone could claim someone else's Google account this way.
        detail = (
            "An account with this email already exists. Try signing in."
            if existing.password_hash
            else "This email is already registered with Google. Use \"Sign in with Google\"."
        )
        raise HTTPException(status_code=409, detail=detail)

    full_name = f"{payload.first_name} {payload.last_name}"
    user = models.User(
        id=uuid.uuid4().hex,
        email=payload.email,
        display_name=full_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        password_hash=local_auth.hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    db.add(models.Profile(user_id=user.id, email=payload.email, full_name=full_name))
    db.commit()
    db.refresh(user)
    return {"token": local_auth.create_access_token(user.id), "user": user}


@router.post("/login", response_model=schemas.AuthTokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email, models.User.password_hash.isnot(None))
        .first()
    )
    # Always run one scrypt verification, even for an unknown email, so timing doesn't
    # reveal which emails have accounts.
    stored_hash = user.password_hash if user else local_auth.DUMMY_PASSWORD_HASH
    password_ok = local_auth.verify_password(payload.password, stored_hash)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"token": local_auth.create_access_token(user.id), "user": user}


@router.get("/me", response_model=schemas.CurrentUserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

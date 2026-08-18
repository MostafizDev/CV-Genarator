from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username.strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    return schemas.LoginResponse(
        access_token=create_access_token(user),
        username=user.username,
        is_admin=user.is_admin,
    )


@router.get("/me", response_model=schemas.CurrentUserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

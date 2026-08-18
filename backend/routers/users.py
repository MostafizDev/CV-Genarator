from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import hash_password, require_admin

router = APIRouter(prefix="/api/users", tags=["Users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[schemas.UserSchema])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.asc()).all()


@router.post("", response_model=schemas.UserSchema)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    if not data.password or len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="That username is already taken.")

    user = models.User(username=username, password_hash=hash_password(data.password), is_admin=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted."}

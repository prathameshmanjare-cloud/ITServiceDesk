from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, RegisterRequest
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth_service import (
    authenticate_user, create_access_token, create_refresh_token,
    decode_token, create_user, hash_password, verify_password
)
from app.utils.dependencies import get_current_user
from app.utils.helpers import api_response
from datetime import timedelta
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(db, req.email, req.full_name, req.password, req.department)
    return api_response(True, UserResponse.model_validate(user).model_dump(), "User registered")

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(
        {"user_id": user.id, "role": user.role.value},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token({"user_id": user.id})
    return api_response(True, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user).model_dump()
    }, "Login successful")

@router.post("/refresh")
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token(
        {"user_id": user.id, "role": user.role.value},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token({"user_id": user.id})
    return api_response(True, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }, "Token refreshed")

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return api_response(True, UserResponse.model_validate(current_user).model_dump(), "User profile")

@router.put("/me")
def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name:
        current_user.full_name = data.full_name
    if data.department:
        current_user.department = data.department
    if data.current_password and data.new_password:
        if not verify_password(data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    db.refresh(current_user)
    return api_response(True, UserResponse.model_validate(current_user).model_dump(), "Profile updated")

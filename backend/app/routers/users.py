from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.schemas.user import UserResponse, UserUpdate, UserRoleUpdate, UserCreate
from app.services.auth_service import hash_password
from app.utils.dependencies import get_current_user, require_admin
from app.utils.helpers import api_response

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("")
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        term = f"%{search}%"
        query = query.filter((User.full_name.ilike(term)) | (User.email.ilike(term)))
    if role:
        query = query.filter(User.role == role)
    if department:
        query = query.filter(User.department == department)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for u in users:
        d = UserResponse.model_validate(u).model_dump()
        d["tickets_assigned"] = db.query(Ticket).filter(Ticket.assigned_to == u.id, Ticket.deleted_at.is_(None)).count()
        result.append(d)

    return api_response(True, {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size)
    }, "Users retrieved")

@router.get("/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return api_response(True, UserResponse.model_validate(user).model_dump(), "User retrieved")

@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return api_response(True, UserResponse.model_validate(user).model_dump(), "User updated")

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = UserRole(data.role)
    db.commit()
    db.refresh(user)
    return api_response(True, UserResponse.model_validate(user).model_dump(), "Role updated")

@router.put("/{user_id}/toggle-active")
def toggle_active(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return api_response(True, UserResponse.model_validate(user).model_dump(), "User status toggled")

@router.post("/invite")
def invite_user(
    data: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=UserRole(data.role) if data.role in [r.value for r in UserRole] else UserRole.user,
        department=data.department
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return api_response(True, UserResponse.model_validate(user).model_dump(), "User invited")

@router.get("/{user_id}/tickets")
def get_user_tickets(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tickets = db.query(Ticket).filter(
        Ticket.created_by == user_id,
        Ticket.deleted_at.is_(None)
    ).order_by(Ticket.created_at.desc()).limit(10).all()
    from app.schemas.ticket import TicketResponse
    return api_response(True, [TicketResponse.model_validate(t).model_dump() for t in tickets], "User tickets retrieved")

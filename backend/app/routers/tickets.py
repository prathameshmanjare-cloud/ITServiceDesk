from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus
from app.models.notification import Notification, NotificationType
from app.models.comment import Comment
from app.services.ticket_service import create_ticket, get_tickets, update_ticket_status, get_ticket_history
from app.services.assignment_engine import auto_assign
from app.services.email_service import send_email, build_ticket_email, build_status_email, build_comment_email
from app.utils.dependencies import get_current_user, require_admin, require_agent_or_admin
from app.utils.helpers import api_response, paginated_response
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketStatusUpdate, TicketAssign, TicketResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.config import settings

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

@router.post("")
def create_ticket_endpoint(
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = create_ticket(db, current_user.id, data.title, data.description,
                          data.category, data.department, data.attachments)

    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title="New Ticket Created",
            message=f"Ticket {ticket.ticket_number}: {ticket.title}",
            type=NotificationType.ticket_created,
            ticket_id=ticket.id
        )
        db.add(notif)
    db.commit()

    from fastapi import BackgroundTasks
    return api_response(True, TicketResponse.model_validate(ticket).model_dump(), "Ticket created successfully")

@router.get("")
def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items, total = get_tickets(db, current_user, status, priority, category,
                               assigned_to, department, date_from, date_to,
                               search, sort_by, sort_order, page, page_size)
    ticket_list = [TicketResponse.model_validate(t).model_dump() for t in items]
    return api_response(True, paginated_response(ticket_list, total, page, page_size), "Tickets retrieved")

@router.get("/{ticket_id}")
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return api_response(True, TicketResponse.model_validate(ticket).model_dump(), "Ticket retrieved")

@router.put("/{ticket_id}")
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return api_response(True, TicketResponse.model_validate(ticket).model_dump(), "Ticket updated")

@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    from datetime import datetime
    ticket.deleted_at = datetime.utcnow()
    db.commit()
    return api_response(True, None, "Ticket deleted")

@router.post("/{ticket_id}/assign")
def assign_ticket(
    ticket_id: int,
    data: TicketAssign,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    agent = db.query(User).filter(User.id == data.agent_id, User.role.in_([UserRole.agent, UserRole.admin]), User.is_active == True).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    ticket.assigned_to = agent.id
    if ticket.status == TicketStatus.open:
        ticket.status = TicketStatus.in_progress
    db.commit()
    db.refresh(ticket)

    notif = Notification(
        user_id=agent.id,
        title="Ticket Assigned",
        message=f"Ticket {ticket.ticket_number}: {ticket.title} has been assigned to you",
        type=NotificationType.ticket_assigned,
        ticket_id=ticket.id
    )
    db.add(notif)
    db.commit()
    return api_response(True, TicketResponse.model_validate(ticket).model_dump(), "Ticket assigned")

@router.put("/{ticket_id}/status")
def change_status(
    ticket_id: int,
    data: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    valid_transitions = {
        "open": ["in_progress", "resolved", "closed"],
        "in_progress": ["pending", "resolved", "closed"],
        "pending": ["in_progress", "closed"],
        "resolved": ["closed"],
        "closed": []
    }

    if current_user.role != UserRole.admin and data.status == "closed" and ticket.status != TicketStatus.resolved:
        if ticket.assigned_to != current_user.id and current_user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Not authorized")

    ticket = update_ticket_status(db, ticket, data.status, current_user.id, data.note)

    creator = db.query(User).filter(User.id == ticket.created_by).first()
    if creator and creator.id != current_user.id:
        notif = Notification(
            user_id=creator.id,
            title="Status Updated",
            message=f"Ticket {ticket.ticket_number} status changed to {data.status}",
            type=NotificationType.status_changed,
            ticket_id=ticket.id
        )
        db.add(notif)
        db.commit()

    return api_response(True, TicketResponse.model_validate(ticket).model_dump(), "Status updated")

@router.post("/{ticket_id}/comments")
def add_comment(
    ticket_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    comment = Comment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        content=data.content,
        is_internal=data.is_internal and current_user.role in [UserRole.agent, UserRole.admin]
    )
    db.add(comment)

    if ticket.status == TicketStatus.pending and current_user.role in ["user", "agent", "admin"]:
        ticket.status = TicketStatus.in_progress
        update_ticket_status(db, ticket, "in_progress", current_user.id, "Auto-progressed on comment")

    db.commit()
    db.refresh(comment)

    if current_user.role == "user":
        if ticket.assigned_to:
            notif = Notification(
                user_id=ticket.assigned_to,
                title="New Comment",
                message=f"{current_user.full_name} commented on {ticket.ticket_number}",
                type=NotificationType.comment_added,
                ticket_id=ticket.id
            )
            db.add(notif)
            db.commit()
    else:
        creator = db.query(User).filter(User.id == ticket.created_by).first()
        if creator:
            notif = Notification(
                user_id=creator.id,
                title="New Comment",
                message=f"{current_user.full_name} commented on {ticket.ticket_number}",
                type=NotificationType.comment_added,
                ticket_id=ticket.id
            )
            db.add(notif)
            db.commit()

    return api_response(True, {"id": comment.id, "content": data.content}, "Comment added")

@router.get("/{ticket_id}/comments")
def list_comments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Comment).filter(Comment.ticket_id == ticket_id)
    if current_user.role == "user":
        query = query.filter(Comment.is_internal == False)

    comments = query.order_by(Comment.created_at.asc()).all()
    result = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "ticket_id": c.ticket_id,
            "user_id": c.user_id,
            "content": c.content,
            "is_internal": c.is_internal,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "user_name": user.full_name if user else "Unknown",
            "user_role": user.role.value if user else "user"
        })
    return api_response(True, result, "Comments retrieved")

@router.get("/{ticket_id}/history")
def get_history(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = get_ticket_history(db, ticket_id)
    result = []
    for h in history:
        user = db.query(User).filter(User.id == h.changed_by).first()
        result.append({
            "id": h.id,
            "from_status": h.from_status,
            "to_status": h.to_status,
            "changed_by": h.changed_by,
            "changed_by_name": user.full_name if user else "Unknown",
            "note": h.note,
            "created_at": h.created_at.isoformat() if h.created_at else None
        })
    return api_response(True, result, "History retrieved")

from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.models.ticket import Ticket, TicketStatus, TicketCategory, TicketPriority
from app.models.ticket_history import TicketHistory
from app.models.user import User
from app.services.priority_engine import analyze_priority
from app.services.assignment_engine import auto_assign
from app.utils.helpers import generate_ticket_number, calculate_due_date
from typing import Optional, List
from datetime import datetime

def create_ticket(db: Session, user_id: int, title: str, description: str,
                  category: str, department: Optional[str] = None,
                  attachments: Optional[list] = None) -> Ticket:
    priority_result = analyze_priority(category, title, description)
    priority = priority_result["priority"]

    ticket = Ticket(
        ticket_number=generate_ticket_number(),
        title=title,
        description=description,
        category=category,
        priority=priority,
        status=TicketStatus.open,
        created_by=user_id,
        department=department,
        attachments=attachments or [],
        due_date=calculate_due_date(priority)
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    assigned_to = auto_assign(db, ticket)
    if assigned_to:
        ticket.assigned_to = assigned_to
        ticket.status = TicketStatus.in_progress
        db.commit()
        db.refresh(ticket)

    return ticket

def get_tickets(
    db: Session,
    user: User,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[int] = None,
    department: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20
):
    query = db.query(Ticket).filter(Ticket.deleted_at.is_(None))

    if user.role == "user":
        query = query.filter(Ticket.created_by == user.id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if department:
        query = query.filter(Ticket.department == department)
    if date_from:
        query = query.filter(Ticket.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Ticket.created_at <= datetime.fromisoformat(date_to))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Ticket.title.ilike(search_term)) |
            (Ticket.ticket_number.ilike(search_term)) |
            (Ticket.description.ilike(search_term))
        )

    sort_column = getattr(Ticket, sort_by, Ticket.created_at)
    order_func = desc if sort_order == "desc" else asc
    query = query.order_by(order_func(sort_column))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return items, total

def update_ticket_status(db: Session, ticket: Ticket, new_status: str,
                         changed_by: int, note: Optional[str] = None) -> Ticket:
    old_status = ticket.status.value
    ticket.status = TicketStatus(new_status)

    if new_status == "resolved":
        ticket.resolved_at = datetime.utcnow()
    elif new_status == "closed":
        ticket.closed_at = datetime.utcnow()

    history = TicketHistory(
        ticket_id=ticket.id,
        from_status=old_status,
        to_status=new_status,
        changed_by=changed_by,
        note=note
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return ticket

def get_ticket_history(db: Session, ticket_id: int) -> List[TicketHistory]:
    return db.query(TicketHistory).filter(
        TicketHistory.ticket_id == ticket_id
    ).order_by(asc(TicketHistory.created_at)).all()

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketCategory, TicketPriority
from app.models.ticket_history import TicketHistory
from app.utils.dependencies import get_current_user, require_agent_or_admin
from app.utils.helpers import api_response
from app.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def get_date_range(from_date: Optional[str], to_date: Optional[str]):
    now = datetime.utcnow()
    if to_date:
        end = datetime.fromisoformat(to_date)
    else:
        end = now
    if from_date:
        start = datetime.fromisoformat(from_date)
    else:
        start = now - timedelta(days=30)
    return start, end

@router.get("/stats")
def get_stats(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    start, end = get_date_range(from_date, to_date)
    prev_start = start - (end - start)

    total_tickets = db.query(Ticket).filter(
        Ticket.created_at.between(start, end),
        Ticket.deleted_at.is_(None)
    ).count()
    prev_total = db.query(Ticket).filter(
        Ticket.created_at.between(prev_start, start),
        Ticket.deleted_at.is_(None)
    ).count()

    avg_resolution = db.query(
        func.avg(
            func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600
        )
    ).filter(
        Ticket.resolved_at.between(start, end),
        Ticket.resolved_at.isnot(None),
        Ticket.created_at.isnot(None),
        Ticket.deleted_at.is_(None)
    ).scalar()

    prev_avg = db.query(
        func.avg(
            func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600
        )
    ).filter(
        Ticket.resolved_at.between(prev_start, start),
        Ticket.resolved_at.isnot(None),
        Ticket.created_at.isnot(None),
        Ticket.deleted_at.is_(None)
    ).scalar()

    total_resolved = db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.resolved, TicketStatus.closed]),
        Ticket.created_at.between(start, end),
        Ticket.deleted_at.is_(None)
    ).count()

    sla_met = db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.resolved, TicketStatus.closed]),
        Ticket.resolved_at <= Ticket.due_date,
        Ticket.created_at.between(start, end),
        Ticket.deleted_at.is_(None)
    ).count()

    sla_compliance = (sla_met / total_resolved * 100) if total_resolved > 0 else 0

    open_count = db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.open, TicketStatus.in_progress, TicketStatus.pending]),
        Ticket.deleted_at.is_(None)
    ).count()

    priority_breakdown = {}
    for p in TicketPriority:
        priority_breakdown[p.value] = db.query(Ticket).filter(
            Ticket.priority == p,
            Ticket.status.in_([TicketStatus.open, TicketStatus.in_progress, TicketStatus.pending]),
            Ticket.deleted_at.is_(None)
        ).count()

    return api_response(True, {
        "total_tickets": total_tickets,
        "total_tickets_change": ((total_tickets - prev_total) / prev_total * 100) if prev_total > 0 else 0,
        "avg_resolution_time": round(avg_resolution, 1) if avg_resolution else 0,
        "avg_resolution_time_change": ((avg_resolution - prev_avg) / prev_avg * 100) if prev_avg and prev_avg > 0 else 0,
        "sla_compliance": round(sla_compliance, 1),
        "open_tickets": open_count,
        "priority_breakdown": priority_breakdown
    }, "Stats retrieved")

@router.get("/volume")
def get_volume(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    start, end = get_date_range(from_date, to_date)
    days = (end - start).days or 1

    volume = []
    for i in range(days):
        day = start + timedelta(days=i)
        next_day = day + timedelta(days=1)
        created = db.query(Ticket).filter(
            Ticket.created_at.between(day, next_day),
            Ticket.deleted_at.is_(None)
        ).count()
        resolved = db.query(Ticket).filter(
            Ticket.resolved_at.between(day, next_day),
            Ticket.deleted_at.is_(None)
        ).count()
        volume.append({
            "date": day.strftime("%Y-%m-%d"),
            "created": created,
            "resolved": resolved
        })

    return api_response(True, volume, "Volume data retrieved")

@router.get("/by-category")
def get_by_category(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    start, end = get_date_range(from_date, to_date)
    categories = []
    for cat in TicketCategory:
        count = db.query(Ticket).filter(
            Ticket.category == cat,
            Ticket.created_at.between(start, end),
            Ticket.deleted_at.is_(None)
        ).count()
        if count > 0:
            categories.append({"name": cat.value, "count": count})
    return api_response(True, categories, "Category data retrieved")

@router.get("/by-priority-week")
def get_by_priority_week(
    weeks: int = Query(8),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    result = []
    for i in range(weeks):
        week_start = now - timedelta(weeks=weeks - i)
        week_end = week_start + timedelta(days=7)
        week_label = week_start.strftime("%b %d")
        week_data = {"week": week_label}
        for p in TicketPriority:
            week_data[p.value] = db.query(Ticket).filter(
                Ticket.priority == p,
                Ticket.created_at.between(week_start, week_end),
                Ticket.deleted_at.is_(None)
            ).count()
        result.append(week_data)
    return api_response(True, result, "Priority by week retrieved")

@router.get("/agent-performance")
def get_agent_performance(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    start, end = get_date_range(from_date, to_date)
    agents = db.query(User).filter(User.role == "agent").all()
    result = []
    for agent in agents:
        resolved = db.query(Ticket).filter(
            Ticket.assigned_to == agent.id,
            Ticket.resolved_at.between(start, end),
            Ticket.deleted_at.is_(None)
        ).count()
        avg_time = db.query(
            func.avg(
                func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600
            )
        ).filter(
            Ticket.assigned_to == agent.id,
            Ticket.resolved_at.between(start, end),
            Ticket.resolved_at.isnot(None),
            Ticket.created_at.isnot(None)
        ).scalar()

        total_resolved_sla = db.query(Ticket).filter(
            Ticket.assigned_to == agent.id,
            Ticket.status.in_([TicketStatus.resolved, TicketStatus.closed]),
            Ticket.resolved_at.between(start, end),
            Ticket.deleted_at.is_(None)
        ).count()
        sla_met = db.query(Ticket).filter(
            Ticket.assigned_to == agent.id,
            Ticket.status.in_([TicketStatus.resolved, TicketStatus.closed]),
            Ticket.resolved_at <= Ticket.due_date,
            Ticket.resolved_at.between(start, end),
            Ticket.deleted_at.is_(None)
        ).count()

        result.append({
            "agent_id": agent.id,
            "agent_name": agent.full_name,
            "resolved": resolved,
            "avg_resolution_hours": round(avg_time, 1) if avg_time else 0,
            "sla_compliance": round(sla_met / total_resolved_sla * 100, 1) if total_resolved_sla > 0 else 0
        })

    result.sort(key=lambda x: x["resolved"], reverse=True)
    return api_response(True, result, "Agent performance retrieved")

@router.get("/sla-breached")
def get_sla_breached(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_agent_or_admin),
    db: Session = Depends(get_db)
):
    start, end = get_date_range(from_date, to_date)
    query = db.query(Ticket).filter(
        Ticket.resolved_at > Ticket.due_date,
        Ticket.resolved_at.between(start, end),
        Ticket.deleted_at.is_(None)
    ).order_by(Ticket.resolved_at.desc())

    total = query.count()
    tickets = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for t in tickets:
        agent = db.query(User).filter(User.id == t.assigned_to).first()
        breach_duration = None
        if t.resolved_at and t.due_date:
            delta = t.resolved_at - t.due_date
            breach_duration = f"{int(delta.total_seconds() // 3600)}h {int((delta.total_seconds() % 3600) // 60)}m"
        result.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "title": t.title,
            "priority": t.priority.value,
            "assigned_agent": agent.full_name if agent else "Unassigned",
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "breach_duration": breach_duration
        })

    return api_response(True, {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size)
    }, "SLA breached tickets retrieved")

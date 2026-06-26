from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus

def score_agent(db: Session, agent: User, category: str, department: Optional[str]) -> float:
    total_score = 0.0

    open_tickets = db.query(Ticket).filter(
        Ticket.assigned_to == agent.id,
        Ticket.status.in_([TicketStatus.open, TicketStatus.in_progress, TicketStatus.pending])
    ).count()
    total_score += max(0, 10 - open_tickets) * 3

    expertise_count = db.query(Ticket).filter(
        Ticket.assigned_to == agent.id,
        Ticket.category == category,
        Ticket.status == TicketStatus.resolved
    ).count()
    total_score += expertise_count * 2

    avg_time = db.query(
        func.avg(
            func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600
        )
    ).filter(
        Ticket.assigned_to == agent.id,
        Ticket.resolved_at.isnot(None),
        Ticket.created_at.isnot(None)
    ).scalar()

    if avg_time and avg_time > 0:
        total_score += (1 / avg_time) * 10

    if department and agent.department and agent.department.lower() == department.lower():
        total_score += 5

    return round(total_score, 2)

def find_best_agent(db: Session, category: str, department: Optional[str]) -> Optional[Dict[str, Any]]:
    agents = db.query(User).filter(
        User.role == UserRole.agent,
        User.is_active == True
    ).all()

    if not agents:
        return None

    scored = []
    for agent in agents:
        score = score_agent(db, agent, category, department)
        scored.append({"agent": agent, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)

    if scored and scored[0]["score"] > 0:
        return {
            "agent_id": scored[0]["agent"].id,
            "score": scored[0]["score"],
            "reasoning": f"Assigned to {scored[0]['agent'].full_name} with score {scored[0]['score']}"
        }

    return None

def auto_assign(db: Session, ticket: Ticket) -> Optional[int]:
    result = find_best_agent(db, ticket.category, ticket.department)
    if result:
        return result["agent_id"]
    return None

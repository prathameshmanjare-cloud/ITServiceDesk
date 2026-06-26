from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class NotificationType(str, enum.Enum):
    ticket_created = "ticket_created"
    ticket_assigned = "ticket_assigned"
    status_changed = "status_changed"
    comment_added = "comment_added"
    sla_breach = "sla_breach"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    is_read = Column(Boolean, default=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

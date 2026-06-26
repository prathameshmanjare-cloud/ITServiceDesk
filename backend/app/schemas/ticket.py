from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    department: Optional[str] = None
    attachments: Optional[List[str]] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class TicketAssign(BaseModel):
    agent_id: int

class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    created_by: int
    assigned_to: Optional[int] = None
    department: Optional[str] = None
    attachments: Optional[Any] = None
    due_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    items: List[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

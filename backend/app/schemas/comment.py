from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    content: str
    is_internal: bool
    created_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None

    class Config:
        from_attributes = True

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    body: str


class MessageResponse(BaseModel):
    id: UUID
    sender: str
    body: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ThreadSummary(BaseModel):
    parent_id: UUID
    parent_name: str
    last_message: Optional[str] = None
    last_at: Optional[datetime] = None
    unread: int = 0

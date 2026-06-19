from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoticeBase(BaseModel):
    title: str
    body: str
    attachment_url: Optional[str] = None
    is_pinned: bool = False
    category: str = "Notice"  # Notice | Circular
    target_audience: str
    target_class_id: Optional[UUID] = None


class NoticeCreate(NoticeBase):
    pass


class NoticeUpdate(BaseModel):
    is_pinned: Optional[bool] = None


class NoticeResponse(NoticeBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BroadcastMessageCreate(BaseModel):
    channel: str  # WhatsApp, Email
    recipient_type: str  # Parents, Staff, Class
    target_class_id: Optional[UUID] = None
    message_content: str
    subject: Optional[str] = None  # For Email


class MessageLogResponse(BaseModel):
    id: UUID
    channel: str
    recipient_type: str
    recipient_count: int
    message_content: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    event_type: str
    target_audience: str = "All"
    send_reminder: bool = False


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

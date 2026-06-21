from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DeviceTokenCreate(BaseModel):
    expo_push_token: str


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    body: Optional[str] = None
    type: str
    ref_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

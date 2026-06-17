from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StudentLeaveCreate(BaseModel):
    leave_type: str
    from_date: date
    to_date: date
    reason: str


class StudentLeaveResponse(BaseModel):
    id: UUID
    leave_type: str
    from_date: date
    to_date: date
    reason: str
    status: str
    applied_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

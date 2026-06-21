from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime


class SlotResponse(BaseModel):
    id: UUID
    teacher_id: UUID
    teacher_name: str
    start_time: datetime
    end_time: datetime


class AppointmentCreate(BaseModel):
    slot_id: UUID
    student_id: Optional[UUID] = None
    note: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: UUID
    teacher_name: str
    start_time: datetime
    end_time: datetime
    status: str
    note: Optional[str] = None

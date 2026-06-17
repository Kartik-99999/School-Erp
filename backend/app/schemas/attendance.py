from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AttendanceStudentBase(BaseModel):
    student_id: UUID
    date: date
    status: str
    remarks: Optional[str] = None


class AttendanceStudentCreate(AttendanceStudentBase):
    marked_by: Optional[UUID] = None


class AttendanceStudentResponse(AttendanceStudentBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class AttendanceStudentBulkMark(BaseModel):
    date: date
    class_id: UUID
    section_id: UUID
    attendance_records: List[AttendanceStudentBase]


class AttendanceThresholdAlert(BaseModel):
    student_id: UUID
    student_name: str
    admission_number: str
    total_days: int
    present_days: int
    percentage: float


class AttendanceReportResponse(BaseModel):
    success: bool
    data: List[AttendanceThresholdAlert]

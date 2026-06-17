from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class AttendanceStudent(Base):
    __tablename__ = "attendance_students"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # Present, Absent, Late, Half Day, Medical Leave
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

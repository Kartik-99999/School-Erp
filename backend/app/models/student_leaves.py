import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class StudentLeaveApplication(Base):
    __tablename__ = "student_leave_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    leave_type = Column(String(50), nullable=False)  # Sick, Casual, Emergency, Other
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)

    status = Column(String(20), default="Pending")  # Pending, Approved, Rejected
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    applied_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

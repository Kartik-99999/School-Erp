from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class AppointmentSlot(Base):
    __tablename__ = "appointment_slots"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    teacher_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    # one appointment per slot (hard guard against double-booking)
    slot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("appointment_slots.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    teacher_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    booked_by_user_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=True)
    note = Column(Text)
    status = Column(String(20), default="Booked")  # Booked, Cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

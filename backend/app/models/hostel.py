from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class HostelBuilding(Base):
    __tablename__ = "hostel_buildings"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(200), nullable=False)
    warden_name = Column(String(100))
    warden_contact = Column(String(50))
    type = Column(String(50))  # Boys, Girls, Co-ed
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class HostelRoom(Base):
    __tablename__ = "hostel_rooms"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    building_id = Column(
        UUID(as_uuid=True), ForeignKey("hostel_buildings.id", ondelete="CASCADE"), nullable=False
    )
    room_number = Column(String(50), nullable=False)
    room_type = Column(String(50))  # Single, Double, Dormitory
    capacity = Column(Integer, nullable=False, default=1)
    monthly_fee = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class HostelAllocation(Base):
    __tablename__ = "hostel_allocations"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    room_id = Column(
        UUID(as_uuid=True), ForeignKey("hostel_rooms.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String(50), default="Active")  # Active, Vacated
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

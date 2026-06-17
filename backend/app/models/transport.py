from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class TransportVehicle(Base):
    __tablename__ = "transport_vehicles"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    vehicle_number = Column(String(50), nullable=False, unique=True)
    capacity = Column(Integer, nullable=False)
    driver_name = Column(String(100))
    driver_contact = Column(String(50))
    fitness_expiry_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class TransportRoute(Base):
    __tablename__ = "transport_routes"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    starting_point = Column(String(200))
    vehicle_id = Column(
        UUID(as_uuid=True), ForeignKey("transport_vehicles.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class TransportStop(Base):
    __tablename__ = "transport_stops"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    route_id = Column(
        UUID(as_uuid=True), ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False
    )
    stop_name = Column(String(200), nullable=False)
    pickup_time = Column(Time)
    drop_time = Column(Time)
    monthly_fee = Column(Numeric(10, 2), default=0)  # Specific fee for this stop
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class StudentTransport(Base):
    __tablename__ = "student_transport"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    route_id = Column(
        UUID(as_uuid=True), ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False
    )
    stop_id = Column(
        UUID(as_uuid=True), ForeignKey("transport_stops.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

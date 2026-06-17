from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class School(Base):
    __tablename__ = "schools"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, nullable=False)
    logo_url = Column(Text)
    address = Column(Text)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    board_affiliation = Column(String(100))
    grading_system = Column(String(50), default="percentage")  # percentage or cgpa
    subscription_plan_id = Column(UUID(as_uuid=True), nullable=True)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="Trial")
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)

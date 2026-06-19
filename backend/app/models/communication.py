from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class Notice(Base):
    __tablename__ = "notices"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    attachment_url = Column(Text)
    is_pinned = Column(Boolean, default=False)
    category = Column(String(50), nullable=False, server_default="Notice")  # Notice | Circular
    target_audience = Column(String(50), nullable=False)  # All, Staff, Parents, Specific Class
    target_class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class MessageLog(Base):
    __tablename__ = "messages_log"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    channel = Column(String(50), nullable=False)  # WhatsApp, Email
    recipient_type = Column(String(50), nullable=False)  # Parents, Staff
    recipient_count = Column(Integer, default=1)
    message_content = Column(Text, nullable=False)
    status = Column(String(50), default="Sent")
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    event_type = Column(String(50), nullable=False)  # Holiday, Exam, PTM, Activity
    target_audience = Column(String(50), default="All")
    send_reminder = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

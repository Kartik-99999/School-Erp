import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class ParentMessage(Base):
    """A single message in the conversation between a parent and the school."""

    __tablename__ = "parent_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    parent_id = Column(
        UUID(as_uuid=True), ForeignKey("parents.id", ondelete="CASCADE"), nullable=False
    )
    sender = Column(String(20), nullable=False)  # 'Parent' | 'School'
    sender_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)  # read by the *other* party
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

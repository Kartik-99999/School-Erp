from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class AuditLog(Base):
    """Append-only trail of sensitive actions. Rows are never updated/deleted by
    the app; `content_hash` is a sha256 of the canonical fields so any later edit
    of a row is detectable."""

    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(
        UUID(as_uuid=True), nullable=True, index=True
    )  # null for platform-level actions
    actor_user_id = Column(UUID(as_uuid=True), nullable=True)
    actor_email = Column(String(255))
    actor_role = Column(String(50))
    action = Column(String(100), nullable=False, index=True)  # e.g. "fee.payment.recorded"
    entity_type = Column(String(100))  # e.g. "FeeReceipt"
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    summary = Column(Text)  # human-readable description
    content_hash = Column(String(64))  # sha256 integrity check
    ip_address = Column(String(64))
    created_at = Column(
        DateTime(timezone=True), server_default=func.current_timestamp(), index=True
    )

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class Resource(Base):
    """A per-school file/document in the resources library (study materials, syllabi,
    circulars, generic docs). Mirrors the Notice audience-targeting pattern. Either a
    Cloudinary ``file_url`` or an ``external_url`` is required (enforced at the endpoint)."""

    __tablename__ = "resources"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # Study Material | Syllabus | Circular | Other
    file_url = Column(Text, nullable=True)  # Cloudinary secure URL
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(100), nullable=True)
    external_url = Column(Text, nullable=True)
    # All | Staff | Parents | Students | Specific Class  (mirrors Notice.target_audience)
    target_audience = Column(String(50), nullable=False, server_default="All")
    target_class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True
    )
    target_section_id = Column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True
    )
    subject_id = Column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)

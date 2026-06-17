import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class AdmissionsEnquiry(Base):
    __tablename__ = "admissions_enquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )

    student_name = Column(String(255), nullable=False)
    parent_name = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    admission_for_class = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    stage = Column(
        String(50), default="Enquiry Received"
    )  # Enquiry Received, Under Review, Admitted, Rejected

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AdmissionsDocument(Base):
    __tablename__ = "admissions_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    enquiry_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admissions_enquiries.id", ondelete="CASCADE"),
        nullable=False,
    )

    document_type = Column(String(100), nullable=False)
    file_url = Column(String(1024), nullable=False)
    verified = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

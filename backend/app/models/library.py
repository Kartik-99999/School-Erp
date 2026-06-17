from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class LibraryBook(Base):
    __tablename__ = "library_books"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    author = Column(String(255))
    publisher = Column(String(255))
    isbn = Column(String(50))
    edition = Column(String(50))
    category = Column(String(100))
    total_copies = Column(Integer, default=1)
    available_copies = Column(Integer, default=1)
    location_rack = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class LibraryIssue(Base):
    __tablename__ = "library_issues"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    book_id = Column(
        UUID(as_uuid=True), ForeignKey("library_books.id", ondelete="CASCADE"), nullable=False
    )
    # Polymorphic borrower (either student or staff)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=True
    )
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=True)

    issue_date = Column(Date, nullable=False, server_default=func.current_date())
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)

    status = Column(String(50), default="Issued")  # Issued, Returned, Overdue, Lost
    fine_amount = Column(Numeric(10, 2), default=0)
    fine_paid = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

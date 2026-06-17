from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class FeeConcession(Base):
    __tablename__ = "fee_concessions"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., Sibling Discount, Staff Ward
    type = Column(String(50), nullable=False)  # Percentage or Fixed Amount
    value = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class StudentFeeConcession(Base):
    __tablename__ = "student_fee_concessions"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    concession_id = Column(
        UUID(as_uuid=True), ForeignKey("fee_concessions.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


# (Note: FeeHead and FeeStructure were already created in app/models/setup.py during Module 1)


class FeeSchedule(Base):
    __tablename__ = "fee_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    # Nullable: ad-hoc dues (hostel/transport) are not tied to a class fee structure.
    fee_structure_id = Column(
        UUID(as_uuid=True), ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=True
    )
    label = Column(String(255), nullable=True)  # human label for ad-hoc dues
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    due_date = Column(Date, nullable=False)
    base_amount = Column(Numeric(10, 2), nullable=False)
    concession_amount = Column(Numeric(10, 2), default=0)
    net_due_amount = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0)
    status = Column(String(50), default="Pending")  # Pending, Partial, Paid
    late_fine_applied = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class FeeReceipt(Base):
    __tablename__ = "fee_receipts"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    receipt_number = Column(String(100), unique=True, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(50), nullable=False)  # Cash, Cheque, UPI, Razorpay
    transaction_reference = Column(String(255))
    payment_date = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    remarks = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Null if online
    status = Column(String(50), default="Success")  # Success, Bounced, Refunded
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class FeePayment(Base):
    """Maps a single receipt to one or more schedules (partial/full payment of specific dues)"""

    __tablename__ = "fee_payments"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    receipt_id = Column(
        UUID(as_uuid=True), ForeignKey("fee_receipts.id", ondelete="CASCADE"), nullable=False
    )
    fee_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("fee_schedules.id", ondelete="CASCADE"), nullable=False
    )
    amount_allocated = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class ChequeBounce(Base):
    __tablename__ = "cheque_bounces"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    receipt_id = Column(
        UUID(as_uuid=True), ForeignKey("fee_receipts.id", ondelete="CASCADE"), nullable=False
    )
    bounce_date = Column(Date, nullable=False)
    reason = Column(Text)
    penalty_amount = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

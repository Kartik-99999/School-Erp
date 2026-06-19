from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.crypto import EncryptedString
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
    # Per-school Razorpay credentials — each school collects fees into its OWN account.
    # Secrets are encrypted at rest (Fernet/EncryptedString) and are write-only via the API.
    razorpay_key_id = Column(Text, nullable=True)
    razorpay_key_secret = Column(EncryptedString, nullable=True)
    razorpay_webhook_secret = Column(EncryptedString, nullable=True)
    razorpay_enabled = Column(Boolean, default=False)
    # WhatsApp alerts are OPT-IN per school (default OFF) — uses the platform Twilio sender.
    whatsapp_enabled = Column(Boolean, nullable=False, server_default=text("false"), default=False)
    # Additional per-school fee-collection options (DISPLAY/REDIRECT only — NOT auto-recorded;
    # the external URL + bank details are non-secret and returned in the API as-is).
    external_payment_enabled = Column(
        Boolean, nullable=False, server_default=text("false"), default=False
    )
    external_payment_url = Column(Text, nullable=True)
    bank_transfer_enabled = Column(
        Boolean, nullable=False, server_default=text("false"), default=False
    )
    bank_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(34), nullable=True)
    bank_ifsc = Column(String(11), nullable=True)
    bank_branch = Column(String(255), nullable=True)
    bank_account_holder = Column(String(255), nullable=True)
    bank_upi_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)

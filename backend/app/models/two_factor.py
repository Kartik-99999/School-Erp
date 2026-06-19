from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.crypto import EncryptedString
from app.models.base import Base


class TwoFactorSecret(Base):
    """A user's TOTP shared secret for two-factor auth. The base32 secret is encrypted
    at rest with the same Fernet ``EncryptedString`` used for PII. ``is_enabled`` flips
    true only after the user confirms a first valid code (/auth/2fa/enable), so a
    half-finished enrollment never starts challenging logins.

    No ``school_id`` column (keyed by user), so — like refresh/reset tokens — it has no
    RLS policy and is reachable on the pre-context login path; ``educore_app`` gets
    table grants via enable_rls.py's default privileges."""

    __tablename__ = "two_factor_secrets"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    secret = Column(EncryptedString, nullable=False)  # base32 TOTP secret, encrypted at rest
    is_enabled = Column(Boolean, nullable=False, default=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class TwoFactorRecoveryCode(Base):
    """Single-use backup code for 2FA (when the authenticator is unavailable). Only the
    sha256 of each code is stored; ``used_at`` marks a code spent so it can't be reused."""

    __tablename__ = "two_factor_recovery_codes"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash = Column(String(64), nullable=False, index=True)  # sha256 of the normalized code
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

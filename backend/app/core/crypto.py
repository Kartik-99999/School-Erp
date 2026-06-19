"""Transparent column-level encryption for sensitive identifiers (Aadhaar/APAAR/PEN).

``EncryptedString`` encrypts on write and decrypts on read using Fernet (AES-128-CBC +
HMAC, i.e. authenticated). It is a no-op passthrough when ``PII_ENCRYPTION_KEY`` is
unset (so dev/CI work without config), and reads gracefully fall back to the stored
value if it isn't a valid token (legacy plaintext rows or a rotated key), so existing
data stays readable. Stored as TEXT because ciphertext is longer than the plaintext.

Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import settings


def _fernet() -> Optional[Fernet]:
    key = settings.PII_ENCRYPTION_KEY
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


class EncryptedString(TypeDecorator):
    """String column encrypted at rest with Fernet; transparent to the ORM."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # on write
        if value is None:
            return None
        f = _fernet()
        if f is None:
            return value  # no key configured -> store as-is (dev/CI)
        return f.encrypt(str(value).encode()).decode()

    def process_result_value(self, value, dialect):  # on read
        if value is None:
            return None
        f = _fernet()
        if f is None:
            return value
        try:
            return f.decrypt(value.encode()).decode()
        except (InvalidToken, ValueError):
            return value  # legacy plaintext / different key -> return as-is

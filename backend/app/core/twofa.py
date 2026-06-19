"""TOTP-based two-factor auth helpers (pure logic, no DB).

Wraps ``pyotp`` for secret generation, the otpauth:// provisioning URI used for QR
enrollment, and code verification, plus single-use recovery codes. Recovery codes are
shown to the user exactly once; only their sha256 is ever persisted (see
``app.models.two_factor``), so a DB leak can't be replayed to bypass 2FA.
"""

import hashlib
import secrets

import pyotp

from app.core.config import settings

# RFC 6238 defaults: 6 digits, 30s step. valid_window=1 tolerates one step of clock
# drift (±30s) so a code that ticks over mid-submit still verifies.
_VALID_WINDOW = 1
RECOVERY_CODE_COUNT = 10


def generate_secret() -> str:
    """A fresh random base32 TOTP secret."""
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_name: str) -> str:
    """otpauth:// URI for QR enrollment in an authenticator app (Google/Microsoft
    Authenticator, Authy, …). The frontend renders this as a QR code."""
    return pyotp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=settings.TOTP_ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    """True iff ``code`` is a currently-valid 6-digit TOTP for ``secret`` (±1 step)."""
    if not secret or not code:
        return False
    code = code.strip().replace(" ", "")
    if not code.isdigit():
        return False
    try:
        return pyotp.TOTP(secret).verify(code, valid_window=_VALID_WINDOW)
    except Exception:
        return False


def current_code(secret: str) -> str:
    """The TOTP value for ``secret`` right now. Used by tests / not an API path."""
    return pyotp.TOTP(secret).now()


def generate_recovery_codes(n: int = RECOVERY_CODE_COUNT) -> list[str]:
    """``n`` human-friendly single-use recovery codes, e.g. ``a1b2c3d4-e5f6g7h8``."""
    codes = []
    for _ in range(n):
        raw = secrets.token_hex(8)  # 16 hex chars of entropy
        codes.append(f"{raw[:8]}-{raw[8:]}")
    return codes


def hash_recovery_code(code: str) -> str:
    """sha256 of a *normalized* recovery code so lookup is case-insensitive and
    indifferent to the display hyphen/spaces."""
    normalized = code.strip().lower().replace("-", "").replace(" ", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

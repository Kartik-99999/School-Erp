from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import JWTError, jwt

from app.core.config import settings

# Step-1 (password OK, 2FA pending) token lifetime. Short — it only bridges the gap
# until the client calls /auth/2fa/verify.
MFA_TOKEN_EXPIRE_MINUTES = 5


def _sign(claims: dict) -> str:
    """Sign claims with the configured key + algorithm (RS256 private key by default)."""
    return jwt.encode(claims, settings.jwt_private_key, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Verify a JWT's signature + claims with the configured public key/algorithm.

    Raises ``jose.JWTError`` on any failure — bad signature, an expired token, or a
    disallowed algorithm. Because only ``settings.JWT_ALGORITHM`` is accepted, an
    HS256-signed token is rejected under RS256 (blocks the alg-confusion attack)."""
    return jwt.decode(token, settings.jwt_public_key, algorithms=[settings.JWT_ALGORITHM])


def create_access_token(
    subject: Union[str, Any], role: str, school_id: str = None, expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _sign(
        {
            "exp": expire,
            "sub": str(subject),
            "role": role,
            "school_id": str(school_id) if school_id else None,
        }
    )


def create_mfa_token(subject: Union[str, Any]) -> str:
    """Issue a short-lived token proving step-1 (password) succeeded but 2FA is still
    pending. Carries ``purpose='mfa'`` so it can never be used as an access token."""
    expire = datetime.utcnow() + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES)
    return _sign({"exp": expire, "sub": str(subject), "purpose": "mfa"})


def verify_mfa_token(token: str) -> Optional[str]:
    """Return the subject (user id) from a valid MFA token, else ``None`` (expired,
    tampered, wrong algorithm, or not an MFA-purpose token)."""
    try:
        payload = decode_token(token)
    except JWTError:
        return None
    if payload.get("purpose") != "mfa":
        return None
    return payload.get("sub")

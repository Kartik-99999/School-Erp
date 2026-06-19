from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import JWTError, jwt

from app.core.config import settings

# Step-1 (password OK, 2FA pending) token lifetime. Short — it only bridges the gap
# until the client calls /auth/2fa/verify.
MFA_TOKEN_EXPIRE_MINUTES = 5


def create_access_token(
    subject: Union[str, Any], role: str, school_id: str = None, expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "school_id": str(school_id) if school_id else None,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def create_mfa_token(subject: Union[str, Any]) -> str:
    """Issue a short-lived token proving step-1 (password) succeeded but 2FA is still
    pending. Carries ``purpose='mfa'`` so it can never be used as an access token."""
    expire = datetime.utcnow() + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "purpose": "mfa"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def verify_mfa_token(token: str) -> Optional[str]:
    """Return the subject (user id) from a valid MFA token, else ``None`` (expired,
    tampered, or not an MFA-purpose token)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
    if payload.get("purpose") != "mfa":
        return None
    return payload.get("sub")

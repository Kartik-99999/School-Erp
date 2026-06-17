from datetime import datetime, timedelta
from typing import Any, Union

from jose import jwt

from app.core.config import settings


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

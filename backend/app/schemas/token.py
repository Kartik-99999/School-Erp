from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str
    school_id: Optional[str] = None
    subdomain: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None  # access-token lifetime in seconds


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    school_id: Optional[str] = None

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.jwt import decode_token
from app.db.session import get_db
from app.models.users import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


class TokenData:
    def __init__(self, user_id: str, school_id: Optional[str], role: str):
        self.user_id = user_id
        self.school_id = school_id
        self.role = role


async def get_current_user_token_data(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        school_id: Optional[str] = payload.get("school_id")
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        return TokenData(user_id=user_id, school_id=school_id, role=role)
    except JWTError:
        raise credentials_exception


async def get_current_tenant_id(
    token_data: TokenData = Depends(get_current_user_token_data),
) -> str:
    if not token_data.school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No tenant assigned to this user"
        )
    return token_data.school_id


# Alias kept for endpoints that resolve the tenant without activating RLS context.
async def get_user_school_id(token_data: TokenData = Depends(get_current_user_token_data)) -> str:
    if not token_data.school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No tenant assigned to this user"
        )
    return token_data.school_id


async def get_current_active_user(
    db: AsyncSession = Depends(get_db),
    token_data: TokenData = Depends(get_current_user_token_data),
) -> User:
    try:
        user_uuid = UUID(token_data.user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identity"
        )
    result = await db.execute(select(User).filter(User.id == user_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user


def require_roles(allowed_roles: list[str]):
    def role_checker(token_data: TokenData = Depends(get_current_user_token_data)):
        if token_data.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role.",
            )
        return token_data

    return role_checker


async def set_tenant_context(
    db: AsyncSession = Depends(get_db), school_id: str = Depends(get_current_tenant_id)
):
    """
    Activate the tenant's RLS context on the DB session.

    Sets ``app.current_tenant`` for the current transaction (and clears any bypass
    flag, so a tenant request can never inherit a Super-Admin bypass). The value is
    also stashed on ``session.info`` so the ``after_begin`` listener in
    ``app.db.session`` re-applies it to every later transaction in this request
    (the app commits mid-request, e.g. the ORM refresh after an insert, which would
    otherwise run with no context and hit the fail-closed policy). Validated as a
    UUID because that listener embeds it as a SQL literal.
    """
    from sqlalchemy import text

    try:
        tenant = str(UUID(str(school_id)))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant identifier"
        )

    db.info["rls_tenant"] = tenant
    db.info.pop("rls_bypass", None)
    await db.execute(
        text(
            "SELECT set_config('app.current_tenant', :tenant, true), "
            "set_config('app.bypass_rls', '', true)"
        ),
        {"tenant": tenant},
    )
    return db

from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.notifications import DeviceToken, Notification
from app.schemas.base import APIResponse
from app.schemas.notifications import DeviceTokenCreate, NotificationResponse

router = APIRouter()


@router.get("", response_model=APIResponse[List[NotificationResponse]])
async def list_notifications(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    rows = (
        (
            await db.execute(
                select(Notification)
                .filter(
                    Notification.school_id == UUID(school_id),
                    Notification.user_id == UUID(token_data.user_id),
                )
                .order_by(Notification.created_at.desc())
                .limit(100)
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=rows)


@router.post("/register-device", response_model=APIResponse)
async def register_device(
    body: DeviceTokenCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """Store (or re-assign) an Expo push token for the current user. The token is globally
    unique, so re-registering an existing token just moves it to this user/device."""
    tok = (body.expo_push_token or "").strip()
    if not tok:
        raise HTTPException(status_code=400, detail="Missing push token.")
    existing = (
        (await db.execute(select(DeviceToken).filter(DeviceToken.expo_push_token == tok)))
        .scalars()
        .first()
    )
    if existing:
        existing.user_id = UUID(token_data.user_id)
        existing.school_id = UUID(school_id)
        db.add(existing)
    else:
        db.add(DeviceToken(school_id=UUID(school_id), user_id=UUID(token_data.user_id), expo_push_token=tok))
    await db.commit()
    return APIResponse(success=True, message="Device registered for notifications.")


@router.post("/{notification_id}/read", response_model=APIResponse)
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    n = (
        (
            await db.execute(
                select(Notification).filter(
                    Notification.id == notification_id,
                    Notification.user_id == UUID(token_data.user_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")
    n.is_read = True
    db.add(n)
    await db.commit()
    return APIResponse(success=True, message="Marked read.")

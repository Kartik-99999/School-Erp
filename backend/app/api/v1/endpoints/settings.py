from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.school import School
from app.schemas.base import APIResponse
from app.schemas.super_admin import SchoolResponse, SchoolSettingsUpdate

router = APIRouter()


@router.get("/me", response_model=APIResponse[SchoolResponse])
async def get_my_school_settings(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Get the current school's settings"""
    school = await db.execute(select(School).filter(School.id == UUID(school_id)))
    school = school.scalars().first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    return APIResponse(success=True, data=school)


@router.put(
    "/me",
    response_model=APIResponse[SchoolResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_my_school_settings(
    school_in: SchoolSettingsUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Update the current school's editable settings."""
    school_res = await db.execute(select(School).filter(School.id == UUID(school_id)))
    school = school_res.scalars().first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Apply every field the client actually sent.
    update_data = school_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)

    db.add(school)
    await db.commit()
    await db.refresh(school)

    return APIResponse(success=True, data=school, message="Settings updated successfully")


class PaymentGatewayStatus(BaseModel):
    enabled: bool
    key_id: Optional[str] = None
    has_key_secret: bool
    has_webhook_secret: bool
    configured: bool


class PaymentGatewayUpdate(BaseModel):
    key_id: Optional[str] = None
    key_secret: Optional[str] = None  # write-only — omit/blank to keep the stored value
    webhook_secret: Optional[str] = None  # write-only
    enabled: Optional[bool] = None


def _gateway_status(school: School) -> PaymentGatewayStatus:
    has_key = bool(school.razorpay_key_secret)
    has_wh = bool(school.razorpay_webhook_secret)
    return PaymentGatewayStatus(
        enabled=bool(school.razorpay_enabled),
        key_id=school.razorpay_key_id,
        has_key_secret=has_key,
        has_webhook_secret=has_wh,
        configured=bool(school.razorpay_enabled and school.razorpay_key_id and has_key and has_wh),
    )


@router.get(
    "/payment-gateway",
    response_model=APIResponse[PaymentGatewayStatus],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def get_payment_gateway(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Per-school Razorpay status. Secrets are NEVER returned — only whether they are set."""
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return APIResponse(success=True, data=_gateway_status(school))


@router.put(
    "/payment-gateway",
    response_model=APIResponse[PaymentGatewayStatus],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_payment_gateway(
    payload: PaymentGatewayUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Set the school's own Razorpay credentials. ``key_secret`` / ``webhook_secret`` are
    write-only (only overwritten when a non-empty value is sent) and stored encrypted at rest."""
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if payload.key_id is not None:
        school.razorpay_key_id = payload.key_id.strip() or None
    if payload.key_secret:
        school.razorpay_key_secret = payload.key_secret.strip()
    if payload.webhook_secret:
        school.razorpay_webhook_secret = payload.webhook_secret.strip()
    if payload.enabled is not None:
        school.razorpay_enabled = payload.enabled

    db.add(school)
    await db.commit()
    await db.refresh(school)
    return APIResponse(
        success=True, data=_gateway_status(school), message="Payment gateway updated."
    )

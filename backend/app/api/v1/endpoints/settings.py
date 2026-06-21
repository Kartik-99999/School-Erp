import os
from typing import Annotated, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, BeforeValidator, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.school import School
from app.schemas.base import APIResponse
from app.schemas.super_admin import SchoolResponse, SchoolSettingsUpdate
from app.utils.cloudinary import upload_file
from app.utils.validators import clean_bank_account, clean_external_url, clean_ifsc

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


LOGO_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
LOGO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post(
    "/logo",
    response_model=APIResponse[SchoolResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def upload_school_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Upload/replace the school's logo. Stored on Cloudinary; the secure URL is saved to
    ``logo_url`` and shown on the school's login screen and portal."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in LOGO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{ext}'. Use PNG, JPG, WEBP, GIF or SVG.",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > LOGO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB).")

    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school.logo_url = upload_file(content, folder=f"school_erp/{school_id}/branding")
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return APIResponse(success=True, data=school, message="Logo updated.")


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


# Validated, normalizing fee-option field types (raise ValueError -> HTTP 422 on bad input).
ExternalUrl = Annotated[Optional[str], BeforeValidator(clean_external_url)]
BankAccount = Annotated[Optional[str], BeforeValidator(clean_bank_account)]
IfscCode = Annotated[Optional[str], BeforeValidator(clean_ifsc)]


class FeeOptionsUpdate(BaseModel):
    external_payment_enabled: Optional[bool] = None
    external_payment_url: ExternalUrl = None
    bank_transfer_enabled: Optional[bool] = None
    bank_name: Optional[str] = None
    bank_account_number: BankAccount = None
    bank_ifsc: IfscCode = None
    bank_branch: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_upi_id: Optional[str] = None


class FeeOptionsResponse(BaseModel):
    external_payment_enabled: bool
    external_payment_url: Optional[str] = None
    bank_transfer_enabled: bool
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_upi_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


@router.get(
    "/fee-options",
    response_model=APIResponse[FeeOptionsResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def get_fee_options(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """The school's display/redirect fee options (external URL + bank transfer). Unlike the
    Razorpay payment-gateway endpoint, these are NON-secret and returned as-is."""
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return APIResponse(success=True, data=FeeOptionsResponse.model_validate(school))


@router.put(
    "/fee-options",
    response_model=APIResponse[FeeOptionsResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_fee_options(
    payload: FeeOptionsUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Configure the external payment URL + bank-transfer details and their enable flags.
    A bad IFSC / account number / URL is rejected with 422 (see app/utils/validators.py)."""
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(school, field, value)
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return APIResponse(
        success=True,
        data=FeeOptionsResponse.model_validate(school),
        message="Fee options updated.",
    )

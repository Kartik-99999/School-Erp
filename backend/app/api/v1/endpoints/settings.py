from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
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

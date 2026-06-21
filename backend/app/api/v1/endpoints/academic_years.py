from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_setup import crud_academic_year
from app.models.users import User
from app.schemas.base import APIResponse
from app.schemas.setup import AcademicYearCreate, AcademicYearResponse

router = APIRouter()


@router.get("/", response_model=APIResponse[List[AcademicYearResponse]])
async def read_academic_years(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    years = await crud_academic_year.get_multi(db, skip=skip, limit=limit, school_id=school_id)
    return APIResponse(success=True, data=years)


@router.post(
    "/",
    response_model=APIResponse[AcademicYearResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_academic_year(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    year_in: AcademicYearCreate,
) -> Any:
    year = await crud_academic_year.create(db, obj_in=year_in, school_id=school_id)
    return APIResponse(success=True, data=year, message="Academic Year created successfully")


class ActiveYearUpdate(BaseModel):
    academic_year_id: UUID


@router.get("/active", response_model=APIResponse)
async def get_active_academic_year(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """The user's selected active academic year (per-user setting), or null."""
    user = (
        (await db.execute(select(User).filter(User.id == UUID(token_data.user_id)))).scalars().first()
    )
    active = str(user.active_academic_year_id) if user and user.active_academic_year_id else None
    return APIResponse(success=True, data={"active_academic_year_id": active})


@router.put("/active", response_model=APIResponse)
async def set_active_academic_year(
    body: ActiveYearUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """Persist the user's active academic year. The year must belong to the caller's
    school (tenant-checked). Year-scoped reads can honor users.active_academic_year_id
    (or a ?academic_year_id= param)."""
    year = await crud_academic_year.get(db, id=body.academic_year_id, school_id=school_id)
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found for this school.")
    user = (
        (await db.execute(select(User).filter(User.id == UUID(token_data.user_id)))).scalars().first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.active_academic_year_id = body.academic_year_id
    db.add(user)
    await db.commit()
    return APIResponse(
        success=True,
        data={"active_academic_year_id": str(body.academic_year_id)},
        message="Active academic year updated.",
    )

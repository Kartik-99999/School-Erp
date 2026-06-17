from typing import Any, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud.crud_setup import crud_academic_year
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

from typing import Any, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud.crud_setup import crud_subject
from app.schemas.base import APIResponse
from app.schemas.setup import SubjectCreate, SubjectResponse

router = APIRouter()


@router.get("/", response_model=APIResponse[List[SubjectResponse]])
async def read_subjects(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    subjects = await crud_subject.get_multi(db, skip=skip, limit=limit, school_id=school_id)
    return APIResponse(success=True, data=subjects)


@router.post(
    "/",
    response_model=APIResponse[SubjectResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_subject(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    subject_in: SubjectCreate,
) -> Any:
    subject = await crud_subject.create(db, obj_in=subject_in, school_id=school_id)
    return APIResponse(success=True, data=subject, message="Subject created successfully")

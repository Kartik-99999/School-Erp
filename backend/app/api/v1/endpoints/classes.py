from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud.crud_setup import crud_class, crud_section
from app.models.setup import ClassSubject, Subject
from app.schemas.base import APIResponse
from app.schemas.setup import (
    ClassCreate,
    ClassResponse,
    ClassSubjectCreate,
    SectionCreate,
    SectionResponse,
    SubjectResponse,
)

router = APIRouter()


@router.get("/", response_model=APIResponse[List[ClassResponse]])
async def read_classes(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    classes = await crud_class.get_multi(db, skip=skip, limit=limit, school_id=school_id)
    return APIResponse(success=True, data=classes)


@router.post(
    "/",
    response_model=APIResponse[ClassResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_class(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    class_in: ClassCreate,
) -> Any:
    cls = await crud_class.create(db, obj_in=class_in, school_id=school_id)
    return APIResponse(success=True, data=cls, message="Class created successfully")


@router.get("/{id}/sections", response_model=APIResponse[List[SectionResponse]])
async def read_sections_for_class(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    sections = await crud_section.get_by_class(db, school_id=school_id, class_id=id)
    return APIResponse(success=True, data=sections)


@router.post(
    "/{id}/sections",
    response_model=APIResponse[SectionResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_section_for_class(
    id: UUID,
    section_in: SectionCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    if section_in.class_id != id:
        raise HTTPException(status_code=400, detail="Class ID mismatch")
    section = await crud_section.create(db, obj_in=section_in, school_id=school_id)
    return APIResponse(success=True, data=section, message="Section created successfully")


@router.delete(
    "/{id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def delete_class(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    cls = await crud_class.get(db, id=id, school_id=school_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    try:
        # First try to delete associated sections (tenant-scoped)
        from app.models.setup import Section

        await db.execute(
            delete(Section).where(Section.class_id == id, Section.school_id == UUID(school_id))
        )

        # Then delete the class
        await crud_class.remove(db, id=id)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete class. It is already associated with students, timetables, or fees.",
        )

    return APIResponse(success=True, message="Class deleted successfully")


# --- CLASS ↔ SUBJECT MAPPING (which subjects each grade has) ---
@router.get("/{id}/subjects", response_model=APIResponse[List[SubjectResponse]])
async def read_subjects_for_class(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    rows = (
        (
            await db.execute(
                select(Subject)
                .join(ClassSubject, ClassSubject.subject_id == Subject.id)
                .filter(ClassSubject.class_id == id, ClassSubject.school_id == UUID(school_id))
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=rows)


@router.post(
    "/{id}/subjects",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def add_subject_to_class(
    id: UUID,
    body: ClassSubjectCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    existing = (
        (
            await db.execute(
                select(ClassSubject).filter(
                    ClassSubject.class_id == id,
                    ClassSubject.subject_id == body.subject_id,
                    ClassSubject.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        return APIResponse(success=True, message="Subject already mapped to this class")
    cs = ClassSubject(school_id=UUID(school_id), class_id=id, subject_id=body.subject_id)
    db.add(cs)
    await db.commit()
    return APIResponse(success=True, message="Subject added to class")


@router.delete(
    "/{id}/subjects/{subject_id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def remove_subject_from_class(
    id: UUID,
    subject_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    await db.execute(
        delete(ClassSubject).filter(
            ClassSubject.class_id == id,
            ClassSubject.subject_id == subject_id,
            ClassSubject.school_id == UUID(school_id),
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Subject removed from class")


@router.delete(
    "/sections/{section_id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def delete_section(
    section_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    section = await crud_section.get(db, id=section_id, school_id=school_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    try:
        await crud_section.remove(db, id=section_id)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete section. It is already associated with students or timetables.",
        )

    return APIResponse(success=True, message="Section deleted successfully")

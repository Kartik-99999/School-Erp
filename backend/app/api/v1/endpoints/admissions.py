from datetime import date
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.limiter import limiter
from app.crud.crud_admissions import crud_enquiry
from app.crud.crud_audit import record_audit
from app.crud.crud_school import crud_school
from app.crud.crud_student import crud_student
from app.models.setup import AcademicYear, ClassModel
from app.models.users import User
from app.schemas.admissions import (
    EnquiryCreate,
    EnquiryPublicCreate,
    EnquiryResponse,
    EnquiryUpdate,
)
from app.schemas.base import APIResponse
from app.schemas.students import ParentCreate, StudentCreate

router = APIRouter()


@router.post("/enquiry/public/{school_slug}", response_model=APIResponse[EnquiryResponse])
@limiter.limit("10/hour")
async def create_public_enquiry(
    request: Request,
    school_slug: str,
    enquiry_in: EnquiryPublicCreate,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    school = await crud_school.get_by_subdomain(db, subdomain=school_slug)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Public route (no auth/tenant context): scope this request to the target school
    # so the strict RLS policy on admissions_enquiries permits the insert (and the
    # post-commit ORM refresh — via the after_begin listener reading session.info).
    db.info["rls_tenant"] = str(school.id)
    await db.execute(
        text("SELECT set_config('app.current_tenant', :t, true)"), {"t": str(school.id)}
    )

    enquiry_data = EnquiryCreate(**enquiry_in.model_dump(), stage="Enquiry Received")
    enquiry = await crud_enquiry.create(db, obj_in=enquiry_data, school_id=school.id)
    return APIResponse(success=True, data=enquiry, message="Enquiry submitted successfully")


@router.get(
    "/enquiries",
    response_model=APIResponse[List[EnquiryResponse]],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def read_enquiries(
    db: AsyncSession = Depends(deps.set_tenant_context),
    skip: int = 0,
    limit: int = 100,
    stage: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
    school_id: str = Depends(deps.get_user_school_id),
) -> Any:
    enquiries = await crud_enquiry.get_multi_by_stage(
        db, school_id=UUID(school_id), stage=stage, skip=skip, limit=limit
    )
    return APIResponse(success=True, data=enquiries)


@router.post(
    "/enquiries",
    response_model=APIResponse[EnquiryResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_internal_enquiry(
    enquiry_in: EnquiryPublicCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    current_user: User = Depends(deps.get_current_active_user),
    school_id: str = Depends(deps.get_user_school_id),
) -> Any:
    enquiry_data = EnquiryCreate(**enquiry_in.model_dump(), stage="New")
    enquiry = await crud_enquiry.create(db, obj_in=enquiry_data, school_id=UUID(school_id))
    return APIResponse(success=True, data=enquiry, message="Enquiry created successfully")


@router.put(
    "/enquiries/{id}/stage",
    response_model=APIResponse[EnquiryResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_enquiry_stage(
    id: UUID,
    stage: str = Form(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    current_user: User = Depends(deps.get_current_active_user),
    school_id: str = Depends(deps.get_user_school_id),
) -> Any:
    enquiry = await crud_enquiry.get(db, id=id)
    if not enquiry or str(enquiry.school_id) != school_id:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    enquiry_in = EnquiryUpdate(stage=stage)
    enquiry = await crud_enquiry.update(db, db_obj=enquiry, obj_in=enquiry_in)
    return APIResponse(success=True, data=enquiry, message="Stage updated")


@router.post(
    "/enquiries/{id}/convert",
    response_model=APIResponse[dict],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def convert_enquiry_to_student(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    current_user: User = Depends(deps.get_current_active_user),
    school_id: str = Depends(deps.get_user_school_id),
) -> Any:
    enquiry = await crud_enquiry.get(db, id=id)
    if not enquiry or str(enquiry.school_id) != school_id:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if enquiry.stage == "Admitted":
        raise HTTPException(status_code=400, detail="This enquiry has already been admitted.")

    school_uuid = UUID(school_id)

    # An active academic year is required to generate an admission number.
    ay_res = await db.execute(
        select(AcademicYear).filter(
            AcademicYear.school_id == school_uuid,
            AcademicYear.is_active == True,
        )
    )
    academic_year = ay_res.scalars().first()
    if not academic_year:
        raise HTTPException(
            status_code=400,
            detail="No active academic year is set. Please configure one before admitting students.",
        )

    # Best-effort: resolve the class from the name captured on the enquiry.
    current_class_id = None
    if enquiry.admission_for_class:
        cls_res = await db.execute(
            select(ClassModel).filter(
                ClassModel.school_id == school_uuid,
                ClassModel.name.ilike(enquiry.admission_for_class.strip()),
            )
        )
        cls = cls_res.scalars().first()
        if cls:
            current_class_id = cls.id

    # Split the captured full name into first/last.
    name_parts = (enquiry.student_name or "").strip().split()
    first_name = name_parts[0] if name_parts else "Student"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "-"

    student_in = StudentCreate(
        first_name=first_name,
        last_name=last_name,
        dob=date(2000, 1, 1),  # placeholder; admin completes DOB after admission
        current_class_id=current_class_id,
        academic_year_id=academic_year.id,
        status="Active",
        parent=ParentCreate(
            father_name=enquiry.parent_name,
            father_phone=enquiry.contact_number,
            primary_contact_email=enquiry.email,
        ),
    )

    try:
        # Create the student WITHOUT committing, mark the enquiry Admitted, then
        # commit both together — so a failure can't leave a half-converted enquiry
        # (which would let a retry create a duplicate student).
        student = await crud_student.create_with_parent_and_user(
            db, obj_in=student_in, school_id=school_id, commit=False
        )
        enquiry.stage = "Admitted"
        db.add(enquiry)
        await record_audit(
            db,
            action="admission.enquiry.converted",
            school_id=school_uuid,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            entity_type="Student",
            entity_id=student.id,
            summary=f"Enquiry {id} converted to student {student.admission_number}",
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not convert enquiry: {e}")

    return APIResponse(
        success=True,
        data={
            "status": "converted",
            "student_id": str(student.id),
            "admission_number": student.admission_number,
        },
        message=f"Admitted as {student.admission_number}. Complete DOB/section in the Students module.",
    )

from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_staff import crud_leave_application, crud_leave_type
from app.models.student_leaves import StudentLeaveApplication
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.staff import (
    LeaveApplicationResponse,
    LeaveTypeCreate,
    LeaveTypeResponse,
)

router = APIRouter()


@router.get("/types", response_model=APIResponse[List[LeaveTypeResponse]])
async def get_leave_types(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    types = await crud_leave_type.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=types)


@router.post(
    "/types",
    response_model=APIResponse[LeaveTypeResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_leave_type(
    type_in: LeaveTypeCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    leave_type = await crud_leave_type.create(db, obj_in=type_in, school_id=school_id)
    return APIResponse(success=True, data=leave_type)


@router.get("/applications", response_model=APIResponse[List[LeaveApplicationResponse]])
async def get_leave_applications(
    status: str = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = select(crud_leave_application.model).filter(
        crud_leave_application.model.school_id == UUID(school_id)
    )
    if status:
        query = query.filter(crud_leave_application.model.status == status)
    result = await db.execute(query)
    apps = result.scalars().all()
    return APIResponse(success=True, data=apps)


@router.put(
    "/applications/{id}/status",
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_leave_status(
    id: UUID,
    status: str,  # Approved or Rejected
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    if status not in ("Approved", "Rejected", "Pending"):
        raise HTTPException(
            status_code=400, detail="Status must be Approved, Rejected, or Pending."
        )
    app = await crud_leave_application.get(db, id=id, school_id=school_id)
    if not app:
        raise HTTPException(status_code=404)

    app.status = status
    app.approved_by = UUID(token_data.user_id)
    db.add(app)
    await db.commit()
    return APIResponse(success=True, message=f"Leave application {status.lower()} successfully")


# --- STUDENT LEAVE APPLICATIONS (admin review) ---
@router.get(
    "/student-applications",
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def get_student_leave_applications(
    status: str = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = (
        select(StudentLeaveApplication, Student)
        .join(Student, Student.id == StudentLeaveApplication.student_id)
        .filter(StudentLeaveApplication.school_id == UUID(school_id))
    )
    if status:
        query = query.filter(StudentLeaveApplication.status == status)
    query = query.order_by(StudentLeaveApplication.applied_at.desc())
    rows = (await db.execute(query)).all()

    data = []
    for leave, student in rows:
        data.append(
            {
                "id": str(leave.id),
                "student_name": f"{student.first_name} {student.last_name}",
                "admission_number": student.admission_number,
                "leave_type": leave.leave_type,
                "from_date": leave.from_date.isoformat() if leave.from_date else None,
                "to_date": leave.to_date.isoformat() if leave.to_date else None,
                "reason": leave.reason,
                "status": leave.status,
                "applied_at": leave.applied_at.isoformat() if leave.applied_at else None,
            }
        )
    return APIResponse(success=True, data=data)


@router.put(
    "/student-applications/{id}/status",
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_student_leave_status(
    id: UUID,
    status: str,  # Approved or Rejected
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    if status not in ("Approved", "Rejected", "Pending"):
        raise HTTPException(
            status_code=400, detail="Status must be Approved, Rejected, or Pending."
        )

    leave = (
        (
            await db.execute(
                select(StudentLeaveApplication).filter(
                    StudentLeaveApplication.id == id,
                    StudentLeaveApplication.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not leave:
        raise HTTPException(status_code=404, detail="Student leave application not found")

    leave.status = status
    leave.reviewed_by = UUID(token_data.user_id)
    db.add(leave)
    await db.commit()
    return APIResponse(success=True, message=f"Student leave {status.lower()}.")

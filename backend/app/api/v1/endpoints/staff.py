import logging
from datetime import date
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_staff import crud_attendance_staff, crud_staff, crud_staff_document
from app.schemas.base import APIResponse
from app.schemas.staff import (
    AttendanceBulkMark,
    AttendanceStaffCreate,
    AttendanceStaffResponse,
    StaffCreate,
    StaffDocumentCreate,
    StaffDocumentResponse,
    StaffResponse,
)
from app.utils.cloudinary import upload_file

router = APIRouter()

logger = logging.getLogger(__name__)

import io
from datetime import datetime

import pandas as pd

from app.schemas.students import BulkImportResult


@router.post(
    "/bulk-import",
    response_model=APIResponse[BulkImportResult],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def bulk_import_staff(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")

    success_count = 0
    errors = []

    for index, row in df.iterrows():
        try:
            staff_in = StaffCreate(
                first_name=row["first_name"],
                last_name=row["last_name"],
                employee_id=str(row.get("employee_id", "")),
                designation=str(row.get("designation", "")),
                department=str(row.get("department", "")),
                dob=(
                    datetime.strptime(row["dob"], "%Y-%m-%d").date()
                    if pd.notnull(row.get("dob"))
                    else None
                ),
                gender=str(row.get("gender", "")),
                phone=str(row.get("phone", "")),
                email=str(row["email"]),
                role_name=str(row.get("role_name", "Teacher")),
            )
            await crud_staff.create_with_user(db=db, obj_in=staff_in, school_id=school_id)
            success_count += 1
        except Exception:
            logger.exception("Bulk import row %s failed", index + 2)
            errors.append(
                {
                    "row": index + 2,
                    "error": "Row could not be imported (duplicate or invalid data).",
                }
            )

    return APIResponse(
        success=True,
        data=BulkImportResult(success_count=success_count, failed_count=len(errors), errors=errors),
        message="Bulk import processed",
    )


@router.get("/", response_model=APIResponse[List[StaffResponse]])
async def read_staff(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    department: Optional[str] = None,
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    query = select(crud_staff.model).filter(crud_staff.model.school_id == UUID(school_id))
    if department:
        query = query.filter(crud_staff.model.department == department)
    # Filter by user role if role param is provided
    if role:
        from app.models.users import Role, User

        query = (
            query.join(User, crud_staff.model.user_id == User.id)
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == role)
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    staff = result.scalars().all()
    return APIResponse(success=True, data=staff)


@router.post(
    "/",
    response_model=APIResponse[StaffResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_staff(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    staff_in: StaffCreate,
) -> Any:
    try:
        staff = await crud_staff.create_with_user(db=db, obj_in=staff_in, school_id=school_id)
        raw_password = getattr(staff, "generated_password", None)

        return APIResponse(
            success=True,
            data=staff,
            message=f"Staff created successfully. Temp Password: {raw_password}",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Creating staff member failed")
        raise HTTPException(status_code=400, detail="Could not create the staff member.")


@router.get("/{id}", response_model=APIResponse[StaffResponse])
async def get_staff_profile(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    staff = await crud_staff.get(db, id=id, school_id=school_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return APIResponse(success=True, data=staff)


@router.post(
    "/{id}/documents",
    response_model=APIResponse[StaffDocumentResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def upload_staff_document(
    id: UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    staff = await crud_staff.get(db, id=id, school_id=school_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    content = await file.read()
    url = upload_file(content, folder=f"school_{school_id}/staff")

    doc_in = StaffDocumentCreate(staff_id=id, document_type=document_type, document_url=url)
    doc = await crud_staff_document.create(db, obj_in=doc_in, school_id=school_id)
    return APIResponse(success=True, data=doc, message="Document uploaded successfully")


@router.post(
    "/attendance/bulk-mark",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def mark_bulk_attendance(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    req: AttendanceBulkMark,
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    for rec in req.attendance_records:
        rec_in = AttendanceStaffCreate(
            staff_id=rec.staff_id,
            date=req.date,
            status=rec.status,
            remarks=rec.remarks,
            marked_by=UUID(token_data.user_id),
        )
        await crud_attendance_staff.create(db, obj_in=rec_in, school_id=school_id)
    return APIResponse(
        success=True, message=f"Attendance marked for {len(req.attendance_records)} staff members"
    )


@router.get("/attendance/daily", response_model=APIResponse[List[AttendanceStaffResponse]])
async def get_daily_attendance(
    date: date,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = select(crud_attendance_staff.model).filter(
        crud_attendance_staff.model.school_id == UUID(school_id),
        crud_attendance_staff.model.date == date,
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return APIResponse(success=True, data=records)


# --- Staff profile photo upload ---
STAFF_PHOTO_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
STAFF_PHOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post(
    "/{id}/photo",
    response_model=APIResponse[StaffResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def upload_staff_photo(
    id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Upload/replace a staff member's profile photo (Cloudinary -> photo_url)."""
    from app.models.staff import Staff

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    ext = ("." + file.filename.rsplit(".", 1)[-1]).lower() if "." in file.filename else ""
    if ext not in STAFF_PHOTO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{ext}'. Use PNG, JPG, WEBP or GIF.",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > STAFF_PHOTO_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB).")

    staff = (await db.execute(select(Staff).filter(Staff.id == UUID(id)))).scalars().first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    staff.photo_url = upload_file(content, folder=f"school_{school_id}/staff/{id}")
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return APIResponse(success=True, data=staff, message="Photo updated.")

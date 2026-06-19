import os
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.resources import Resource
from app.models.students import Parent, Student
from app.schemas.base import APIResponse
from app.schemas.resources import ResourceResponse
from app.utils.cloudinary import upload_file

router = APIRouter()

ALLOWED_CATEGORIES = {"Study Material", "Syllabus", "Circular", "Other"}
ALLOWED_AUDIENCES = {"All", "Staff", "Parents", "Students", "Specific Class"}
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
}
MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
# Internal/staff roles see every resource in their tenant.
_STAFF_ROLES = ("School Admin", "Super Admin", "Teacher", "Accountant")


async def _visible_filter(db: AsyncSession, token_data: deps.TokenData):
    """A SQLAlchemy condition limiting resources to what the requesting user may see
    (mirrors the Notice audience model). The caller applies school_id + is_deleted.
    Returns None for staff (no extra filter — they see everything in the tenant)."""
    role = token_data.role
    if role in _STAFF_ROLES:
        return None
    if role == "Student":
        student = (
            (await db.execute(select(Student).filter(Student.user_id == UUID(token_data.user_id))))
            .scalars()
            .first()
        )
        conds = [Resource.target_audience.in_(["All", "Students"])]
        if student and student.current_class_id:
            conds.append(
                and_(
                    Resource.target_audience == "Specific Class",
                    Resource.target_class_id == student.current_class_id,
                )
            )
        return or_(*conds)
    if role == "Parent":
        parent = (
            (await db.execute(select(Parent).filter(Parent.user_id == UUID(token_data.user_id))))
            .scalars()
            .first()
        )
        class_ids = []
        if parent:
            class_ids = [
                c
                for c in (
                    await db.execute(
                        select(Student.current_class_id).filter(Student.parent_id == parent.id)
                    )
                )
                .scalars()
                .all()
                if c
            ]
        conds = [Resource.target_audience.in_(["All", "Parents"])]
        if class_ids:
            conds.append(
                and_(
                    Resource.target_audience == "Specific Class",
                    Resource.target_class_id.in_(class_ids),
                )
            )
        return or_(*conds)
    return Resource.target_audience == "All"


@router.post(
    "",
    response_model=APIResponse[ResourceResponse],
    dependencies=[Depends(deps.require_roles(["Teacher", "School Admin", "Super Admin"]))],
)
async def create_resource(
    title: str = Form(...),
    category: str = Form(...),
    target_audience: str = Form("All"),
    description: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None),
    target_class_id: Optional[UUID] = Form(None),
    target_section_id: Optional[UUID] = Form(None),
    subject_id: Optional[UUID] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Upload a resource. Provide a file (stored on Cloudinary, foldered by school) and/or
    an ``external_url`` — at least one is required."""
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=422, detail=f"Invalid category. Allowed: {sorted(ALLOWED_CATEGORIES)}."
        )
    if target_audience not in ALLOWED_AUDIENCES:
        raise HTTPException(
            status_code=422, detail=f"Invalid audience. Allowed: {sorted(ALLOWED_AUDIENCES)}."
        )

    file_url = None
    file_name = None
    file_type = None
    if file is not None and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'.")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="File too large (max 15 MB).")
        file_url = upload_file(content, folder=f"school_erp/{school_id}/resources")
        file_name = file.filename
        file_type = ext.lstrip(".")

    ext_url = (external_url or "").strip() or None
    if not file_url and not ext_url:
        raise HTTPException(status_code=400, detail="Provide a file or an external URL.")

    resource = Resource(
        school_id=UUID(school_id),
        title=title.strip(),
        description=(description or "").strip() or None,
        category=category,
        file_url=file_url,
        file_name=file_name,
        file_type=file_type,
        external_url=ext_url,
        target_audience=target_audience,
        target_class_id=target_class_id,
        target_section_id=target_section_id,
        subject_id=subject_id,
        uploaded_by=UUID(token_data.user_id),
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return APIResponse(success=True, data=resource, message="Resource uploaded.")


@router.get("", response_model=APIResponse[List[ResourceResponse]])
async def list_resources(
    category: Optional[str] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """List resources visible to the current user (tenant-scoped + audience-filtered)."""
    query = select(Resource).filter(
        Resource.school_id == UUID(school_id), Resource.is_deleted == False
    )
    visible = await _visible_filter(db, token_data)
    if visible is not None:
        query = query.filter(visible)
    if category:
        query = query.filter(Resource.category == category)
    query = query.order_by(Resource.created_at.desc())
    rows = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=rows)


@router.get("/{id}", response_model=APIResponse[ResourceResponse])
async def get_resource(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Resource detail (download via file_url / external_url). Audience-checked."""
    query = select(Resource).filter(
        Resource.id == id, Resource.school_id == UUID(school_id), Resource.is_deleted == False
    )
    visible = await _visible_filter(db, token_data)
    if visible is not None:
        query = query.filter(visible)
    resource = (await db.execute(query)).scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return APIResponse(success=True, data=resource)


@router.delete(
    "/{id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["Teacher", "School Admin", "Super Admin"]))],
)
async def delete_resource(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Soft-delete a resource. School Admin / Super Admin may delete any; a Teacher only
    the resources they uploaded."""
    resource = (
        (
            await db.execute(
                select(Resource).filter(
                    Resource.id == id,
                    Resource.school_id == UUID(school_id),
                    Resource.is_deleted == False,
                )
            )
        )
        .scalars()
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if token_data.role == "Teacher" and resource.uploaded_by != UUID(token_data.user_id):
        raise HTTPException(status_code=403, detail="You can only delete resources you uploaded.")
    resource.is_deleted = True
    db.add(resource)
    await db.commit()
    return APIResponse(success=True, message="Resource deleted.")

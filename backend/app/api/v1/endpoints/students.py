import io
import logging
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_student import crud_student
from app.models.school import School
from app.models.setup import AcademicYear, ClassModel, Section
from app.models.students import Parent, Student, StudentDocument, StudentMedical
from app.schemas.base import APIResponse
from app.schemas.students import (
    BulkImportResult,
    BulkPromoteRequest,
    ParentResponse,
    StudentCreate,
    StudentMedicalResponse,
    StudentPage,
    StudentProfileResponse,
    StudentResponse,
    StudentUpdate,
)
from app.utils.cloudinary import upload_file
from app.utils.pdf import generate_pdf

router = APIRouter()

logger = logging.getLogger(__name__)


def _cell(row, key):
    """Read a CSV cell as a trimmed string, treating blanks/NaN as None."""
    v = row.get(key)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


@router.get("/", response_model=APIResponse[List[StudentResponse]])
async def read_students(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
    class_id: Optional[UUID] = None,
    section_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    query = select(Student).filter(Student.school_id == UUID(school_id))

    if token_data.role == "Parent":
        parent_res = await db.execute(
            select(Parent).filter(Parent.user_id == UUID(token_data.user_id))
        )
        parent = parent_res.scalars().first()
        if not parent:
            return APIResponse(success=True, data=[])  # No children linked
        query = query.filter(Student.parent_id == parent.id)

    if class_id:
        query = query.filter(Student.current_class_id == class_id)
    if section_id:
        query = query.filter(Student.current_section_id == section_id)
    if academic_year_id:
        query = query.filter(Student.academic_year_id == academic_year_id)
    if status:
        query = query.filter(Student.status == status)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    students = result.scalars().all()

    return APIResponse(success=True, data=students)


@router.get("/paged", response_model=APIResponse[StudentPage])
async def read_students_paged(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
    search: Optional[str] = None,
    class_id: Optional[UUID] = None,
    section_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    status: Optional[str] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    skip: int = 0,
    limit: int = 25,
) -> Any:
    """Server-side paginated/searchable/sortable student list. Returns the page
    plus the total count so the client can render pagination without fetching all
    rows."""
    limit = max(1, min(limit, 100))  # clamp page size
    filters = [Student.school_id == UUID(school_id)]

    if token_data.role == "Parent":
        parent = (
            (await db.execute(select(Parent).filter(Parent.user_id == UUID(token_data.user_id))))
            .scalars()
            .first()
        )
        if not parent:
            return APIResponse(
                success=True, data=StudentPage(items=[], total=0, skip=skip, limit=limit)
            )
        filters.append(Student.parent_id == parent.id)

    if class_id:
        filters.append(Student.current_class_id == class_id)
    if section_id:
        filters.append(Student.current_section_id == section_id)
    if academic_year_id:
        filters.append(Student.academic_year_id == academic_year_id)
    if status:
        filters.append(Student.status == status)
    if search:
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Student.first_name).like(term),
                func.lower(Student.last_name).like(term),
                func.lower(Student.admission_number).like(term),
            )
        )

    total = (await db.execute(select(func.count(Student.id)).filter(*filters))).scalar_one()

    sort_cols = {
        "name": Student.first_name,
        "admission_number": Student.admission_number,
        "status": Student.status,
        "created_at": Student.created_at,
    }
    col = sort_cols.get(sort_by, Student.first_name)
    order = desc(col) if sort_dir == "desc" else asc(col)

    rows = (
        (
            await db.execute(
                select(Student).filter(*filters).order_by(order).offset(skip).limit(limit)
            )
        )
        .scalars()
        .all()
    )

    return APIResponse(
        success=True, data=StudentPage(items=rows, total=total, skip=skip, limit=limit)
    )


@router.post(
    "/",
    response_model=APIResponse[StudentResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_student(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    student_in: StudentCreate,
) -> Any:
    try:
        student = await crud_student.create_with_parent_and_user(
            db=db, obj_in=student_in, school_id=school_id
        )
        return APIResponse(
            success=True,
            data=student,
            message="Student created successfully and credentials sent to parent.",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Creating student failed")
        raise HTTPException(status_code=400, detail="Could not create the student.")


@router.get("/me", response_model=APIResponse[StudentProfileResponse])
async def get_my_student_profile(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    # Find student by user_id
    student_res = await db.execute(
        select(Student).filter(Student.user_id == UUID(token_data.user_id))
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this user")

    return await _get_full_student_profile(db, student)


@router.get("/{id}", response_model=APIResponse[StudentProfileResponse])
async def get_student_profile(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    student = await crud_student.get(db, id=id, school_id=school_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return await _get_full_student_profile(db, student)


async def _get_full_student_profile(db: AsyncSession, student: Student) -> StudentProfileResponse:
    # Fetch Parent
    parent_result = await db.execute(select(Parent).filter(Parent.id == student.parent_id))
    parent = parent_result.scalars().first()

    # Fetch Medical
    medical_result = await db.execute(
        select(StudentMedical).filter(StudentMedical.student_id == student.id)
    )
    medical = medical_result.scalars().first()

    # Fetch Class & Section names
    class_name, section_name = None, None
    if student.current_class_id:
        cls_res = await db.execute(
            select(ClassModel).filter(ClassModel.id == student.current_class_id)
        )
        cls = cls_res.scalars().first()
        if cls:
            class_name = cls.name
    if student.current_section_id:
        sec_res = await db.execute(select(Section).filter(Section.id == student.current_section_id))
        sec = sec_res.scalars().first()
        if sec:
            section_name = sec.name

    profile_data = StudentProfileResponse.model_validate(student)
    if parent:
        profile_data.parent = ParentResponse.model_validate(parent)
    if medical:
        profile_data.medical = StudentMedicalResponse.model_validate(medical)
    profile_data.class_name = class_name
    profile_data.section_name = section_name

    return APIResponse(success=True, data=profile_data)


@router.put(
    "/{id}",
    response_model=APIResponse[StudentResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_student(
    id: UUID,
    student_in: StudentUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Update a student plus the linked parent/guardian and medical record. Only
    fields actually sent are changed (exclude_unset)."""
    student = await crud_student.get(db, id=id, school_id=school_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    data = student_in.model_dump(exclude_unset=True)
    parent_data = data.pop("parent", None)
    medical_data = data.pop("medical", None)

    for k, v in data.items():
        setattr(student, k, v)
    db.add(student)

    if parent_data:
        parent = (
            (await db.execute(select(Parent).filter(Parent.id == student.parent_id)))
            .scalars()
            .first()
        )
        if parent:
            for k, v in parent_data.items():
                setattr(parent, k, v)
            db.add(parent)

    if medical_data:
        med = (
            (
                await db.execute(
                    select(StudentMedical).filter(StudentMedical.student_id == student.id)
                )
            )
            .scalars()
            .first()
        )
        if med:
            for k, v in medical_data.items():
                setattr(med, k, v)
        else:
            med = StudentMedical(school_id=UUID(school_id), student_id=student.id, **medical_data)
        db.add(med)

    await db.commit()
    await db.refresh(student)
    return APIResponse(success=True, data=student, message="Student updated successfully")


@router.post(
    "/promote",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def promote_students(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    req: BulkPromoteRequest,
) -> Any:
    # Update bulk
    for s_id in req.student_ids:
        st = await crud_student.get(db, id=s_id, school_id=school_id)
        if st:
            st.current_class_id = req.next_class_id
            st.current_section_id = req.next_section_id
            st.academic_year_id = req.academic_year_id
            db.add(st)
    await db.commit()
    return APIResponse(
        success=True, message=f"Promoted {len(req.student_ids)} students successfully"
    )


@router.post(
    "/bulk-import",
    response_model=APIResponse[BulkImportResult],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def bulk_import_students(
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

    # Needs to know active year
    year_query = select(AcademicYear).filter(
        AcademicYear.school_id == UUID(school_id), AcademicYear.is_active == True
    )
    year_res = await db.execute(year_query)
    active_year = year_res.scalars().first()

    if not active_year:
        raise HTTPException(status_code=400, detail="No active academic year found")

    for index, row in df.iterrows():
        try:
            parent_in = {
                "father_name": _cell(row, "father_name"),
                "father_phone": _cell(row, "father_phone"),
                "father_email": _cell(row, "father_email"),
                "father_occupation": _cell(row, "father_occupation"),
                "mother_name": _cell(row, "mother_name"),
                "mother_phone": _cell(row, "mother_phone"),
                "mother_email": _cell(row, "mother_email"),
                "guardian_name": _cell(row, "guardian_name"),
                "guardian_phone": _cell(row, "guardian_phone"),
                "guardian_relation": _cell(row, "guardian_relation"),
                "address": _cell(row, "address"),
                "primary_contact_email": (
                    _cell(row, "parent_email")
                    or _cell(row, "father_email")
                    or _cell(row, "mother_email")
                ),
            }

            class_name = row.get("class_name")
            section_name = row.get("section_name")

            class_id = None
            if class_name and pd.notna(class_name):
                cls_res = await db.execute(
                    select(ClassModel).filter(
                        ClassModel.school_id == UUID(school_id), ClassModel.name == str(class_name)
                    )
                )
                cls_obj = cls_res.scalars().first()
                if not cls_obj:
                    cls_obj = ClassModel(school_id=UUID(school_id), name=str(class_name))
                    db.add(cls_obj)
                    await db.commit()
                    await db.refresh(cls_obj)
                class_id = cls_obj.id

            section_id = None
            if class_id and section_name and pd.notna(section_name):
                sec_res = await db.execute(
                    select(Section).filter(
                        Section.school_id == UUID(school_id),
                        Section.class_id == class_id,
                        Section.name == str(section_name),
                    )
                )
                sec_obj = sec_res.scalars().first()
                if not sec_obj:
                    sec_obj = Section(
                        school_id=UUID(school_id), class_id=class_id, name=str(section_name)
                    )
                    db.add(sec_obj)
                    await db.commit()
                    await db.refresh(sec_obj)
                section_id = sec_obj.id

            doj = _cell(row, "date_of_joining")
            student_in = StudentCreate(
                first_name=row["first_name"],
                last_name=row["last_name"],
                dob=datetime.strptime(str(row["dob"]), "%Y-%m-%d").date(),
                date_of_joining=(datetime.strptime(doj, "%Y-%m-%d").date() if doj else None),
                gender=_cell(row, "gender"),
                blood_group=_cell(row, "blood_group"),
                nationality=_cell(row, "nationality") or "Indian",
                religion=_cell(row, "religion"),
                category=_cell(row, "category"),
                mother_tongue=_cell(row, "mother_tongue"),
                apaar_id=_cell(row, "apaar_id"),
                aadhaar_no=_cell(row, "aadhaar_no"),
                pen_number=_cell(row, "pen_number"),
                academic_year_id=active_year.id,
                current_class_id=class_id,
                current_section_id=section_id,
                parent=parent_in,
            )
            await crud_student.create_with_parent_and_user(
                db=db, obj_in=student_in, school_id=school_id
            )
            success_count += 1
        except Exception:
            await db.rollback()
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


@router.get("/{id}/certificates/{type}")
async def generate_student_certificate(
    id: UUID,
    type: str,  # "tc", "bonafide", "character"
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    # 1. Fetch data
    student = await crud_student.get(db, id=id, school_id=school_id)
    if not student:
        raise HTTPException(status_code=404)

    parent = (
        (await db.execute(select(Parent).filter(Parent.id == student.parent_id))).scalars().first()
    )
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    cls = (
        (await db.execute(select(ClassModel).filter(ClassModel.id == student.current_class_id)))
        .scalars()
        .first()
    )

    from app.models.setup import AcademicYear

    ay = (
        (await db.execute(select(AcademicYear).filter(AcademicYear.id == student.academic_year_id)))
        .scalars()
        .first()
    )

    context = {
        "student": student,
        "parent": parent,
        "school": school,
        "class_name": cls.name if cls else "N/A",
        "academic_year": ay.name if ay else "N/A",
        "issue_date": datetime.now().strftime("%d %B, %Y"),
    }

    # Map the requested certificate type to its template.
    template_map = {"bonafide": "bonafide.html", "tc": "tc.html", "transfer": "tc.html"}
    template = template_map.get((type or "").lower(), "tc.html")
    pdf_bytes = generate_pdf(template, context)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={type}_{student.admission_number}.pdf"
        },
    )


# --- Student documents (digital locker) --------------------------------------
@router.get("/{id}/documents", response_model=APIResponse[List[dict]])
async def list_student_documents(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    student = await crud_student.get(db, id=id, school_id=school_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = (
        (
            await db.execute(
                select(StudentDocument)
                .filter(
                    StudentDocument.student_id == id,
                    StudentDocument.school_id == UUID(school_id),
                )
                .order_by(StudentDocument.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(
        success=True,
        data=[
            {
                "id": str(d.id),
                "document_type": d.document_type,
                "document_url": d.document_url,
                "created_at": str(d.created_at),
            }
            for d in rows
        ],
    )


@router.post(
    "/{id}/documents",
    response_model=APIResponse[dict],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def add_student_document(
    id: UUID,
    document_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
    document_url: Optional[str] = Form(None),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """Attach a document to a student — either by uploading a file (stored on
    Cloudinary) or by referencing an already-hosted URL."""
    student = await crud_student.get(db, id=id, school_id=school_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    url = (document_url or "").strip() or None
    if file is not None:
        content = await file.read()
        url = upload_file(content, folder=f"students/{id}/documents")
    if not url:
        raise HTTPException(status_code=400, detail="Provide a file or a document URL.")

    doc = StudentDocument(
        school_id=UUID(school_id),
        student_id=id,
        document_type=document_type,
        document_url=url,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return APIResponse(
        success=True,
        data={
            "id": str(doc.id),
            "document_type": doc.document_type,
            "document_url": doc.document_url,
        },
        message="Document added",
    )


@router.delete(
    "/{id}/documents/{doc_id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def delete_student_document(
    id: UUID,
    doc_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    doc = (
        (
            await db.execute(
                select(StudentDocument).filter(
                    StudentDocument.id == doc_id,
                    StudentDocument.student_id == id,
                    StudentDocument.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
    return APIResponse(success=True, message="Document deleted")

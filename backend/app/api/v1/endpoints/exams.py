import io
from typing import List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.crud.crud_exams import (
    crud_exam,
    crud_exam_schedule,
    crud_exam_type,
    crud_grade_scale,
    crud_result,
    crud_student_mark,
)
from app.models.exams import Exam, ExamSchedule, Result, StudentMark
from app.models.setup import ClassModel, Subject
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.exams import (
    ExamCreate,
    ExamResponse,
    ExamScheduleCreate,
    ExamScheduleResponse,
    ExamTypeCreate,
    ExamTypeResponse,
    GradeScaleCreate,
    GradeScaleResponse,
    ResultResponse,
    StudentMarkBulkCreate,
    StudentMarkResponse,
)

router = APIRouter()


# --- SETUP (Grade Scales & Types) ---
@router.post(
    "/grades",
    response_model=APIResponse[GradeScaleResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_grade_scale(
    scale_in: GradeScaleCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    scale = await crud_grade_scale.create(db, obj_in=scale_in, school_id=school_id)
    return APIResponse(success=True, data=scale)


@router.get("/grades", response_model=APIResponse[List[GradeScaleResponse]])
async def get_grade_scales(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    scales = await crud_grade_scale.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=scales)


@router.post(
    "/types",
    response_model=APIResponse[ExamTypeResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_exam_type(
    type_in: ExamTypeCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    ex_type = await crud_exam_type.create(db, obj_in=type_in, school_id=school_id)
    return APIResponse(success=True, data=ex_type)


@router.get("/types", response_model=APIResponse[List[ExamTypeResponse]])
async def get_exam_types(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    types = await crud_exam_type.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=types)


# --- EXAMS & SCHEDULES ---
@router.post(
    "/",
    response_model=APIResponse[ExamResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_exam(
    exam_in: ExamCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    exam = await crud_exam.create(db, obj_in=exam_in, school_id=school_id)
    return APIResponse(success=True, data=exam)


@router.get("/", response_model=APIResponse[List[ExamResponse]])
async def get_exams(
    class_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(Exam).filter(Exam.school_id == UUID(school_id))
    if class_id:
        query = query.filter(Exam.class_id == class_id)
    if academic_year_id:
        query = query.filter(Exam.academic_year_id == academic_year_id)
    exams = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=exams)


@router.post("/schedules", response_model=APIResponse[ExamScheduleResponse])
async def create_exam_schedule(
    schedule_in: ExamScheduleCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    schedule = await crud_exam_schedule.create(db, obj_in=schedule_in, school_id=school_id)
    return APIResponse(success=True, data=schedule)


@router.get("/{exam_id}/schedules", response_model=APIResponse[List[ExamScheduleResponse]])
async def get_exam_schedules(
    exam_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(ExamSchedule).filter(ExamSchedule.exam_id == exam_id)
    schedules = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=schedules)


# --- MARKS ENTRY ---
@router.get("/schedules/{schedule_id}/marks", response_model=APIResponse[List[StudentMarkResponse]])
async def get_student_marks(
    schedule_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(StudentMark).filter(StudentMark.exam_schedule_id == schedule_id)
    marks = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=marks)


@router.post("/marks/bulk", response_model=APIResponse)
async def bulk_enter_marks(
    marks_in: StudentMarkBulkCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    try:
        await crud_student_mark.bulk_upsert(
            db, UUID(school_id), marks_in.exam_schedule_id, marks_in
        )
        return APIResponse(success=True, message="Marks successfully saved.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/schedules/{schedule_id}/marks/import")
async def import_marks_csv(
    schedule_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
        marks_list = []
        for _, row in df.iterrows():
            marks_list.append(
                {
                    "student_id": UUID(row["student_id"]),
                    "marks_obtained": float(row["marks"]) if pd.notna(row["marks"]) else None,
                    "is_absent": str(row.get("is_absent", "false")).lower() == "true",
                    "remarks": row.get("remarks"),
                }
            )

        marks_in = StudentMarkBulkCreate(exam_schedule_id=schedule_id, marks=marks_list)
        await crud_student_mark.bulk_upsert(db, UUID(school_id), schedule_id, marks_in)
        return APIResponse(success=True, message="Marks imported successfully")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV Import failed: {str(e)}")


# --- RESULTS PROCESSING ---
@router.post("/{exam_id}/process", response_model=APIResponse)
async def process_exam_results(
    exam_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    try:
        await crud_result.process_results(db, UUID(school_id), exam_id)
        return APIResponse(success=True, message="Results processed and published successfully.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Processing failed: {str(e)}")


@router.get("/{exam_id}/results", response_model=APIResponse[List[ResultResponse]])
async def get_results(
    exam_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(Result).filter(Result.exam_id == exam_id).order_by(Result.rank)
    results = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=results)


# Register Report Card PDF Template
pdf_module.TEMPLATES[
    "report_card.html"
] = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
        .subject { text-align: left; }
        .summary { display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>REPORT CARD</h2>
        <h3>{{ exam.name }}</h3>
    </div>
    <div class="details">
        <p><strong>Name:</strong> {{ student.first_name }} {{ student.last_name }}</p>
        <p><strong>Admission No:</strong> {{ student.admission_number }}</p>
        <p><strong>Class:</strong> {{ class_name }}</p>
    </div>
    <table>
        <tr>
            <th class="subject">Subject</th>
            <th>Max Marks</th>
            <th>Passing Marks</th>
            <th>Marks Obtained</th>
        </tr>
        {% for m in marks %}
        <tr>
            <td class="subject">{{ m.subject_name }}</td>
            <td>{{ m.max_marks }}</td>
            <td>{{ m.passing_marks }}</td>
            <td>{{ m.obtained if not m.is_absent else 'ABSENT' }}</td>
        </tr>
        {% endfor %}
    </table>
    <div class="summary">
        <div>
            <p><strong>Total Marks:</strong> {{ result.obtained_marks }} / {{ result.total_marks }}</p>
            <p><strong>Percentage:</strong> {{ result.percentage }}%</p>
        </div>
        <div>
            <p><strong>Grade:</strong> {{ result.grade }}</p>
            <p><strong>Result:</strong> {{ result.status }}</p>
            <p><strong>Rank:</strong> {{ result.rank }}</p>
        </div>
    </div>
</body>
</html>
"""


@router.get("/{exam_id}/report-card/{student_id}")
async def generate_report_card(
    exam_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # Fetch all required data
    exam = (await db.execute(select(Exam).filter(Exam.id == exam_id))).scalars().first()
    student = (await db.execute(select(Student).filter(Student.id == student_id))).scalars().first()
    cls = (
        (await db.execute(select(ClassModel).filter(ClassModel.id == exam.class_id)))
        .scalars()
        .first()
    )
    result = (
        (
            await db.execute(
                select(Result).filter(Result.exam_id == exam_id, Result.student_id == student_id)
            )
        )
        .scalars()
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Result not found or not published.")

    # Fetch marks and schedules
    schedules = (
        (await db.execute(select(ExamSchedule).filter(ExamSchedule.exam_id == exam_id)))
        .scalars()
        .all()
    )
    marks = (
        (
            await db.execute(
                select(StudentMark).filter(
                    StudentMark.student_id == student_id,
                    StudentMark.exam_schedule_id.in_([s.id for s in schedules]),
                )
            )
        )
        .scalars()
        .all()
    )
    subjects = (await db.execute(select(Subject))).scalars().all()

    subject_map = {s.id: s.name for s in subjects}

    marks_data = []
    for s in schedules:
        m = next((m for m in marks if m.exam_schedule_id == s.id), None)
        marks_data.append(
            {
                "subject_name": subject_map.get(s.subject_id, "Unknown"),
                "max_marks": s.max_marks,
                "passing_marks": s.passing_marks,
                "obtained": m.marks_obtained if m else "-",
                "is_absent": m.is_absent if m else False,
            }
        )

    context = {
        "exam": exam,
        "student": student,
        "class_name": cls.name if cls else "",
        "result": result,
        "marks": marks_data,
    }

    pdf_bytes = pdf_module.generate_pdf("report_card.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_card_{student.admission_number}_{exam.name}.pdf"
        },
    )


@router.get("/student/me/results", response_model=APIResponse[List[ResultResponse]])
async def get_my_results(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    student_res = await db.execute(
        select(Student).filter(Student.user_id == UUID(token_data.user_id))
    )
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    query = select(Result).filter(Result.student_id == student.id)
    results = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=results)

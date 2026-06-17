import io
import logging
import random
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.crud.crud_academics import (
    crud_homework,
    crud_period,
    crud_syllabus_chapter,
    crud_syllabus_progress,
    crud_timetable_slot,
)
from app.models.academics import (
    Homework,
    HomeworkSubmission,
    SyllabusChapter,
    TimetablePeriod,
    TimetableSlot,
)
from app.models.setup import ClassModel, Section, Subject
from app.models.staff import Staff
from app.models.students import Student
from app.schemas.academics import (
    HomeworkCreate,
    HomeworkResponse,
    SyllabusChapterCreate,
    SyllabusChapterResponse,
    SyllabusProgressCreate,
    SyllabusProgressResponse,
    TimetablePeriodCreate,
    TimetablePeriodResponse,
    TimetableSlotCreate,
    TimetableSlotResponse,
)
from app.schemas.base import APIResponse
from app.schemas.students import BulkImportResult

router = APIRouter()

logger = logging.getLogger(__name__)


# --- TIMETABLE ---
@router.post(
    "/periods",
    response_model=APIResponse[TimetablePeriodResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_period(
    period_in: TimetablePeriodCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    period = await crud_period.create(db, obj_in=period_in, school_id=school_id)
    return APIResponse(success=True, data=period)


@router.get("/periods", response_model=APIResponse[List[TimetablePeriodResponse]])
async def get_periods(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    periods = await crud_period.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=periods)


@router.post(
    "/timetable",
    response_model=APIResponse[TimetableSlotResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_timetable_slot(
    slot_in: TimetableSlotCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # Conflict Detection
    if slot_in.teacher_id:
        conflict = await crud_timetable_slot.check_teacher_conflict(
            db, UUID(school_id), slot_in.teacher_id, slot_in.period_id, slot_in.day_of_week
        )
        if conflict:
            raise HTTPException(
                status_code=400,
                detail="Conflict: Teacher is already assigned to a class in this period on this day.",
            )

    slot = await crud_timetable_slot.create(db, obj_in=slot_in, school_id=school_id)
    return APIResponse(success=True, data=slot)


@router.get("/timetable", response_model=APIResponse[List[TimetableSlotResponse]])
async def get_timetable(
    class_id: Optional[UUID] = None,
    section_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(TimetableSlot).filter(TimetableSlot.school_id == UUID(school_id))
    if class_id:
        query = query.filter(TimetableSlot.class_id == class_id)
    if section_id:
        query = query.filter(TimetableSlot.section_id == section_id)
    if teacher_id:
        query = query.filter(TimetableSlot.teacher_id == teacher_id)

    slots = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=slots)


@router.get("/timetable/detailed")
async def get_timetable_detailed(
    class_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    school_uuid = UUID(school_id)

    # Fetch Periods
    periods_db = (
        (
            await db.execute(
                select(TimetablePeriod)
                .filter(TimetablePeriod.school_id == school_uuid)
                .order_by(TimetablePeriod.start_time)
            )
        )
        .scalars()
        .all()
    )

    # Fetch Slots
    slots_db = (
        (
            await db.execute(
                select(TimetableSlot).filter(
                    TimetableSlot.school_id == school_uuid,
                    TimetableSlot.class_id == class_id,
                    TimetableSlot.section_id == section_id,
                )
            )
        )
        .scalars()
        .all()
    )

    # Fetch Subjects and Teachers
    subjects_db = (
        (await db.execute(select(Subject).filter(Subject.school_id == school_uuid))).scalars().all()
    )
    teachers_db = (
        (await db.execute(select(Staff).filter(Staff.school_id == school_uuid))).scalars().all()
    )

    sub_map = {s.id: s.name for s in subjects_db}
    tch_map = {t.id: f"{t.first_name} {t.last_name}" for t in teachers_db}

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    slots_map = {day: [] for day in days}

    for day in days:
        for p in periods_db:
            # Find slot for this day and period
            slot = next((s for s in slots_db if s.day_of_week == day and s.period_id == p.id), None)

            slots_map[day].append(
                {
                    "period_id": p.id,
                    "period_name": p.name,
                    "start_time": p.start_time.strftime("%I:%M %p"),
                    "end_time": p.end_time.strftime("%I:%M %p"),
                    "is_break": p.is_break,
                    "subject_name": (
                        sub_map.get(slot.subject_id, "-") if slot and slot.subject_id else "-"
                    ),
                    "teacher_name": (
                        tch_map.get(slot.teacher_id, "-") if slot and slot.teacher_id else "-"
                    ),
                }
            )

    return APIResponse(success=True, data={"days": days, "schedule": slots_map})


@router.get("/timetable/teacher/{teacher_id}")
async def get_teacher_timetable(
    teacher_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    """A teacher's full weekly timetable, keyed by day (used by teacher schedule/dashboard)."""
    school_uuid = UUID(school_id)
    periods = (
        (await db.execute(select(TimetablePeriod).filter(TimetablePeriod.school_id == school_uuid)))
        .scalars()
        .all()
    )
    slots = (
        (
            await db.execute(
                select(TimetableSlot).filter(
                    TimetableSlot.school_id == school_uuid, TimetableSlot.teacher_id == teacher_id
                )
            )
        )
        .scalars()
        .all()
    )
    subjects = (
        (await db.execute(select(Subject).filter(Subject.school_id == school_uuid))).scalars().all()
    )
    classes = (
        (await db.execute(select(ClassModel).filter(ClassModel.school_id == school_uuid)))
        .scalars()
        .all()
    )
    sections = (
        (await db.execute(select(Section).filter(Section.school_id == school_uuid))).scalars().all()
    )

    sub_map = {s.id: s.name for s in subjects}
    cls_map = {c.id: c.name for c in classes}
    sec_map = {s.id: s.name for s in sections}
    per_map = {p.id: p for p in periods}

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    tmp = {d: [] for d in days}
    for s in slots:
        if s.day_of_week not in tmp:
            continue
        p = per_map.get(s.period_id)
        tmp[s.day_of_week].append(
            (
                p.start_time if p and p.start_time else None,
                {
                    "period_name": p.name if p else "",
                    "start_time": p.start_time.strftime("%I:%M %p") if p and p.start_time else "",
                    "end_time": p.end_time.strftime("%I:%M %p") if p and p.end_time else "",
                    "is_break": p.is_break if p else False,
                    "subject_name": sub_map.get(s.subject_id, "-"),
                    "class_name": cls_map.get(s.class_id, "-"),
                    "section_name": sec_map.get(s.section_id, "-"),
                    "room_number": getattr(s, "room_number", None),
                },
            )
        )
    out = {d: [e for _, e in sorted(tmp[d], key=lambda x: (x[0] is None, x[0]))] for d in days}
    return APIResponse(success=True, data=out)


@router.delete(
    "/timetable/{slot_id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def delete_timetable_slot(
    slot_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    await db.execute(
        delete(TimetableSlot).filter(
            TimetableSlot.id == slot_id, TimetableSlot.school_id == UUID(school_id)
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Slot deleted successfully")


@router.delete(
    "/periods/{period_id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def delete_period(
    period_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    await db.execute(
        delete(TimetablePeriod).filter(
            TimetablePeriod.id == period_id, TimetablePeriod.school_id == UUID(school_id)
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Period deleted successfully")


@router.get("/timetable/pdf")
async def export_timetable_pdf(
    class_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    school_uuid = UUID(school_id)

    # Fetch Class and Section names
    cls = (
        await db.execute(select(ClassModel).filter(ClassModel.id == class_id))
    ).scalar_one_or_none()
    sec = (await db.execute(select(Section).filter(Section.id == section_id))).scalar_one_or_none()

    # Fetch Periods
    periods_db = (
        (
            await db.execute(
                select(TimetablePeriod)
                .filter(TimetablePeriod.school_id == school_uuid, TimetablePeriod.is_break == False)
                .order_by(TimetablePeriod.start_time)
            )
        )
        .scalars()
        .all()
    )

    # Fetch Slots with Subjects and Teachers (manual join or fetch all and map)
    slots_db = (
        (
            await db.execute(
                select(TimetableSlot).filter(
                    TimetableSlot.school_id == school_uuid,
                    TimetableSlot.class_id == class_id,
                    TimetableSlot.section_id == section_id,
                )
            )
        )
        .scalars()
        .all()
    )

    subjects_db = (
        (await db.execute(select(Subject).filter(Subject.school_id == school_uuid))).scalars().all()
    )
    teachers_db = (
        (await db.execute(select(Staff).filter(Staff.school_id == school_uuid))).scalars().all()
    )

    sub_map = {s.id: s.name for s in subjects_db}
    tch_map = {t.id: f"{t.first_name} {t.last_name}" for t in teachers_db}

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    slots_map = {day: {} for day in days}

    for s in slots_db:
        if s.day_of_week in slots_map:
            slots_map[s.day_of_week][s.period_id] = {
                "subject_name": sub_map.get(s.subject_id, "Unknown"),
                "teacher_name": (
                    tch_map.get(s.teacher_id, "No Teacher") if s.teacher_id else "No Teacher"
                ),
            }

    context = {
        "school": {
            "name": "School ERP SaaS",
            "address": "123 Education Lane",
            "board_affiliation": "CBSE",
        },
        "class_name": cls.name if cls else "Unknown Class",
        "section_name": sec.name if sec else "Unknown Section",
        "periods": periods_db,
        "days": days,
        "slots": slots_map,
    }

    pdf_bytes = pdf_module.generate_pdf("timetable.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=timetable.pdf"},
    )


@router.post(
    "/timetable/ai-generate",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def ai_generate_timetable(
    req: dict,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    class_id = UUID(req["class_id"])
    section_id = UUID(req["section_id"])
    academic_year_id = UUID(req["academic_year_id"])
    school_uuid = UUID(school_id)

    await db.execute(
        delete(TimetableSlot).filter(
            TimetableSlot.school_id == school_uuid,
            TimetableSlot.class_id == class_id,
            TimetableSlot.section_id == section_id,
            TimetableSlot.academic_year_id == academic_year_id,
        )
    )

    from app.models.academics import TimetablePeriod

    periods = (
        (
            await db.execute(
                select(TimetablePeriod).filter(
                    TimetablePeriod.school_id == school_uuid, TimetablePeriod.is_break == False
                )
            )
        )
        .scalars()
        .all()
    )

    teachers = (
        (
            await db.execute(
                select(Staff).filter(Staff.school_id == school_uuid, Staff.is_deleted == False)
            )
        )
        .scalars()
        .all()
    )
    teachers = [t for t in teachers if t.designation and "teacher" in t.designation.lower()]

    subjects = (
        (await db.execute(select(Subject).filter(Subject.school_id == school_uuid))).scalars().all()
    )

    if not periods or not subjects or not teachers:
        raise HTTPException(
            status_code=400, detail="Missing required setup data (periods, subjects, or teachers)."
        )

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    # Track assigned teachers to avoid conflicts globally
    existing_slots = (
        (
            await db.execute(
                select(TimetableSlot).filter(
                    TimetableSlot.school_id == school_uuid,
                    TimetableSlot.academic_year_id == academic_year_id,
                )
            )
        )
        .scalars()
        .all()
    )

    assigned_teacher_slots = {
        (s.teacher_id, s.day_of_week, s.period_id) for s in existing_slots if s.teacher_id
    }

    new_slots = []
    for day in days:
        for period in periods:
            available_teachers = [
                t for t in teachers if (t.id, day, period.id) not in assigned_teacher_slots
            ]

            if not available_teachers:
                # Fallback to random if no one is strictly available, but log it or error out
                chosen_teacher = random.choice(teachers)
            else:
                chosen_teacher = random.choice(available_teachers)

            assigned_teacher_slots.add((chosen_teacher.id, day, period.id))

            new_slots.append(
                TimetableSlot(
                    school_id=school_uuid,
                    academic_year_id=academic_year_id,
                    class_id=class_id,
                    section_id=section_id,
                    period_id=period.id,
                    day_of_week=day,
                    subject_id=random.choice(subjects).id,
                    teacher_id=chosen_teacher.id,
                )
            )

    db.add_all(new_slots)
    await db.commit()

    return APIResponse(success=True, message="AI Timetable Generated Successfully!")


@router.post(
    "/timetable/bulk-import",
    response_model=APIResponse[BulkImportResult],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def bulk_import_timetable(
    academic_year_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    school_uuid = UUID(school_id)
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")

    # Fetch lookup data
    classes = (
        (await db.execute(select(ClassModel).filter(ClassModel.school_id == school_uuid)))
        .scalars()
        .all()
    )
    sections = (
        (await db.execute(select(Section).filter(Section.school_id == school_uuid))).scalars().all()
    )
    periods = (
        (await db.execute(select(TimetablePeriod).filter(TimetablePeriod.school_id == school_uuid)))
        .scalars()
        .all()
    )
    subjects = (
        (await db.execute(select(Subject).filter(Subject.school_id == school_uuid))).scalars().all()
    )
    teachers = (
        (await db.execute(select(Staff).filter(Staff.school_id == school_uuid))).scalars().all()
    )

    class_map = {c.name.lower(): c.id for c in classes}
    section_map = {s.name.lower(): s.id for s in sections}
    period_map = {p.name.lower(): p.id for p in periods}
    subject_map = {s.name.lower(): s.id for s in subjects}
    teacher_map = {t.email.lower(): t.id for t in teachers}

    success_count = 0
    errors = []

    for index, row in df.iterrows():
        try:
            class_name = str(row.get("class_name", "")).strip().lower()
            section_name = str(row.get("section_name", "")).strip().lower()
            day_of_week = str(row.get("day_of_week", "")).strip().capitalize()
            period_name = str(row.get("period_name", "")).strip().lower()
            subject_name = str(row.get("subject_name", "")).strip().lower()
            teacher_email = str(row.get("teacher_email", "")).strip().lower()

            class_id = class_map.get(class_name)
            if not class_id:
                raise ValueError(f"Class '{class_name}' not found")

            section_id = section_map.get(section_name)
            if not section_id:
                raise ValueError(f"Section '{section_name}' not found")

            if day_of_week not in [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ]:
                raise ValueError(f"Invalid day: {day_of_week}")

            period_id = period_map.get(period_name)
            if not period_id:
                raise ValueError(f"Period '{period_name}' not found")

            subject_id = subject_map.get(subject_name)
            if not subject_id:
                raise ValueError(f"Subject '{subject_name}' not found")

            teacher_id = teacher_map.get(teacher_email) if teacher_email else None

            # Conflict Detection
            if teacher_id:
                conflict = await crud_timetable_slot.check_teacher_conflict(
                    db, school_uuid, teacher_id, period_id, day_of_week
                )
                if conflict:
                    raise ValueError("Teacher already assigned to another class in this period")

            # Check if slot already exists and update or create
            existing_slot = (
                (
                    await db.execute(
                        select(TimetableSlot).filter(
                            TimetableSlot.school_id == school_uuid,
                            TimetableSlot.class_id == class_id,
                            TimetableSlot.section_id == section_id,
                            TimetableSlot.period_id == period_id,
                            TimetableSlot.day_of_week == day_of_week,
                        )
                    )
                )
                .scalars()
                .first()
            )

            if existing_slot:
                existing_slot.subject_id = subject_id
                existing_slot.teacher_id = teacher_id
                db.add(existing_slot)
            else:
                new_slot = TimetableSlot(
                    school_id=school_uuid,
                    academic_year_id=academic_year_id,
                    class_id=class_id,
                    section_id=section_id,
                    period_id=period_id,
                    day_of_week=day_of_week,
                    subject_id=subject_id,
                    teacher_id=teacher_id,
                )
                db.add(new_slot)

            await db.commit()
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
        message="Timetable bulk import processed",
    )


# --- SYLLABUS ---
@router.post(
    "/syllabus/chapters",
    response_model=APIResponse[SyllabusChapterResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def add_syllabus_chapter(
    chap_in: SyllabusChapterCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    chap = await crud_syllabus_chapter.create(db, obj_in=chap_in, school_id=school_id)
    return APIResponse(success=True, data=chap)


@router.get("/syllabus", response_model=APIResponse[List[SyllabusChapterResponse]])
async def get_syllabus(
    class_id: UUID,
    subject_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(SyllabusChapter)
        .filter(
            SyllabusChapter.school_id == UUID(school_id),
            SyllabusChapter.class_id == class_id,
            SyllabusChapter.subject_id == subject_id,
        )
        .order_by(SyllabusChapter.order_index)
    )
    chaps = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=chaps)


@router.post(
    "/syllabus/progress",
    response_model=APIResponse[SyllabusProgressResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def mark_syllabus_progress(
    prog_in: SyllabusProgressCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    # Auto-assign teacher ID from logged-in token if role is teacher.
    # We assume token_data.user_id maps to staff.user_id
    prog = await crud_syllabus_progress.create(db, obj_in=prog_in, school_id=school_id)
    return APIResponse(success=True, data=prog)


# --- HOMEWORK ---
@router.post(
    "/homework",
    response_model=APIResponse[HomeworkResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def create_homework(
    hw_in: HomeworkCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    hw = await crud_homework.create(db, obj_in=hw_in, school_id=school_id)
    return APIResponse(success=True, data=hw)


@router.get("/homework", response_model=APIResponse[List[HomeworkResponse]])
async def get_homework(
    class_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(Homework)
        .filter(
            Homework.school_id == UUID(school_id),
            Homework.class_id == class_id,
            Homework.section_id == section_id,
        )
        .order_by(Homework.due_date.desc())
    )
    hw = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=hw)


@router.get("/homework/me", response_model=APIResponse)
async def get_my_homework(
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

    # Fetch homework for student's class and section
    hw_query = (
        select(Homework)
        .filter(
            Homework.school_id == UUID(school_id),
            Homework.class_id == student.current_class_id,
            Homework.section_id == student.current_section_id,
        )
        .order_by(Homework.due_date.desc())
    )
    homeworks = (await db.execute(hw_query)).scalars().all()

    # Fetch subjects map
    subs = (
        (await db.execute(select(Subject).filter(Subject.school_id == UUID(school_id))))
        .scalars()
        .all()
    )
    sub_map = {s.id: s.name for s in subs}

    # Fetch submissions for this student
    sub_query = select(HomeworkSubmission).filter(
        HomeworkSubmission.school_id == UUID(school_id), HomeworkSubmission.student_id == student.id
    )
    submissions = (await db.execute(sub_query)).scalars().all()
    sub_dict = {s.homework_id: s for s in submissions}

    data = []
    for hw in homeworks:
        submission = sub_dict.get(hw.id)
        data.append(
            {
                "id": hw.id,
                "title": hw.title,
                "subject": sub_map.get(hw.subject_id, "Unknown"),
                "due": hw.due_date.strftime("%A, %B %d, %Y"),
                "due_date": hw.due_date,
                "description": hw.description,
                "status": submission.status if submission else "Pending",
                "grade": submission.grade if submission else None,
                "feedback": submission.feedback if submission else None,
                "urgent": not submission
                and hw.due_date <= (datetime.now().date() + timedelta(days=2)),
            }
        )
    return APIResponse(success=True, data=data)


@router.post(
    "/homework/{hw_id}/submit",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["Student", "School Admin", "Super Admin"]))],
)
async def submit_homework(
    hw_id: UUID,
    file_url: str = Form(None),
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

    existing = (
        (
            await db.execute(
                select(HomeworkSubmission).filter(
                    HomeworkSubmission.homework_id == hw_id,
                    HomeworkSubmission.student_id == student.id,
                )
            )
        )
        .scalars()
        .first()
    )

    if existing:
        existing.file_url = file_url
        existing.status = "Submitted"
        existing.submitted_at = datetime.now()
        db.add(existing)
    else:
        new_sub = HomeworkSubmission(
            school_id=UUID(school_id),
            homework_id=hw_id,
            student_id=student.id,
            file_url=file_url,
            status="Submitted",
        )
        db.add(new_sub)

    await db.commit()
    return APIResponse(success=True, message="Homework submitted successfully")

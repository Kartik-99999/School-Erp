import calendar
from datetime import date
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.models.attendance import AttendanceStudent
from app.models.school import School
from app.models.setup import ClassModel, Section
from app.models.staff import AttendanceStaff, LeaveApplication
from app.models.students import Parent, Student
from app.schemas.attendance import (
    AttendanceStudentBulkMark,
    AttendanceStudentResponse,
    AttendanceThresholdAlert,
)
from app.schemas.base import APIResponse
from app.schemas.staff import AttendanceBulkMark
from app.utils.twilio import send_whatsapp_if_enabled

router = APIRouter()

# Register PDF template
pdf_module.TEMPLATES[
    "attendance_register.html"
] = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
        th { background-color: #f2f2f2; }
        .student-name { text-align: left; white-space: nowrap; }
        .P { color: green; font-weight: bold; }
        .A { color: red; font-weight: bold; }
        .L { color: orange; }
        .H { color: blue; }
        .M { color: purple; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Monthly Attendance Register</h2>
        <p>Class: {{ class_name }} - {{ section_name }} | Month: {{ month }}/{{ year }}</p>
    </div>
    <table>
        <tr>
            <th class="student-name">Student Name</th>
            {% for d in days %}
            <th>{{ d }}</th>
            {% endfor %}
            <th>Total Present</th>
            <th>%</th>
        </tr>
        {% for student in students %}
        <tr>
            <td class="student-name">{{ student.name }} ({{ student.adm_no }})</td>
            {% set present_count = 0 %}
            {% set total_count = 0 %}
            {% for d in days %}
                {% set status = student.attendance.get(d, '-') %}
                <td class="{{ status[0] if status != '-' else '' }}">{{ status[0] if status != '-' else '-' }}</td>
                {% if status == 'Present' %}{% set present_count = present_count + 1 %}{% endif %}
                {% if status != '-' %}{% set total_count = total_count + 1 %}{% endif %}
            {% endfor %}
            <td>{{ present_count }}</td>
            <td>{{ ((present_count / total_count) * 100)|round(1) if total_count > 0 else 0 }}%</td>
        </tr>
        {% endfor %}
    </table>
</body>
</html>
"""


@router.post(
    "/students/bulk",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def mark_student_attendance(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    req: AttendanceStudentBulkMark,
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    # Role-based date validation
    today = date.today()
    if token_data.role == "Teacher" and req.date != today:
        raise HTTPException(
            status_code=403, detail="Teachers can only mark or edit attendance for the current day."
        )

    user_uuid = UUID(token_data.user_id)
    school_uuid = UUID(school_id)

    # 1. Fetch existing records for this date/class/section to handle updates vs inserts
    existing_query = (
        select(AttendanceStudent)
        .join(Student)
        .filter(
            AttendanceStudent.school_id == school_uuid,
            AttendanceStudent.date == req.date,
            Student.current_class_id == req.class_id,
            Student.current_section_id == req.section_id,
        )
    )
    existing_result = await db.execute(existing_query)
    existing_records = {str(r.student_id): r for r in existing_result.scalars().all()}

    # Load the school once (for the WhatsApp opt-in gate) rather than per absentee.
    school = (await db.execute(select(School).filter(School.id == school_uuid))).scalars().first()

    # Prepare batch
    for rec in req.attendance_records:
        student_id_str = str(rec.student_id)
        if student_id_str in existing_records:
            # Update
            db_record = existing_records[student_id_str]
            old_status = db_record.status
            db_record.status = rec.status
            db_record.remarks = rec.remarks
            db_record.marked_by = user_uuid
            db.add(db_record)

            # Send WhatsApp alert if transitioning to Absent
            if old_status != "Absent" and rec.status == "Absent":
                await notify_parent_absent(db, school, rec.student_id, req.date)
        else:
            # Insert
            new_record = AttendanceStudent(
                school_id=school_uuid,
                student_id=rec.student_id,
                date=req.date,
                status=rec.status,
                remarks=rec.remarks,
                marked_by=user_uuid,
            )
            db.add(new_record)

            if rec.status == "Absent":
                await notify_parent_absent(db, school, rec.student_id, req.date)

    await db.commit()
    return APIResponse(
        success=True,
        message=f"Attendance marked successfully for {len(req.attendance_records)} students.",
    )


async def notify_parent_absent(db: AsyncSession, school: School, student_id: UUID, att_date: date):
    # Fetch Student & Parent
    student = (await db.execute(select(Student).filter(Student.id == student_id))).scalars().first()
    if not student:
        return
    parent = (
        (await db.execute(select(Parent).filter(Parent.id == student.parent_id))).scalars().first()
    )
    if not parent:
        return

    phone = parent.father_phone or parent.mother_phone or parent.guardian_phone
    if phone:
        msg = f"Alert: Your ward {student.first_name} {student.last_name} has been marked ABSENT today ({att_date.strftime('%d-%b-%Y')}). Please contact the school if this is an error."
        send_whatsapp_if_enabled(school, phone, msg)


@router.get("/students/daily", response_model=APIResponse[List[AttendanceStudentResponse]])
async def get_daily_student_attendance(
    class_id: UUID,
    section_id: UUID,
    target_date: date,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = (
        select(AttendanceStudent)
        .join(Student)
        .filter(
            AttendanceStudent.school_id == UUID(school_id),
            AttendanceStudent.date == target_date,
            Student.current_class_id == class_id,
            Student.current_section_id == section_id,
        )
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return APIResponse(success=True, data=records)


@router.get("/students/threshold", response_model=APIResponse[List[AttendanceThresholdAlert]])
async def get_attendance_threshold(
    class_id: Optional[UUID] = None,
    threshold: float = 75.0,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    """
    Returns students whose attendance percentage is below the given threshold.
    """
    # Get all students and their attendance
    student_query = select(Student).filter(
        Student.school_id == UUID(school_id), Student.status == "Active"
    )
    if class_id:
        student_query = student_query.filter(Student.current_class_id == class_id)
    students = (await db.execute(student_query)).scalars().all()

    alerts = []
    for st in students:
        att_query = select(AttendanceStudent.status).filter(AttendanceStudent.student_id == st.id)
        att_results = (await db.execute(att_query)).scalars().all()

        total = len(att_results)
        if total == 0:
            continue

        present = len([s for s in att_results if s in ["Present", "Late", "Half Day"]])
        pct = (present / total) * 100

        if pct < threshold:
            alerts.append(
                AttendanceThresholdAlert(
                    student_id=st.id,
                    student_name=f"{st.first_name} {st.last_name}",
                    admission_number=st.admission_number or "N/A",
                    total_days=total,
                    present_days=present,
                    percentage=round(pct, 2),
                )
            )

    return APIResponse(success=True, data=alerts)


@router.get("/students/register/pdf")
async def generate_monthly_register(
    class_id: UUID,
    section_id: UUID,
    month: int,
    year: int,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    # Fetch Class & Section Names
    cls = (await db.execute(select(ClassModel).filter(ClassModel.id == class_id))).scalars().first()
    sec = (await db.execute(select(Section).filter(Section.id == section_id))).scalars().first()
    if not cls or not sec:
        raise HTTPException(status_code=404, detail="Class or Section not found")

    # Fetch Students
    students = (
        (
            await db.execute(
                select(Student)
                .filter(
                    Student.school_id == UUID(school_id),
                    Student.current_class_id == class_id,
                    Student.current_section_id == section_id,
                    Student.status == "Active",
                )
                .order_by(Student.first_name)
            )
        )
        .scalars()
        .all()
    )

    # Get days in month
    num_days = calendar.monthrange(year, month)[1]
    days = list(range(1, num_days + 1))

    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)

    # Build context array
    student_data = []
    for st in students:
        att_records = (
            (
                await db.execute(
                    select(AttendanceStudent).filter(
                        AttendanceStudent.student_id == st.id,
                        AttendanceStudent.date >= start_date,
                        AttendanceStudent.date <= end_date,
                    )
                )
            )
            .scalars()
            .all()
        )

        att_map = {r.date.day: r.status for r in att_records}

        student_data.append(
            {
                "name": f"{st.first_name} {st.last_name}",
                "adm_no": st.admission_number,
                "attendance": att_map,
            }
        )

    context = {
        "class_name": cls.name,
        "section_name": sec.name,
        "month": str(month).zfill(2),
        "year": year,
        "days": days,
        "students": student_data,
    }

    pdf_bytes = pdf_module.generate_pdf("attendance_register.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=attendance_register_{cls.name}_{sec.name}_{month}_{year}.pdf"
        },
    )


# --- STAFF ATTENDANCE EXTENSIONS ---
# (Note: basic bulk mark is currently in staff.py, moving complex logic here for unification)


@router.post(
    "/staff/bulk",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def mark_staff_attendance(
    *,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    req: AttendanceBulkMark,
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    # Role-based date validation
    today = date.today()
    if token_data.role not in ["Super Admin", "School Admin"] and req.date != today:
        raise HTTPException(status_code=403, detail="Only Admins can edit past staff attendance.")

    user_uuid = UUID(token_data.user_id)
    school_uuid = UUID(school_id)

    # Pre-fetch approved leaves for this date to auto-override
    leaves_query = select(LeaveApplication).filter(
        LeaveApplication.school_id == school_uuid,
        LeaveApplication.status == "Approved",
        LeaveApplication.start_date <= req.date,
        LeaveApplication.end_date >= req.date,
    )
    approved_leaves = {
        str(leave.staff_id): leave for leave in (await db.execute(leaves_query)).scalars().all()
    }

    # Fetch existing
    existing_query = select(AttendanceStaff).filter(
        AttendanceStaff.school_id == school_uuid,
        AttendanceStaff.date == req.date,
    )
    existing_records = {
        str(r.staff_id): r for r in (await db.execute(existing_query)).scalars().all()
    }

    for rec in req.attendance_records:
        staff_id_str = str(rec.staff_id)

        # Override with "Leave" if on approved leave
        final_status = rec.status
        if staff_id_str in approved_leaves:
            final_status = "Leave"

        if staff_id_str in existing_records:
            # Update
            db_record = existing_records[staff_id_str]
            db_record.status = final_status
            db_record.remarks = rec.remarks
            db_record.marked_by = user_uuid
            db.add(db_record)
        else:
            # Insert
            new_record = AttendanceStaff(
                school_id=school_uuid,
                staff_id=rec.staff_id,
                date=req.date,
                status=final_status,
                remarks=rec.remarks,
                marked_by=user_uuid,
            )
            db.add(new_record)

    await db.commit()
    return APIResponse(
        success=True,
        message=f"Staff attendance marked successfully for {len(req.attendance_records)} members.",
    )

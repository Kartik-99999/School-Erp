import csv
import io
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.fees import FeeReceipt, FeeSchedule
from app.models.library import LibraryIssue
from app.models.staff import Staff
from app.models.students import Student
from app.schemas.base import APIResponse

router = APIRouter(
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))]
)

# --- ANALYTICS DASHBOARD QUERIES ---


@router.get("/dashboard-stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    school_uuid = UUID(school_id)
    current_month = date.today().replace(day=1)

    # 1. Total Active Students
    students_count = await db.execute(
        select(func.count(Student.id)).filter(
            Student.school_id == school_uuid, Student.status == "Active"
        )
    )

    # 2. Total Staff
    staff_count = await db.execute(
        select(func.count(Staff.id)).filter(
            Staff.school_id == school_uuid, Staff.is_deleted == False
        )
    )

    # 4. Fee Collection (This month)
    fee_sum = await db.execute(
        select(func.sum(FeeReceipt.total_amount)).filter(
            FeeReceipt.school_id == school_uuid,
            FeeReceipt.payment_date >= current_month,
            FeeReceipt.status == "Success",
        )
    )

    return APIResponse(
        success=True,
        data={
            "total_students": students_count.scalar_one(),
            "total_staff": staff_count.scalar_one(),
            "monthly_collection": float(fee_sum.scalar_one() or 0),
        },
    )


# --- EXPORTABLE REPORTS ---


def generate_csv_response(headers: list, rows: list, filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


@router.get("/export/student-strength")
async def export_student_strength(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(Student.current_class_id, Student.gender, func.count(Student.id))
        .filter(Student.school_id == UUID(school_id), Student.status == "Active")
        .group_by(Student.current_class_id, Student.gender)
    )

    results = await db.execute(query)

    headers = ["Class ID", "Gender", "Total Count"]
    rows = [[str(r[0]), str(r[1]), r[2]] for r in results.all()]

    return generate_csv_response(headers, rows, "student_strength_report")


@router.get("/export/fee-defaulters")
async def export_fee_defaulters(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(
            Student.admission_number,
            Student.first_name,
            Student.last_name,
            func.sum(FeeSchedule.net_due_amount - FeeSchedule.amount_paid).label("pending_balance"),
        )
        .join(FeeSchedule, FeeSchedule.student_id == Student.id)
        .filter(
            FeeSchedule.school_id == UUID(school_id),
            FeeSchedule.status != "Paid",
            FeeSchedule.due_date < date.today(),
        )
        .group_by(Student.id)
    )

    results = await db.execute(query)

    headers = ["Admission No", "First Name", "Last Name", "Overdue Balance (INR)"]
    rows = [[str(r[0]), str(r[1]), str(r[2]), float(r[3])] for r in results.all()]

    return generate_csv_response(headers, rows, "fee_defaulters_report")


@router.get("/export/library-overdue")
async def export_library_overdue(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(
        LibraryIssue.book_id, LibraryIssue.student_id, LibraryIssue.staff_id, LibraryIssue.due_date
    ).filter(
        LibraryIssue.school_id == UUID(school_id),
        LibraryIssue.status == "Issued",
        LibraryIssue.due_date < date.today(),
    )

    results = await db.execute(query)

    headers = ["Book ID", "Student ID", "Staff ID", "Due Date"]
    rows = [[str(r[0]), str(r[1] or ""), str(r[2] or ""), str(r[3])] for r in results.all()]

    return generate_csv_response(headers, rows, "library_overdue_report")

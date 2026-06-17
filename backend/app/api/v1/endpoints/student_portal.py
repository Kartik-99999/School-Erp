from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.attendance import AttendanceStudent
from app.models.fees import FeeReceipt, FeeSchedule
from app.models.hostel import HostelAllocation, HostelBuilding, HostelRoom
from app.models.library import LibraryBook, LibraryIssue
from app.models.setup import FeeHead, FeeStructure
from app.models.student_leaves import StudentLeaveApplication
from app.models.students import Student
from app.models.transport import StudentTransport, TransportRoute, TransportStop, TransportVehicle
from app.schemas.base import APIResponse
from app.schemas.student_portal import StudentLeaveCreate, StudentLeaveResponse

# Every route here is the authenticated student's own data.
router = APIRouter(dependencies=[Depends(deps.require_roles(["Student"]))])


async def _get_me(db: AsyncSession, token_data: deps.TokenData, school_id: str) -> Student:
    res = await db.execute(select(Student).filter(Student.user_id == UUID(token_data.user_id)))
    student = res.scalars().first()
    if not student or str(student.school_id) != school_id:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


def _t(value) -> str:
    return value.strftime("%I:%M %p") if value else None


@router.get("/fees")
async def my_fees(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)
    school_uuid = UUID(school_id)

    # Map fee_structure -> head name for human-friendly labels.
    heads = (
        (await db.execute(select(FeeHead).filter(FeeHead.school_id == school_uuid))).scalars().all()
    )
    head_map = {h.id: h.name for h in heads}
    structures = (
        (await db.execute(select(FeeStructure).filter(FeeStructure.school_id == school_uuid)))
        .scalars()
        .all()
    )
    struct_head = {s.id: head_map.get(s.fee_head_id, "Fee") for s in structures}

    schedules = (
        (
            await db.execute(
                select(FeeSchedule)
                .filter(FeeSchedule.student_id == student.id)
                .order_by(FeeSchedule.due_date)
            )
        )
        .scalars()
        .all()
    )

    dues = []
    total_due = 0.0
    total_paid = 0.0
    for s in schedules:
        net = float(s.net_due_amount or 0)
        paid = float(s.amount_paid or 0)
        total_due += net
        total_paid += paid
        dues.append(
            {
                "id": str(s.id),
                "head": s.label or struct_head.get(s.fee_structure_id, "Fee"),
                "due_date": s.due_date.isoformat() if s.due_date else None,
                "net_due_amount": net,
                "amount_paid": paid,
                "balance": round(net - paid, 2),
                "status": s.status,
            }
        )

    receipts_db = (
        (
            await db.execute(
                select(FeeReceipt)
                .filter(FeeReceipt.student_id == student.id)
                .order_by(FeeReceipt.payment_date.desc())
            )
        )
        .scalars()
        .all()
    )
    receipts = [
        {
            "id": str(r.id),
            "receipt_number": r.receipt_number,
            "payment_date": r.payment_date.isoformat() if r.payment_date else None,
            "payment_mode": r.payment_mode,
            "total_amount": float(r.total_amount or 0),
        }
        for r in receipts_db
    ]

    return APIResponse(
        success=True,
        data={
            "student_id": str(student.id),
            "dues": dues,
            "receipts": receipts,
            "summary": {
                "total_due": round(total_due, 2),
                "total_paid": round(total_paid, 2),
                "balance": round(total_due - total_paid, 2),
            },
        },
    )


@router.get("/attendance")
async def my_attendance(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)

    records = (
        (
            await db.execute(
                select(AttendanceStudent)
                .filter(AttendanceStudent.student_id == student.id)
                .order_by(AttendanceStudent.date.desc())
            )
        )
        .scalars()
        .all()
    )

    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status == "Absent")
    late = sum(1 for r in records if r.status == "Late")
    half = sum(1 for r in records if r.status == "Half Day")
    total = len(records)
    # Half day counts as half present for the percentage.
    percentage = round((present + 0.5 * half) / total * 100, 1) if total else 0.0

    recent = [
        {
            "date": r.date.isoformat() if r.date else None,
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in records[:90]
    ]

    return APIResponse(
        success=True,
        data={
            "summary": {
                "present": present,
                "absent": absent,
                "late": late,
                "half_day": half,
                "total": total,
                "percentage": percentage,
            },
            "records": recent,
        },
    )


@router.get("/library")
async def my_library(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)

    rows = (
        await db.execute(
            select(LibraryIssue, LibraryBook)
            .join(LibraryBook, LibraryBook.id == LibraryIssue.book_id)
            .filter(LibraryIssue.student_id == student.id)
            .order_by(LibraryIssue.issue_date.desc())
        )
    ).all()

    issues = []
    active = 0
    total_fine = 0.0
    for issue, book in rows:
        status = issue.status
        if issue.status == "Issued" and issue.due_date and issue.due_date < date.today():
            status = "Overdue"
        if status in ("Issued", "Overdue"):
            active += 1
        total_fine += float(issue.fine_amount or 0)
        issues.append(
            {
                "id": str(issue.id),
                "book_title": book.title,
                "author": book.author,
                "issue_date": issue.issue_date.isoformat() if issue.issue_date else None,
                "due_date": issue.due_date.isoformat() if issue.due_date else None,
                "return_date": issue.return_date.isoformat() if issue.return_date else None,
                "status": status,
                "fine_amount": float(issue.fine_amount or 0),
            }
        )

    return APIResponse(
        success=True,
        data={
            "issues": issues,
            "summary": {"active": active, "total": len(issues), "total_fine": round(total_fine, 2)},
        },
    )


@router.get("/facilities")
async def my_facilities(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)

    # Hostel
    hostel = None
    alloc = (
        (
            await db.execute(
                select(HostelAllocation).filter(
                    HostelAllocation.student_id == student.id,
                    HostelAllocation.status == "Active",
                )
            )
        )
        .scalars()
        .first()
    )
    if alloc:
        room = (
            (await db.execute(select(HostelRoom).filter(HostelRoom.id == alloc.room_id)))
            .scalars()
            .first()
        )
        building = None
        if room:
            building = (
                (
                    await db.execute(
                        select(HostelBuilding).filter(HostelBuilding.id == room.building_id)
                    )
                )
                .scalars()
                .first()
            )
        hostel = {
            "building": building.name if building else None,
            "warden": building.warden_name if building else None,
            "warden_contact": building.warden_contact if building else None,
            "room_number": room.room_number if room else None,
            "room_type": room.room_type if room else None,
            "monthly_fee": float(room.monthly_fee or 0) if room else None,
        }

    # Transport
    transport = None
    st = (
        (
            await db.execute(
                select(StudentTransport).filter(StudentTransport.student_id == student.id)
            )
        )
        .scalars()
        .first()
    )
    if st:
        route = (
            (await db.execute(select(TransportRoute).filter(TransportRoute.id == st.route_id)))
            .scalars()
            .first()
        )
        stop = (
            (await db.execute(select(TransportStop).filter(TransportStop.id == st.stop_id)))
            .scalars()
            .first()
        )
        vehicle = None
        if route and route.vehicle_id:
            vehicle = (
                (
                    await db.execute(
                        select(TransportVehicle).filter(TransportVehicle.id == route.vehicle_id)
                    )
                )
                .scalars()
                .first()
            )
        transport = {
            "route_name": route.name if route else None,
            "starting_point": route.starting_point if route else None,
            "stop_name": stop.stop_name if stop else None,
            "pickup_time": _t(stop.pickup_time) if stop else None,
            "drop_time": _t(stop.drop_time) if stop else None,
            "vehicle_number": vehicle.vehicle_number if vehicle else None,
            "driver_name": vehicle.driver_name if vehicle else None,
            "driver_contact": vehicle.driver_contact if vehicle else None,
            "monthly_fee": float(stop.monthly_fee or 0) if stop else None,
        }

    return APIResponse(success=True, data={"hostel": hostel, "transport": transport})


@router.get("/leaves", response_model=APIResponse[list[StudentLeaveResponse]])
async def my_leaves(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)
    leaves = (
        (
            await db.execute(
                select(StudentLeaveApplication)
                .filter(StudentLeaveApplication.student_id == student.id)
                .order_by(StudentLeaveApplication.applied_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=leaves)


@router.post("/leaves", response_model=APIResponse[StudentLeaveResponse])
async def apply_leave(
    leave_in: StudentLeaveCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = await _get_me(db, token_data, school_id)
    if leave_in.to_date < leave_in.from_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")

    leave = StudentLeaveApplication(
        school_id=UUID(school_id),
        student_id=student.id,
        leave_type=leave_in.leave_type,
        from_date=leave_in.from_date,
        to_date=leave_in.to_date,
        reason=leave_in.reason,
        status="Pending",
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return APIResponse(success=True, data=leave, message="Leave application submitted.")

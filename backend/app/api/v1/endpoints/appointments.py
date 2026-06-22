from datetime import datetime, timezone
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.appointments import Appointment, AppointmentSlot
from app.models.staff import Staff
from app.schemas.appointments import (
    AppointmentCreate,
    AppointmentResponse,
    SlotCreate,
    SlotResponse,
)
from app.schemas.base import APIResponse

router = APIRouter()


async def _my_staff(db: AsyncSession, token_data: deps.TokenData, school_id: str):
    return (
        (
            await db.execute(
                select(Staff).filter(
                    Staff.user_id == UUID(token_data.user_id), Staff.school_id == UUID(school_id)
                )
            )
        )
        .scalars()
        .first()
    )


def _name(st) -> str:
    return f"{st.first_name} {st.last_name}".strip() if st else "Teacher"


@router.post(
    "/slots",
    response_model=APIResponse[SlotResponse],
    dependencies=[Depends(deps.require_roles(["Teacher"]))],
)
async def create_slot(
    body: SlotCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    if body.end_time <= body.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time.")
    st = await _my_staff(db, token_data, school_id)
    if not st:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")
    slot = AppointmentSlot(
        school_id=UUID(school_id),
        teacher_id=st.id,
        start_time=body.start_time,
        end_time=body.end_time,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return APIResponse(
        success=True,
        data=SlotResponse(
            id=slot.id,
            teacher_id=st.id,
            teacher_name=_name(st),
            start_time=slot.start_time,
            end_time=slot.end_time,
        ),
    )


@router.get("/slots", response_model=APIResponse[List[SlotResponse]])
async def open_slots(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """Open (unbooked) future slots across the school's teachers, with teacher names."""
    now = datetime.now(timezone.utc)
    slots = (
        (
            await db.execute(
                select(AppointmentSlot)
                .filter(
                    AppointmentSlot.school_id == UUID(school_id),
                    AppointmentSlot.is_booked == False,  # noqa: E712
                    AppointmentSlot.start_time > now,
                )
                .order_by(AppointmentSlot.start_time)
            )
        )
        .scalars()
        .all()
    )
    if not slots:
        return APIResponse(success=True, data=[])
    tids = list({s.teacher_id for s in slots})
    staff = (await db.execute(select(Staff).filter(Staff.id.in_(tids)))).scalars().all()
    nm = {s.id: _name(s) for s in staff}
    data = [
        SlotResponse(
            id=s.id,
            teacher_id=s.teacher_id,
            teacher_name=nm.get(s.teacher_id, "Teacher"),
            start_time=s.start_time,
            end_time=s.end_time,
        )
        for s in slots
    ]
    return APIResponse(success=True, data=data)


@router.post(
    "",
    response_model=APIResponse[AppointmentResponse],
    dependencies=[Depends(deps.require_roles(["Parent", "Student"]))],
)
async def book_appointment(
    body: AppointmentCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    slot = (
        (
            await db.execute(
                select(AppointmentSlot).filter(
                    AppointmentSlot.id == body.slot_id, AppointmentSlot.school_id == UUID(school_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    if slot.is_booked:
        raise HTTPException(
            status_code=409, detail="That slot has just been booked. Please pick another."
        )
    appt = Appointment(
        school_id=UUID(school_id),
        slot_id=slot.id,
        teacher_id=slot.teacher_id,
        booked_by_user_id=UUID(token_data.user_id),
        student_id=body.student_id,
        note=body.note,
        status="Booked",
    )
    slot.is_booked = True
    db.add_all([appt, slot])
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="That slot has just been booked. Please pick another."
        )
    st = (await db.execute(select(Staff).filter(Staff.id == slot.teacher_id))).scalars().first()
    return APIResponse(
        success=True,
        data=AppointmentResponse(
            id=appt.id,
            teacher_name=_name(st),
            start_time=slot.start_time,
            end_time=slot.end_time,
            status=appt.status,
            note=appt.note,
        ),
    )


@router.get("/me", response_model=APIResponse[List[AppointmentResponse]])
async def my_appointments(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """A parent/student sees the appointments they booked; a teacher sees ones on their slots."""
    q = (
        select(Appointment, AppointmentSlot)
        .join(AppointmentSlot, AppointmentSlot.id == Appointment.slot_id)
        .filter(Appointment.school_id == UUID(school_id))
    )
    if token_data.role == "Teacher":
        st = await _my_staff(db, token_data, school_id)
        if not st:
            return APIResponse(success=True, data=[])
        q = q.filter(Appointment.teacher_id == st.id)
    else:
        q = q.filter(Appointment.booked_by_user_id == UUID(token_data.user_id))
    rows = (await db.execute(q.order_by(AppointmentSlot.start_time.desc()))).all()
    tids = list({a.teacher_id for a, _ in rows})
    staff = (
        (await db.execute(select(Staff).filter(Staff.id.in_(tids)))).scalars().all() if tids else []
    )
    nm = {s.id: _name(s) for s in staff}
    data = [
        AppointmentResponse(
            id=a.id,
            teacher_name=nm.get(a.teacher_id, "Teacher"),
            start_time=slot.start_time,
            end_time=slot.end_time,
            status=a.status,
            note=a.note,
        )
        for a, slot in rows
    ]
    return APIResponse(success=True, data=data)

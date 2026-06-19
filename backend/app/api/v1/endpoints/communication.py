from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_communication import crud_event, crud_notice
from app.models.communication import Event, MessageLog, Notice
from app.models.school import School
from app.models.staff import Staff
from app.models.students import Parent, Student
from app.schemas.base import APIResponse
from app.schemas.communication import (
    BroadcastMessageCreate,
    EventCreate,
    EventResponse,
    MessageLogResponse,
    NoticeCreate,
    NoticeResponse,
)
from app.utils.email import send_email
from app.utils.twilio import send_whatsapp_if_enabled

router = APIRouter()


# --- NOTICEBOARD ---
@router.post(
    "/notices",
    response_model=APIResponse[NoticeResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Teacher"]))],
)
async def create_notice(
    notice_in: NoticeCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    notice = await crud_notice.create(db, obj_in=notice_in, school_id=school_id)
    # Could optionally fire push notifications here based on target
    return APIResponse(success=True, data=notice)


@router.get("/notices", response_model=APIResponse[List[NoticeResponse]])
async def get_notices(
    target: Optional[str] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(Notice).filter(Notice.school_id == UUID(school_id))
    if target:
        query = query.filter(Notice.target_audience.in_(["All", target]))
    query = query.order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
    notices = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=notices)


@router.put(
    "/notices/{id}/pin", dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))]
)
async def toggle_pin_notice(
    id: UUID,
    is_pinned: bool,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    notice = await crud_notice.get(db, id=id, school_id=school_id)
    if not notice:
        raise HTTPException(404)
    notice.is_pinned = is_pinned
    db.add(notice)
    await db.commit()
    return APIResponse(success=True, message="Notice pin status updated")


# --- BROADCAST MESSAGING ---
def process_broadcast_fanout(
    recipients: list, channel: str, subject: str, message_content: str, school
):
    success_count = 0
    for r in recipients:
        if channel == "WhatsApp":
            if send_whatsapp_if_enabled(school, r, message_content):
                success_count += 1
        elif channel == "Email":
            if send_email(r, subject or "School Notice", message_content):
                success_count += 1
    return success_count


@router.post(
    "/broadcast",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def broadcast_message(
    msg_in: BroadcastMessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    school_uuid = UUID(school_id)
    recipients = []

    # Gather Recipients
    if msg_in.recipient_type == "Parents":
        parents = (
            (await db.execute(select(Parent).filter(Parent.school_id == school_uuid)))
            .scalars()
            .all()
        )
        for p in parents:
            if msg_in.channel == "WhatsApp" and (p.father_phone or p.mother_phone):
                recipients.append(p.father_phone or p.mother_phone)
            elif msg_in.channel == "Email" and p.primary_contact_email:
                recipients.append(p.primary_contact_email)

    elif msg_in.recipient_type == "Class" and msg_in.target_class_id:
        students = (
            (
                await db.execute(
                    select(Student).filter(Student.current_class_id == msg_in.target_class_id)
                )
            )
            .scalars()
            .all()
        )
        parent_ids = list(set([s.parent_id for s in students]))
        parents = (
            (await db.execute(select(Parent).filter(Parent.id.in_(parent_ids)))).scalars().all()
        )
        for p in parents:
            if msg_in.channel == "WhatsApp" and (p.father_phone or p.mother_phone):
                recipients.append(p.father_phone or p.mother_phone)
            elif msg_in.channel == "Email" and p.primary_contact_email:
                recipients.append(p.primary_contact_email)

    elif msg_in.recipient_type == "Staff":
        if msg_in.channel == "Email":
            from app.models.users import User

            emails = (
                (
                    await db.execute(
                        select(User.email)
                        .join(Staff, Staff.user_id == User.id)
                        .filter(Staff.school_id == school_uuid)
                    )
                )
                .scalars()
                .all()
            )
            recipients.extend([e for e in emails if e])
        else:
            staff_members = (
                (await db.execute(select(Staff).filter(Staff.school_id == school_uuid)))
                .scalars()
                .all()
            )
            recipients.extend([s.phone for s in staff_members if s.phone])

    # Remove duplicates
    recipients = list(set(recipients))
    if not recipients:
        raise HTTPException(400, "No valid recipients found for this target group.")

    # Dispatch via background task to prevent timeout. Load the school once for the WhatsApp
    # opt-in gate (reading a loaded scalar attr is safe even on the detached instance).
    school = (await db.execute(select(School).filter(School.id == school_uuid))).scalars().first()
    background_tasks.add_task(
        process_broadcast_fanout,
        recipients,
        msg_in.channel,
        msg_in.subject,
        msg_in.message_content,
        school,
    )

    # Log Message (Log will show 'Processing' instead of sent, since it's async now)
    log = MessageLog(
        school_id=school_uuid,
        channel=msg_in.channel,
        recipient_type=msg_in.recipient_type,
        recipient_count=len(recipients),
        message_content=msg_in.message_content,
        sent_by=UUID(token_data.user_id),
        status="Processing",
    )
    db.add(log)
    await db.commit()

    return APIResponse(
        success=True, message=f"Broadcast queued successfully for {len(recipients)} recipients."
    )


@router.get(
    "/broadcast/logs",
    response_model=APIResponse[List[MessageLogResponse]],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def get_message_logs(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(MessageLog)
        .filter(MessageLog.school_id == UUID(school_id))
        .order_by(MessageLog.created_at.desc())
    )
    logs = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=logs)


# --- EVENTS ---
@router.post(
    "/events",
    response_model=APIResponse[EventResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_event(
    event_in: EventCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    event = await crud_event.create(db, obj_in=event_in, school_id=school_id)
    return APIResponse(success=True, data=event)


@router.get("/events", response_model=APIResponse[List[EventResponse]])
async def get_events(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(Event).filter(Event.school_id == UUID(school_id))
    # Month/year filter for the UI calendar view
    if month and year:
        query = query.filter(
            extract("month", Event.start_date) == month,
            extract("year", Event.start_date) == year,
        )
    query = query.order_by(Event.start_date)
    events = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=events)

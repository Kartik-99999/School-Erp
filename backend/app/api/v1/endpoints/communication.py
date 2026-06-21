from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import extract, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_communication import crud_event, crud_notice
from app.models.communication import Event, MessageLog, Notice, Poll, PollOption, PollVote
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
    PollOptionResponse,
    PollResponse,
    PollVoteCreate,
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
    category: Optional[str] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(Notice).filter(Notice.school_id == UUID(school_id))
    if target:
        query = query.filter(Notice.target_audience.in_(["All", target]))
    if category:
        query = query.filter(Notice.category == category)
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


# --- POLLS ---
def _audience_for(role: str) -> str:
    """Map a portal role to the audience tag polls/notices use."""
    return {"Student": "Students", "Parent": "Parents", "Teacher": "Staff"}.get(role, "All")


@router.get("/polls", response_model=APIResponse[List[PollResponse]])
async def get_polls(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Active polls visible to the caller (audience 'All' or their role's audience), with
    per-option vote counts and the option the caller chose (if any)."""
    aud = _audience_for(token_data.role)
    polls = (
        (
            await db.execute(
                select(Poll)
                .filter(
                    Poll.school_id == UUID(school_id),
                    Poll.is_active == True,  # noqa: E712
                    Poll.is_deleted == False,  # noqa: E712
                    Poll.target_audience.in_(["All", aud]),
                )
                .order_by(Poll.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    if not polls:
        return APIResponse(success=True, data=[])
    poll_ids = [p.id for p in polls]
    options = (
        (await db.execute(select(PollOption).filter(PollOption.poll_id.in_(poll_ids)).order_by(PollOption.position)))
        .scalars()
        .all()
    )
    count_rows = (
        await db.execute(
            select(PollVote.option_id, func.count())
            .filter(PollVote.poll_id.in_(poll_ids))
            .group_by(PollVote.option_id)
        )
    ).all()
    counts = {oid: c for oid, c in count_rows}
    my_rows = (
        await db.execute(
            select(PollVote.poll_id, PollVote.option_id).filter(
                PollVote.poll_id.in_(poll_ids), PollVote.user_id == UUID(token_data.user_id)
            )
        )
    ).all()
    my_vote = {pid: oid for pid, oid in my_rows}
    opts_by_poll: dict = {}
    for o in options:
        opts_by_poll.setdefault(o.poll_id, []).append(o)

    data = []
    for p in polls:
        opt_resp = [
            PollOptionResponse(id=o.id, text=o.text, votes=int(counts.get(o.id, 0)))
            for o in opts_by_poll.get(p.id, [])
        ]
        data.append(
            PollResponse(
                id=p.id,
                question=p.question,
                target_audience=p.target_audience,
                is_active=p.is_active,
                closes_at=p.closes_at,
                options=opt_resp,
                total_votes=sum(r.votes for r in opt_resp),
                my_option_id=my_vote.get(p.id),
            )
        )
    return APIResponse(success=True, data=data)


@router.post("/polls/{poll_id}/vote", response_model=APIResponse)
async def vote_poll(
    poll_id: UUID,
    body: PollVoteCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Cast one vote. Tenant + audience checked; a user may vote at most once per poll."""
    poll = (
        (await db.execute(select(Poll).filter(Poll.id == poll_id, Poll.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not poll or poll.is_deleted or not poll.is_active:
        raise HTTPException(status_code=404, detail="Poll not found or closed.")
    if poll.target_audience not in ("All", _audience_for(token_data.role)):
        raise HTTPException(status_code=403, detail="This poll isn't open to you.")
    option = (
        (
            await db.execute(
                select(PollOption).filter(PollOption.id == body.option_id, PollOption.poll_id == poll_id)
            )
        )
        .scalars()
        .first()
    )
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option for this poll.")
    existing = (
        (
            await db.execute(
                select(PollVote).filter(
                    PollVote.poll_id == poll_id, PollVote.user_id == UUID(token_data.user_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already voted in this poll.")
    db.add(
        PollVote(
            school_id=UUID(school_id),
            poll_id=poll_id,
            option_id=body.option_id,
            user_id=UUID(token_data.user_id),
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Vote recorded.")

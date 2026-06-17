from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.messaging import ParentMessage
from app.models.students import Parent
from app.schemas.base import APIResponse
from app.schemas.messaging import MessageCreate, MessageResponse, ThreadSummary

router = APIRouter()

ADMIN = ["School Admin", "Super Admin"]


def _parent_name(p: Parent) -> str:
    return p.father_name or p.mother_name or p.guardian_name or "Parent"


async def _resolve_parent(db: AsyncSession, token_data: deps.TokenData, school_id: str) -> Parent:
    res = await db.execute(select(Parent).filter(Parent.user_id == UUID(token_data.user_id)))
    parent = res.scalars().first()
    if not parent or str(parent.school_id) != school_id:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return parent


# --- PARENT SIDE ---
@router.get(
    "/me",
    response_model=APIResponse[List[MessageResponse]],
    dependencies=[Depends(deps.require_roles(["Parent"]))],
)
async def get_my_messages(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    parent = await _resolve_parent(db, token_data, school_id)
    # Mark school replies as read
    await db.execute(
        update(ParentMessage)
        .where(
            ParentMessage.parent_id == parent.id,
            ParentMessage.sender == "School",
            ParentMessage.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    msgs = (
        (
            await db.execute(
                select(ParentMessage)
                .filter(ParentMessage.parent_id == parent.id)
                .order_by(ParentMessage.created_at)
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=msgs)


@router.post(
    "/me",
    response_model=APIResponse[MessageResponse],
    dependencies=[Depends(deps.require_roles(["Parent"]))],
)
async def send_my_message(
    msg_in: MessageCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    parent = await _resolve_parent(db, token_data, school_id)
    if not msg_in.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    msg = ParentMessage(
        school_id=UUID(school_id),
        parent_id=parent.id,
        sender="Parent",
        sender_user_id=UUID(token_data.user_id),
        body=msg_in.body.strip(),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return APIResponse(success=True, data=msg)


# --- SCHOOL (ADMIN) SIDE ---
@router.get(
    "/threads",
    response_model=APIResponse[List[ThreadSummary]],
    dependencies=[Depends(deps.require_roles(ADMIN))],
)
async def list_threads(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    rows = (
        await db.execute(
            select(ParentMessage, Parent)
            .join(Parent, Parent.id == ParentMessage.parent_id)
            .filter(ParentMessage.school_id == UUID(school_id))
            .order_by(ParentMessage.created_at)
        )
    ).all()
    threads: dict = {}
    for m, p in rows:
        t = threads.setdefault(
            p.id,
            {
                "parent_id": p.id,
                "parent_name": _parent_name(p),
                "last_message": None,
                "last_at": None,
                "unread": 0,
            },
        )
        t["last_message"] = m.body
        t["last_at"] = m.created_at
        if m.sender == "Parent" and not m.is_read:
            t["unread"] += 1
    data = sorted(threads.values(), key=lambda x: x["last_at"] or 0, reverse=True)
    return APIResponse(success=True, data=data)


@router.get(
    "/threads/{parent_id}",
    response_model=APIResponse[List[MessageResponse]],
    dependencies=[Depends(deps.require_roles(ADMIN))],
)
async def get_thread(
    parent_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    await db.execute(
        update(ParentMessage)
        .where(
            ParentMessage.parent_id == parent_id,
            ParentMessage.school_id == UUID(school_id),
            ParentMessage.sender == "Parent",
            ParentMessage.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    msgs = (
        (
            await db.execute(
                select(ParentMessage)
                .filter(
                    ParentMessage.parent_id == parent_id, ParentMessage.school_id == UUID(school_id)
                )
                .order_by(ParentMessage.created_at)
            )
        )
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=msgs)


@router.post(
    "/threads/{parent_id}",
    response_model=APIResponse[MessageResponse],
    dependencies=[Depends(deps.require_roles(ADMIN))],
)
async def reply_to_thread(
    parent_id: UUID,
    msg_in: MessageCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    if not msg_in.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    # The parent must belong to this tenant (prevents cross-tenant message injection).
    parent = (
        (
            await db.execute(
                select(Parent).filter(Parent.id == parent_id, Parent.school_id == UUID(school_id))
            )
        )
        .scalars()
        .first()
    )
    if not parent:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = ParentMessage(
        school_id=UUID(school_id),
        parent_id=parent_id,
        sender="School",
        sender_user_id=UUID(token_data.user_id),
        body=msg_in.body.strip(),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return APIResponse(success=True, data=msg)

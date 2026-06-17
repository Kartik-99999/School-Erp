from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogPage
from app.schemas.base import APIResponse

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[AuditLogPage],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def list_audit_logs(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, ge=1, le=200),
):
    """Tenant-scoped, paginated audit trail (newest first). School Admin / Super Admin only."""
    base = select(AuditLog).filter(AuditLog.school_id == UUID(school_id))
    if action:
        base = base.filter(AuditLog.action == action)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (
        (await db.execute(base.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)))
        .scalars()
        .all()
    )

    return APIResponse(
        success=True, data=AuditLogPage(items=rows, total=total, skip=skip, limit=limit)
    )

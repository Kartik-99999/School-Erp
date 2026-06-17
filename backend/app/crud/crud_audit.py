import hashlib
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


def _content_hash(school_id, actor_user_id, action, entity_type, entity_id, summary) -> str:
    canonical = "|".join(
        "" if v is None else str(v)
        for v in (school_id, actor_user_id, action, entity_type, entity_id, summary)
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def record_audit(
    db: AsyncSession,
    *,
    action: str,
    school_id=None,
    actor_user_id=None,
    actor_email: Optional[str] = None,
    actor_role: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id=None,
    summary: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Append an audit entry to the caller's transaction. Best-effort: the write
    runs inside a SAVEPOINT and any failure (e.g. the audit table not yet
    created) is swallowed and rolled back to that savepoint, so auditing can
    never poison or break the business operation it accompanies.
    Stores a sha256 of the canonical content for tamper-evidence."""
    entry = AuditLog(
        school_id=school_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        ip_address=ip_address,
        content_hash=_content_hash(
            school_id, actor_user_id, action, entity_type, entity_id, summary
        ),
    )
    try:
        async with db.begin_nested():
            db.add(entry)
            await db.flush()
        return entry
    except Exception as e:  # noqa: BLE001 — auditing must not break the caller
        print(f"[audit] skipped '{action}': {type(e).__name__}: {e}")
        return None

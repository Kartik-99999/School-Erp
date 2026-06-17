from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: UUID
    school_id: Optional[UUID] = None
    actor_user_id: Optional[UUID] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    summary: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AuditLogPage(BaseModel):
    items: List[AuditLogResponse]
    total: int
    skip: int
    limit: int

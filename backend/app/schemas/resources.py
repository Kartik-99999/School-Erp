from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ResourceResponse(BaseModel):
    id: UUID
    school_id: UUID
    title: str
    description: Optional[str] = None
    category: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    external_url: Optional[str] = None
    target_audience: str
    target_class_id: Optional[UUID] = None
    target_section_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    uploaded_by: Optional[UUID] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

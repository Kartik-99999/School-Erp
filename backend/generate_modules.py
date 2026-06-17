modules = {
    "homework": {
        "model": """
from sqlalchemy import Column, String, Date, Boolean, ForeignKey, DateTime, Text, UUID
from sqlalchemy.sql import func
from app.models.base import Base

class Homework(Base):
    __tablename__ = "homeworks"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    due_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    is_deleted = Column(Boolean, default=False)
""",
        "schema": """
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class HomeworkBase(BaseModel):
    class_id: UUID
    section_id: UUID
    subject_id: UUID
    title: str
    description: Optional[str] = None
    due_date: date

class HomeworkCreate(HomeworkBase):
    pass

class HomeworkResponse(HomeworkBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
""",
        "api": """
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Any
from uuid import UUID
from app.api import deps
from app.schemas.homework import HomeworkCreate, HomeworkResponse
from app.models.homework import Homework
from app.schemas.base import APIResponse

router = APIRouter()

@router.get("/", response_model=APIResponse[List[HomeworkResponse]])
async def get_homeworks(
    class_id: UUID,
    section_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = select(Homework).filter(
        Homework.school_id == UUID(school_id),
        Homework.class_id == class_id,
        Homework.section_id == section_id,
        Homework.is_deleted == False
    )
    result = await db.execute(query)
    homeworks = result.scalars().all()
    return APIResponse(success=True, data=homeworks)
""",
    },
    "notices": {
        "model": """
from sqlalchemy import Column, String, Boolean, DateTime, Text, UUID
from sqlalchemy.sql import func
from app.models.base import Base

class Notice(Base):
    __tablename__ = "notices"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(String(50)) # "All", "Students", "Teachers", "Parents"
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    is_deleted = Column(Boolean, default=False)
""",
        "schema": """
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class NoticeBase(BaseModel):
    title: str
    content: str
    target_audience: Optional[str] = "All"

class NoticeCreate(NoticeBase):
    pass

class NoticeResponse(NoticeBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
""",
        "api": """
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Any
from uuid import UUID
from app.api import deps
from app.schemas.notices import NoticeCreate, NoticeResponse
from app.models.notices import Notice
from app.schemas.base import APIResponse

router = APIRouter()

@router.get("/", response_model=APIResponse[List[NoticeResponse]])
async def get_notices(
    audience: str = "All",
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    query = select(Notice).filter(Notice.school_id == UUID(school_id), Notice.is_deleted == False)
    if audience != "All":
        query = query.filter(Notice.target_audience.in_(["All", audience]))
    result = await db.execute(query.order_by(Notice.created_at.desc()))
    notices = result.scalars().all()
    return APIResponse(success=True, data=notices)
""",
    },
}

for mod, content in modules.items():
    with open(f"app/models/{mod}.py", "w") as f:
        f.write(content["model"])
    with open(f"app/schemas/{mod}.py", "w") as f:
        f.write(content["schema"])
    with open(f"app/api/v1/endpoints/{mod}.py", "w") as f:
        f.write(content["api"])

print("Generated boilerplate for: " + ", ".join(modules.keys()))

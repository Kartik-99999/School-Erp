from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.admissions import AdmissionsDocument, AdmissionsEnquiry
from app.schemas.admissions import DocumentCreate, DocumentUpdate, EnquiryCreate, EnquiryUpdate


class CRUDAdmissionsEnquiry(CRUDBase[AdmissionsEnquiry, EnquiryCreate, EnquiryUpdate]):
    async def get_multi_by_stage(
        self,
        db: AsyncSession,
        *,
        school_id: UUID,
        stage: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AdmissionsEnquiry]:
        query = select(self.model).filter(self.model.school_id == school_id)
        if stage:
            query = query.filter(self.model.stage == stage)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()


class CRUDAdmissionsDocument(CRUDBase[AdmissionsDocument, DocumentCreate, DocumentUpdate]):
    async def get_by_enquiry(
        self, db: AsyncSession, *, school_id: UUID, enquiry_id: UUID
    ) -> List[AdmissionsDocument]:
        query = select(self.model).filter(
            self.model.school_id == school_id, self.model.enquiry_id == enquiry_id
        )
        result = await db.execute(query)
        return result.scalars().all()


crud_enquiry = CRUDAdmissionsEnquiry(AdmissionsEnquiry)
crud_document = CRUDAdmissionsDocument(AdmissionsDocument)

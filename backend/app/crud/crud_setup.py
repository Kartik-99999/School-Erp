from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.setup import (
    AcademicYear,
    ClassModel,
    FeeHead,
    FeeStructure,
    Section,
    Subject,
)
from app.schemas.setup import (
    AcademicYearCreate,
    AcademicYearUpdate,
    ClassCreate,
    ClassUpdate,
    FeeHeadCreate,
    FeeHeadUpdate,
    FeeStructureCreate,
    FeeStructureUpdate,
    SectionCreate,
    SectionUpdate,
    SubjectCreate,
    SubjectUpdate,
)


class CRUDAcademicYear(CRUDBase[AcademicYear, AcademicYearCreate, AcademicYearUpdate]):
    async def get_active(self, db: AsyncSession, school_id: UUID) -> Optional[AcademicYear]:
        query = select(self.model).filter(
            self.model.school_id == school_id, self.model.is_active == True
        )
        result = await db.execute(query)
        return result.scalars().first()


class CRUDClass(CRUDBase[ClassModel, ClassCreate, ClassUpdate]):
    pass


class CRUDSection(CRUDBase[Section, SectionCreate, SectionUpdate]):
    async def get_by_class(
        self, db: AsyncSession, school_id: UUID, class_id: UUID
    ) -> List[Section]:
        query = select(self.model).filter(
            self.model.school_id == school_id, self.model.class_id == class_id
        )
        result = await db.execute(query)
        return result.scalars().all()


class CRUDSubject(CRUDBase[Subject, SubjectCreate, SubjectUpdate]):
    pass


class CRUDFeeHead(CRUDBase[FeeHead, FeeHeadCreate, FeeHeadUpdate]):
    pass


class CRUDFeeStructure(CRUDBase[FeeStructure, FeeStructureCreate, FeeStructureUpdate]):
    pass


crud_academic_year = CRUDAcademicYear(AcademicYear)
crud_class = CRUDClass(ClassModel)
crud_section = CRUDSection(Section)
crud_subject = CRUDSubject(Subject)
crud_fee_head = CRUDFeeHead(FeeHead)
crud_fee_structure = CRUDFeeStructure(FeeStructure)

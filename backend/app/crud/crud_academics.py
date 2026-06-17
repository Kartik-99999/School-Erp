from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.academics import (
    Homework,
    SyllabusChapter,
    SyllabusProgress,
    TimetablePeriod,
    TimetableSlot,
)
from app.schemas.academics import (
    TimetableSlotCreate,
    TimetableSlotUpdate,
)


class CRUDTimetableSlot(CRUDBase[TimetableSlot, TimetableSlotCreate, TimetableSlotUpdate]):
    async def check_teacher_conflict(
        self, db: AsyncSession, school_id: UUID, teacher_id: UUID, period_id: UUID, day_of_week: str
    ) -> bool:
        """Returns True if conflict exists."""
        query = select(self.model).filter(
            self.model.school_id == school_id,
            self.model.teacher_id == teacher_id,
            self.model.period_id == period_id,
            self.model.day_of_week == day_of_week,
        )
        result = await db.execute(query)
        return result.scalars().first() is not None


class CRUDSimple(CRUDBase):
    pass


crud_period = CRUDSimple(TimetablePeriod)
crud_timetable_slot = CRUDTimetableSlot(TimetableSlot)
crud_syllabus_chapter = CRUDSimple(SyllabusChapter)
crud_syllabus_progress = CRUDSimple(SyllabusProgress)
crud_homework = CRUDSimple(Homework)

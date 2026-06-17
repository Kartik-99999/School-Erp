from datetime import date, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# Timetable Periods
class TimetablePeriodBase(BaseModel):
    name: str
    start_time: time
    end_time: time
    is_break: bool = False


class TimetablePeriodCreate(TimetablePeriodBase):
    pass


class TimetablePeriodResponse(TimetablePeriodBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# Timetable Slots
class TimetableSlotBase(BaseModel):
    class_id: UUID
    section_id: UUID
    period_id: UUID
    day_of_week: str
    subject_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None


class TimetableSlotCreate(TimetableSlotBase):
    academic_year_id: UUID


class TimetableSlotUpdate(BaseModel):
    subject_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None


class TimetableSlotResponse(TimetableSlotBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# Syllabus
class SyllabusChapterBase(BaseModel):
    class_id: UUID
    subject_id: UUID
    chapter_name: str
    description: Optional[str] = None
    order_index: int = 0


class SyllabusChapterCreate(SyllabusChapterBase):
    academic_year_id: UUID


class SyllabusChapterResponse(SyllabusChapterBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class SyllabusProgressBase(BaseModel):
    chapter_id: UUID
    section_id: UUID
    completion_date: date


class SyllabusProgressCreate(SyllabusProgressBase):
    marked_by_teacher_id: UUID


class SyllabusProgressResponse(SyllabusProgressBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# Homework
class HomeworkBase(BaseModel):
    class_id: UUID
    section_id: UUID
    subject_id: UUID
    title: str
    description: Optional[str] = None
    due_date: date
    attachment_url: Optional[str] = None


class HomeworkCreate(HomeworkBase):
    academic_year_id: UUID
    teacher_id: UUID


class HomeworkUpdate(BaseModel):
    status: str


class HomeworkResponse(HomeworkBase):
    id: UUID
    teacher_id: UUID
    status: str
    created_at: date
    model_config = ConfigDict(from_attributes=True)


class HomeworkSubmissionCreate(BaseModel):
    file_url: Optional[str] = None


class HomeworkSubmissionResponse(BaseModel):
    id: UUID
    homework_id: UUID
    student_id: UUID
    submitted_at: date
    file_url: Optional[str] = None
    status: str
    grade: Optional[str] = None
    feedback: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

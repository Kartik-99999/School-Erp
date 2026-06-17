from datetime import date, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class GradeRule(BaseModel):
    min: float
    max: float
    grade: str
    points: float


class GradeScaleBase(BaseModel):
    name: str
    rules: List[GradeRule]
    is_default: bool = False


class GradeScaleCreate(GradeScaleBase):
    pass


class GradeScaleResponse(GradeScaleBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class ExamTypeBase(BaseModel):
    name: str
    weightage_percent: Optional[float] = None


class ExamTypeCreate(ExamTypeBase):
    pass


class ExamTypeResponse(ExamTypeBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class ExamBase(BaseModel):
    academic_year_id: UUID
    exam_type_id: UUID
    class_id: UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "Scheduled"


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None


class ExamResponse(ExamBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class ExamScheduleBase(BaseModel):
    exam_id: UUID
    subject_id: UUID
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: float
    passing_marks: float


class ExamScheduleCreate(ExamScheduleBase):
    pass


class ExamScheduleResponse(ExamScheduleBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class StudentMarkBase(BaseModel):
    student_id: UUID
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    remarks: Optional[str] = None


class StudentMarkCreate(StudentMarkBase):
    pass


class StudentMarkBulkCreate(BaseModel):
    exam_schedule_id: UUID
    marks: List[StudentMarkCreate]


class StudentMarkResponse(StudentMarkBase):
    id: UUID
    exam_schedule_id: UUID
    model_config = ConfigDict(from_attributes=True)


class ResultBase(BaseModel):
    exam_id: UUID
    student_id: UUID
    total_marks: float
    obtained_marks: float
    percentage: float
    grade: str
    status: str
    rank: Optional[int] = None


class ResultResponse(ResultBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

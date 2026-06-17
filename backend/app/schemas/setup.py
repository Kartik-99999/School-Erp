from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# Academic Year
class AcademicYearBase(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_active: bool = False


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class AcademicYearResponse(AcademicYearBase):
    id: UUID
    school_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# School Setting
class SchoolSettingBase(BaseModel):
    setting_key: str
    setting_value: dict[str, Any]


class SchoolSettingCreate(SchoolSettingBase):
    pass


class SchoolSettingUpdate(BaseModel):
    setting_value: dict[str, Any]


class SchoolSettingResponse(SchoolSettingBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Class
class ClassBase(BaseModel):
    name: str
    numeric_value: Optional[int] = None
    level: Optional[str] = None


class ClassCreate(ClassBase):
    pass


class ClassUpdate(ClassBase):
    name: Optional[str] = None
    level: Optional[str] = None


class ClassResponse(ClassBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Section
class SectionBase(BaseModel):
    name: str
    class_id: UUID


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    name: str


class SectionResponse(SectionBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Subject
class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    type: str = "Theory"


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(SubjectBase):
    name: Optional[str] = None
    type: Optional[str] = None


class SubjectResponse(SubjectBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Class Subject
class ClassSubjectBase(BaseModel):
    class_id: UUID
    subject_id: UUID


class ClassSubjectCreate(ClassSubjectBase):
    pass


class ClassSubjectResponse(ClassSubjectBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Fee Head
class FeeHeadBase(BaseModel):
    name: str
    description: Optional[str] = None


class FeeHeadCreate(FeeHeadBase):
    pass


class FeeHeadUpdate(FeeHeadBase):
    name: Optional[str] = None


class FeeHeadResponse(FeeHeadBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Fee Structure
class FeeStructureBase(BaseModel):
    academic_year_id: UUID
    class_id: UUID
    fee_head_id: UUID
    amount: float
    frequency: str


class FeeStructureCreate(FeeStructureBase):
    pass


class FeeStructureUpdate(BaseModel):
    amount: Optional[float] = None
    frequency: Optional[str] = None


class FeeStructureResponse(FeeStructureBase):
    id: UUID
    school_id: UUID
    model_config = ConfigDict(from_attributes=True)

from datetime import date
from typing import Annotated, List, Optional
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, field_serializer

from app.utils.masking import mask_pii
from app.utils.validators import clean_aadhaar, clean_apaar, clean_pen

# Validated, self-normalizing PII field types — used on INPUT schemas only
# (create/update). Response schemas stay unvalidated so legacy/imported rows always
# read back. The clean_* funcs normalize and raise ValueError (-> HTTP 422) on bad input.
AadhaarField = Annotated[Optional[str], BeforeValidator(clean_aadhaar)]
ApaarField = Annotated[Optional[str], BeforeValidator(clean_apaar)]
PenField = Annotated[Optional[str], BeforeValidator(clean_pen)]


# Parent
class ParentBase(BaseModel):
    father_name: Optional[str] = None
    father_phone: Optional[str] = None
    father_email: Optional[str] = None
    father_occupation: Optional[str] = None
    father_religion: Optional[str] = None
    father_category: Optional[str] = None
    father_nationality: Optional[str] = None
    father_aadhaar: Optional[str] = None
    mother_name: Optional[str] = None
    mother_phone: Optional[str] = None
    mother_email: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_religion: Optional[str] = None
    mother_category: Optional[str] = None
    mother_nationality: Optional[str] = None
    mother_aadhaar: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_religion: Optional[str] = None
    guardian_category: Optional[str] = None
    guardian_nationality: Optional[str] = None
    guardian_aadhaar: Optional[str] = None
    primary_contact_email: Optional[str] = None  # used for the Parent portal login
    address: Optional[str] = None


class ParentCreate(ParentBase):
    # Validate Aadhaar on input only — ParentResponse extends ParentBase, not this.
    father_aadhaar: AadhaarField = None
    mother_aadhaar: AadhaarField = None
    guardian_aadhaar: AadhaarField = None


class ParentResponse(ParentBase):
    id: UUID
    school_id: UUID
    user_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("father_aadhaar", "mother_aadhaar", "guardian_aadhaar")
    def _mask_aadhaar(self, v: Optional[str]) -> Optional[str]:
        return mask_pii(v)


# Medical
class StudentMedicalBase(BaseModel):
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None


class StudentMedicalCreate(StudentMedicalBase):
    pass


class StudentMedicalResponse(StudentMedicalBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# Student
class StudentBase(BaseModel):
    first_name: str
    last_name: str
    dob: date
    date_of_joining: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = "Indian"
    religion: Optional[str] = None
    category: Optional[str] = None
    mother_tongue: Optional[str] = None
    apaar_id: Optional[str] = None
    aadhaar_no: Optional[str] = None
    pen_number: Optional[str] = None
    photo_url: Optional[str] = None
    current_class_id: Optional[UUID] = None
    current_section_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    status: Optional[str] = "Active"


class StudentCreate(StudentBase):
    # Validate the government IDs on input only — StudentResponse extends StudentBase.
    apaar_id: ApaarField = None
    aadhaar_no: AadhaarField = None
    pen_number: PenField = None
    parent: ParentCreate
    medical: Optional[StudentMedicalCreate] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    date_of_joining: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    religion: Optional[str] = None
    category: Optional[str] = None
    mother_tongue: Optional[str] = None
    apaar_id: ApaarField = None
    aadhaar_no: AadhaarField = None
    pen_number: PenField = None
    photo_url: Optional[str] = None
    current_class_id: Optional[UUID] = None
    current_section_id: Optional[UUID] = None
    status: Optional[str] = None

    parent: Optional[ParentCreate] = None
    medical: Optional[StudentMedicalCreate] = None


class StudentResponse(StudentBase):
    id: UUID
    school_id: UUID
    parent_id: UUID
    user_id: Optional[UUID] = None
    admission_number: Optional[str] = None
    roll_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("apaar_id", "aadhaar_no", "pen_number")
    def _mask_ids(self, v: Optional[str]) -> Optional[str]:
        return mask_pii(v)


class StudentProfileResponse(StudentResponse):
    parent: Optional[ParentResponse] = None
    medical: Optional[StudentMedicalResponse] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None


class StudentPage(BaseModel):
    items: List[StudentResponse]
    total: int
    skip: int
    limit: int


class BulkImportResult(BaseModel):
    success_count: int
    failed_count: int
    errors: List[dict]


class BulkPromoteRequest(BaseModel):
    student_ids: List[UUID]
    next_class_id: UUID
    next_section_id: UUID
    academic_year_id: UUID

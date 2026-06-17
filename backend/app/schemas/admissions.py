from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class EnquiryBase(BaseModel):
    student_name: str
    parent_name: str
    contact_number: str
    email: Optional[str] = None
    admission_for_class: Optional[str] = None
    notes: Optional[str] = None
    stage: Optional[str] = "Enquiry Received"


class EnquiryCreate(EnquiryBase):
    pass


class EnquiryPublicCreate(BaseModel):
    student_name: str
    parent_name: str
    contact_number: str
    email: Optional[str] = None
    admission_for_class: Optional[str] = None
    notes: Optional[str] = None


class EnquiryUpdate(BaseModel):
    student_name: Optional[str] = None
    parent_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    admission_for_class: Optional[str] = None
    notes: Optional[str] = None
    stage: Optional[str] = None


class EnquiryResponse(EnquiryBase):
    id: UUID
    school_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DocumentBase(BaseModel):
    document_type: str
    file_url: str
    verified: Optional[bool] = False


class DocumentCreate(DocumentBase):
    enquiry_id: UUID


class DocumentUpdate(BaseModel):
    verified: Optional[bool] = None


class DocumentResponse(DocumentBase):
    id: UUID
    school_id: UUID
    enquiry_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

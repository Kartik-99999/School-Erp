from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LibraryBookBase(BaseModel):
    title: str
    author: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    edition: Optional[str] = None
    category: Optional[str] = None
    total_copies: int = 1
    location_rack: Optional[str] = None


class LibraryBookCreate(LibraryBookBase):
    pass


class LibraryBookUpdate(BaseModel):
    title: Optional[str] = None
    total_copies: Optional[int] = None
    available_copies: Optional[int] = None
    location_rack: Optional[str] = None


class LibraryBookResponse(LibraryBookBase):
    id: UUID
    available_copies: int
    model_config = ConfigDict(from_attributes=True)


class LibraryIssueBase(BaseModel):
    book_id: UUID
    student_id: Optional[UUID] = None
    staff_id: Optional[UUID] = None
    due_date: date


class LibraryIssueCreate(LibraryIssueBase):
    pass


class LibraryIssueUpdate(BaseModel):
    return_date: Optional[date] = None
    status: Optional[str] = None
    fine_amount: Optional[float] = None
    fine_paid: Optional[bool] = None


class LibraryIssueResponse(LibraryIssueBase):
    id: UUID
    issue_date: date
    return_date: Optional[date] = None
    status: str
    fine_amount: float
    fine_paid: bool

    # Extended fields for frontend display
    book_title: Optional[str] = None
    borrower_name: Optional[str] = None
    borrower_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

from datetime import date
from typing import List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_library import crud_library_book, crud_library_issue
from app.models.library import LibraryBook, LibraryIssue
from app.models.setup import SchoolSetting
from app.models.staff import Staff
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.library import (
    LibraryBookCreate,
    LibraryBookResponse,
    LibraryIssueCreate,
    LibraryIssueResponse,
)

router = APIRouter()


# --- CATALOG MANAGEMENT ---
@router.post(
    "/books",
    response_model=APIResponse[LibraryBookResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_book(
    book_in: LibraryBookCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # Check if book with same ISBN exists to just increment copies
    if book_in.isbn:
        query = select(LibraryBook).filter(
            LibraryBook.school_id == UUID(school_id), LibraryBook.isbn == book_in.isbn
        )
        existing = (await db.execute(query)).scalars().first()
        if existing:
            existing.total_copies += book_in.total_copies
            existing.available_copies += book_in.total_copies
            db.add(existing)
            await db.commit()
            await db.refresh(existing)
            return APIResponse(
                success=True, data=existing, message="Existing book found. Copies incremented."
            )

    book = await crud_library_book.create(db, obj_in=book_in, school_id=UUID(school_id))
    return APIResponse(success=True, data=book)


@router.get("/books", response_model=APIResponse[List[LibraryBookResponse]])
async def get_books(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(LibraryBook).filter(LibraryBook.school_id == UUID(school_id))
    if search:
        query = query.filter(
            LibraryBook.title.ilike(f"%{search}%")
            | LibraryBook.author.ilike(f"%{search}%")
            | LibraryBook.isbn.ilike(f"%{search}%")
        )
    if category:
        query = query.filter(LibraryBook.category == category)

    books = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=books)


@router.get("/lookup/isbn/{isbn}")
async def lookup_isbn(isbn: str):
    """Fetches book metadata from Open Library API."""
    async with httpx.AsyncClient() as client:
        try:
            # Clean ISBN
            clean_isbn = "".join(filter(str.isdigit, isbn))
            response = await client.get(
                f"https://openlibrary.org/api/books?bibkeys=ISBN:{clean_isbn}&jscmd=data&format=json"
            )
            data = response.json()

            key = f"ISBN:{clean_isbn}"
            if key not in data:
                raise HTTPException(
                    status_code=404, detail="Book not found in Open Library database."
                )

            book_data = data[key]

            # Extract relevant fields
            authors = book_data.get("authors", [])
            author_names = ", ".join([a["name"] for a in authors])
            publishers = book_data.get("publishers", [])
            publisher_names = ", ".join([p["name"] for p in publishers])

            extracted = {
                "title": book_data.get("title", ""),
                "author": author_names,
                "publisher": publisher_names,
                "isbn": clean_isbn,
            }
            return APIResponse(success=True, data=extracted)

        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Failed to connect to Open Library API.")


# --- ISSUE & RETURN ---
@router.post(
    "/issues",
    response_model=APIResponse[LibraryIssueResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def issue_book(
    issue_in: LibraryIssueCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    if not issue_in.student_id and not issue_in.staff_id:
        raise HTTPException(status_code=400, detail="Must specify either student_id or staff_id.")

    book = await crud_library_book.get(db, id=issue_in.book_id, school_id=school_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies available for issue.")

    # Decrease available copies
    book.available_copies -= 1
    db.add(book)

    # Create issue record
    issue = await crud_library_issue.create(db, obj_in=issue_in, school_id=school_id)

    return APIResponse(success=True, data=issue, message="Book issued successfully.")


@router.get("/issues", response_model=APIResponse[List[LibraryIssueResponse]])
async def get_issues(
    status: Optional[str] = None,  # Issued, Returned, Overdue
    student_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(LibraryIssue, LibraryBook, Student, Staff)
        .join(LibraryBook, LibraryBook.id == LibraryIssue.book_id)
        .outerjoin(Student, Student.id == LibraryIssue.student_id)
        .outerjoin(Staff, Staff.id == LibraryIssue.staff_id)
        .filter(LibraryIssue.school_id == UUID(school_id))
    )

    if status:
        if status == "Overdue":
            query = query.filter(
                LibraryIssue.status == "Issued", LibraryIssue.due_date < date.today()
            )
        else:
            query = query.filter(LibraryIssue.status == status)

    if student_id:
        query = query.filter(LibraryIssue.student_id == student_id)

    query = query.order_by(LibraryIssue.issue_date.desc())
    results = await db.execute(query)

    response_data = []

    # Process results to enrich data
    for issue, book, student, staff in results:
        resp = LibraryIssueResponse.model_validate(issue)
        resp.book_title = book.title

        if student:
            resp.borrower_name = (
                f"{student.first_name} {student.last_name} (Adm: {student.admission_number})"
            )
            resp.borrower_type = "Student"
        elif staff:
            resp.borrower_name = f"{staff.first_name} {staff.last_name} (Emp: {staff.employee_id})"
            resp.borrower_type = "Staff"

        # Dynamically calculate overdue status for frontend
        if issue.status == "Issued" and issue.due_date < date.today():
            resp.status = "Overdue"

        response_data.append(resp)

    return APIResponse(success=True, data=response_data)


@router.post(
    "/issues/{issue_id}/return",
    response_model=APIResponse[LibraryIssueResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def return_book(
    issue_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    issue = await crud_library_issue.get(db, id=issue_id, school_id=school_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue record not found.")

    if issue.status == "Returned":
        raise HTTPException(status_code=400, detail="Book is already returned.")

    # Calculate fine if overdue
    fine = 0
    today = date.today()
    if today > issue.due_date:
        # Fetch fine per day from settings (defaulting to 10 if not set)
        setting_query = select(SchoolSetting).filter(
            SchoolSetting.school_id == UUID(school_id),
            SchoolSetting.setting_key == "library_fine_per_day",
        )
        setting_res = (await db.execute(setting_query)).scalars().first()
        fine_per_day = float(setting_res.setting_value.get("value", 10)) if setting_res else 10.0

        days_late = (today - issue.due_date).days
        fine = days_late * fine_per_day

    # Update Issue
    issue.return_date = today
    issue.status = "Returned"
    issue.fine_amount = fine
    db.add(issue)

    # Increase available copies
    book = await crud_library_book.get(db, id=issue.book_id, school_id=school_id)
    if book:
        book.available_copies += 1
        db.add(book)

    await db.commit()

    # Return enriched response for UI
    resp = LibraryIssueResponse.model_validate(issue)
    if book:
        resp.book_title = book.title

    msg = "Book returned successfully."
    if fine > 0:
        msg += f" Overdue fine of ₹{fine} has been generated."

    return APIResponse(success=True, data=resp, message=msg)

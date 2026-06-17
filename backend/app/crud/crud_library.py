from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.library import LibraryBook, LibraryIssue
from app.schemas.library import (
    LibraryBookCreate,
    LibraryBookUpdate,
    LibraryIssueCreate,
    LibraryIssueUpdate,
)


class CRUDLibraryBook(CRUDBase[LibraryBook, LibraryBookCreate, LibraryBookUpdate]):
    async def create(
        self, db: AsyncSession, *, obj_in: LibraryBookCreate, school_id: UUID
    ) -> LibraryBook:
        # Initialize available copies to total copies on creation
        obj_in_data = obj_in.dict()
        obj_in_data["school_id"] = school_id
        obj_in_data["available_copies"] = obj_in_data["total_copies"]

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


class CRUDLibraryIssue(CRUDBase[LibraryIssue, LibraryIssueCreate, LibraryIssueUpdate]):
    pass


crud_library_book = CRUDLibraryBook(LibraryBook)
crud_library_issue = CRUDLibraryIssue(LibraryIssue)

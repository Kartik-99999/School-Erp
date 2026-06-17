"""Create the student-portal tables (idempotent).

Run from the backend/ directory:
    python create_student_portal_tables.py

Alternatively, re-apply db/schema.sql which now includes this table.
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

# Import referenced models so their tables are registered in the shared
# metadata and the foreign keys (schools/students/users) can be resolved.
from app.models.school import School  # noqa: F401
from app.models.student_leaves import StudentLeaveApplication
from app.models.students import Student  # noqa: F401
from app.models.users import User  # noqa: F401


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(StudentLeaveApplication.__table__.create, checkfirst=True)
    await engine.dispose()
    print("student_leave_applications table is ready.")


if __name__ == "__main__":
    asyncio.run(main())

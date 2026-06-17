"""Add per-contact emails (parents) plus joining date + government/academic
identifiers (students). Idempotent (ADD COLUMN IF NOT EXISTS).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python migrate_student_fields.py
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

STATEMENTS = [
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS father_email VARCHAR(255)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255)",
    # Religion / category / nationality / Aadhaar for each contact
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS father_religion VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS father_category VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS father_nationality VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS father_aadhaar VARCHAR(20)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS mother_religion VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS mother_category VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS mother_nationality VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS mother_aadhaar VARCHAR(20)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS guardian_religion VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS guardian_category VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS guardian_nationality VARCHAR(50)",
    "ALTER TABLE parents ADD COLUMN IF NOT EXISTS guardian_aadhaar VARCHAR(20)",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_joining DATE",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_tongue VARCHAR(50)",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS apaar_id VARCHAR(20)",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20)",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS pen_number VARCHAR(30)",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        for sql in STATEMENTS:
            await conn.execute(text(sql))
    await engine.dispose()
    print("student/parent fields migrated (contact emails, joining date, APAAR/Aadhaar/PEN).")


if __name__ == "__main__":
    asyncio.run(main())

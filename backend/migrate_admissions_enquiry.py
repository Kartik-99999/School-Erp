"""Reconcile the admissions_enquiries table with its ORM model
(app/models/admissions.py). The table predates a model simplification: it was
missing the model's `admission_for_class` column and still had `academic_year_id`
NOT NULL, so EVERY ORM insert/select on enquiries failed (public admission form +
the admin enquiries list both 500'd). This is unrelated to RLS; it was a
pre-existing model/schema drift surfaced while smoke-testing RLS. Idempotent.

    cd backend && PYTHONPATH=. ./venv/bin/python migrate_admissions_enquiry.py
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

STATEMENTS = [
    # Model has this free-text field; the table never got it.
    "ALTER TABLE admissions_enquiries ADD COLUMN IF NOT EXISTS admission_for_class VARCHAR(50)",
    # The simplified public-enquiry model does not set academic_year_id; the legacy
    # NOT NULL made inserts impossible. Relax it (column is kept for back-compat).
    "ALTER TABLE admissions_enquiries ALTER COLUMN academic_year_id DROP NOT NULL",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print(
        "admissions_enquiries reconciled with the ORM model "
        "(+admission_for_class, academic_year_id now nullable)."
    )


if __name__ == "__main__":
    asyncio.run(main())

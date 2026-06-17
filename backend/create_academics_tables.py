"""Create any ORM tables not already defined in db/schema.sql.

Imports the full app (registering every model on Base.metadata) and runs
create_all, which creates only the tables that don't yet exist — so it complements
schema.sql by adding the model-only tables (homework_submissions, syllabus_*,
timetable_*, leave_*, library_*, transport_*, results, notices, …). Run AFTER
db/schema.sql. Idempotent; existing tables are left untouched. Uses backend/.env.
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

import app.main  # noqa: F401  -- imports every router/model so Base.metadata is complete
from app.core.config import settings
from app.models.base import Base


async def create_tables():
    # async_database_uri = owner connection (DDL); never the non-owner APP_DB_USER.
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("create_all complete: model-only tables ensured (existing tables untouched).")


if __name__ == "__main__":
    asyncio.run(create_tables())

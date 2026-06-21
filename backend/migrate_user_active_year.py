"""Add users.active_academic_year_id (per-user active academic year). Idempotent.

Run:  cd backend && PYTHONPATH=. ./venv/bin/python migrate_user_active_year.py
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_academic_year_id UUID")
        )
    await engine.dispose()
    print("users.active_academic_year_id is ready.")


if __name__ == "__main__":
    asyncio.run(main())

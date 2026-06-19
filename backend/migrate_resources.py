"""Create the resources/documents library table + add notices.category (idempotent).

Run: cd backend && PYTHONPATH=. ./venv/bin/python migrate_resources.py
Then re-run enable_rls.py so the new school_id table gets the tenant_isolation policy.

The `resources` table is a per-school, audience-targeted file/document library (mirrors the
Notice pattern). `notices.category` ('Notice' | 'Circular') adds a small Circular category.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

import app.main  # noqa: F401 — import the full app so every FK-target model is registered
from app.core.config import settings
from app.models.resources import Resource  # noqa: F401 — the table to create


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        await conn.run_sync(Resource.__table__.create, checkfirst=True)
        await conn.execute(
            text(
                "ALTER TABLE notices ADD COLUMN IF NOT EXISTS category VARCHAR(50) "
                "NOT NULL DEFAULT 'Notice'"
            )
        )
    await engine.dispose()
    print("resources table + notices.category ensured.")


if __name__ == "__main__":
    asyncio.run(main())

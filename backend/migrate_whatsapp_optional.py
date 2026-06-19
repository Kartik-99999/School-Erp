"""Add the per-school WhatsApp opt-in column to `schools` (idempotent).

Run: cd backend && PYTHONPATH=. ./venv/bin/python migrate_whatsapp_optional.py

WhatsApp alerts are OFF by default for every school (incl. existing rows) — adding the
column NOT NULL DEFAULT FALSE backfills existing rows to FALSE, so there is zero behaviour
change until a School Admin opts in via Settings.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

STATEMENTS = [
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print("schools: whatsapp_enabled column ensured (default FALSE).")


if __name__ == "__main__":
    asyncio.run(main())

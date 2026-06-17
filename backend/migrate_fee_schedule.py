"""Make fee_schedules.fee_structure_id nullable + add label (for ad-hoc hostel/transport dues). Idempotent."""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE fee_schedules ALTER COLUMN fee_structure_id DROP NOT NULL")
        )
        await conn.execute(
            text("ALTER TABLE fee_schedules ADD COLUMN IF NOT EXISTS label VARCHAR(255)")
        )
    await engine.dispose()
    print("fee_schedules migrated: fee_structure_id nullable + label added.")


if __name__ == "__main__":
    asyncio.run(main())

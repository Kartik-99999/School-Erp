import asyncio

import asyncpg

from app.core.config import settings


async def run():
    conn = await asyncpg.connect(
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=settings.POSTGRES_DB,
        host=settings.POSTGRES_SERVER,
        port=settings.POSTGRES_PORT,
    )
    await conn.execute("ALTER TABLE classes ADD COLUMN IF NOT EXISTS level VARCHAR(50);")
    await conn.close()
    print("Migration successful.")


asyncio.run(run())

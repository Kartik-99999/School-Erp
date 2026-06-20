"""Apply a plain-DDL .sql file (db/schema.sql) as the DB OWNER, idempotently.

Lets the DB bring-up job run without a `psql` client in the backend image. Connects with
asyncpg directly — its simple-query protocol runs a multi-statement file in one call, and
schema.sql is plain DDL (no dollar-quoted functions). Skips when the database is already
initialized (the `schools` table exists), so re-runs (future migrations) are safe.

Usage:  python apply_schema.py [path/to/schema.sql]   (default: db/schema.sql)
Reads the OWNER connection + SSL flag from app.core.config (env-driven).
"""

import asyncio
import sys

import asyncpg

from app.core.config import settings


async def main(path: str) -> None:
    with open(path) as f:
        sql = f.read()
    conn = await asyncpg.connect(
        host=settings.POSTGRES_SERVER,
        port=int(settings.POSTGRES_PORT),
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=settings.POSTGRES_DB,
        ssl="require" if settings.DB_SSL_REQUIRE else None,
    )
    try:
        if await conn.fetchval("SELECT to_regclass('public.schools')"):
            print(f"apply_schema: 'schools' already present — skipping {path}")
            return
        await conn.execute(sql)
        print(f"apply_schema: applied {path}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "db/schema.sql"))

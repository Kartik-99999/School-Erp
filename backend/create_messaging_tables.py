"""Create the parent_messages table (idempotent)."""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.messaging import ParentMessage
from app.models.school import School  # noqa: F401
from app.models.students import Parent, Student  # noqa: F401
from app.models.users import User  # noqa: F401


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(ParentMessage.__table__.create, checkfirst=True)
    await engine.dispose()
    print("parent_messages table is ready.")


if __name__ == "__main__":
    asyncio.run(main())

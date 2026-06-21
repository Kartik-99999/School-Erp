"""Create polls + poll_options + poll_votes (idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_polls_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.communication import Poll, PollOption, PollVote
from app.models.users import User  # noqa: F401 (FK target for created_by)


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(Poll.__table__.create, checkfirst=True)
        await conn.run_sync(PollOption.__table__.create, checkfirst=True)
        await conn.run_sync(PollVote.__table__.create, checkfirst=True)
    await engine.dispose()
    print("polls + poll_options + poll_votes tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())

"""Create device_tokens + notifications (idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_notifications_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.notifications import DeviceToken, Notification


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(DeviceToken.__table__.create, checkfirst=True)
        await conn.run_sync(Notification.__table__.create, checkfirst=True)
    await engine.dispose()
    print("device_tokens + notifications tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())

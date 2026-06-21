"""Create appointment_slots + appointments (idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_appointments_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.appointments import Appointment, AppointmentSlot
from app.models.staff import Staff  # noqa: F401 (FK target)


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(AppointmentSlot.__table__.create, checkfirst=True)
        await conn.run_sync(Appointment.__table__.create, checkfirst=True)
    await engine.dispose()
    print("appointment_slots + appointments tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())

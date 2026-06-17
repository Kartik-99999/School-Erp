"""Create the co-curricular tables — houses, house_points, house_memberships,
clubs, club_memberships, sports, sport_memberships (idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_activities_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.activities import (
    Club,
    ClubMembership,
    House,
    HouseMembership,
    HousePoint,
    Sport,
    SportMembership,
)
from app.models.students import Student  # noqa: F401  (FK target for memberships)


async def main():
    engine = create_async_engine(settings.async_database_uri)
    # Parents before children so the foreign keys resolve.
    async with engine.begin() as conn:
        for model in (
            House,
            HousePoint,
            HouseMembership,
            Club,
            ClubMembership,
            Sport,
            SportMembership,
        ):
            await conn.run_sync(model.__table__.create, checkfirst=True)
    await engine.dispose()
    print("co-curricular tables (houses/clubs/sports) are ready.")


if __name__ == "__main__":
    asyncio.run(main())

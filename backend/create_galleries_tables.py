"""Create galleries + gallery_photos (idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_galleries_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.communication import Gallery, GalleryPhoto
from app.models.users import User  # noqa: F401 (FK target for created_by)


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(Gallery.__table__.create, checkfirst=True)
        await conn.run_sync(GalleryPhoto.__table__.create, checkfirst=True)
    await engine.dispose()
    print("galleries + gallery_photos tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from app.db.session import async_session
from app.models.students import StudentDocument

async def main():
    async with async_session() as db:
        print("Success")

asyncio.run(main())

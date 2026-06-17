import asyncio
from app.db.session import SessionLocal
from app.models.students import Student
from sqlalchemy.future import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(Student))
        students = result.scalars().all()
        print(f"Total students in DB: {len(students)}")

asyncio.run(main())

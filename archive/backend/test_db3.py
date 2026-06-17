import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/school_erp", echo=True)
    async with engine.begin() as conn:
        await conn.execute(text("SET LOCAL row_security = OFF;"))
        res = await conn.execute(text("SELECT count(*) FROM students;"))
        print("Count:", res.scalar())

if __name__ == "__main__":
    asyncio.run(main())

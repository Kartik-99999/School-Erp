import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.models.setup import ClassModel

async def test():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/school_erp")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # get any class
        res = await session.execute(text("SELECT id FROM classes LIMIT 1"))
        cls_id = res.scalar()
        if not cls_id:
            print("No class found")
            return
            
        print(f"Trying to delete class {cls_id}")
        try:
            await session.execute(text(f"DELETE FROM classes WHERE id = '{cls_id}'"))
            await session.commit()
            print("Deleted successfully")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())

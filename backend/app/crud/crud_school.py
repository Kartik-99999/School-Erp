from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.school import School


# No Pydantic schemas needed strictly for this utility lookup right now
class CRUDSchool(CRUDBase[School, dict, dict]):
    async def get_by_subdomain(self, db: AsyncSession, subdomain: str) -> Optional[School]:
        query = select(self.model).filter(
            self.model.subdomain == subdomain, self.model.is_deleted == False
        )
        result = await db.execute(query)
        return result.scalars().first()


crud_school = CRUDSchool(School)

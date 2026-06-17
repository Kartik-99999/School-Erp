from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.hostel import HostelAllocation, HostelBuilding, HostelRoom


class CRUDSimple(CRUDBase):
    pass


crud_hostel_building = CRUDSimple(HostelBuilding)
crud_hostel_room = CRUDSimple(HostelRoom)
crud_hostel_allocation = CRUDSimple(HostelAllocation)


async def get_room_occupancy(db: AsyncSession, room_id: UUID) -> int:
    query = select(func.count(HostelAllocation.id)).filter(
        HostelAllocation.room_id == room_id, HostelAllocation.status == "Active"
    )
    result = await db.execute(query)
    return result.scalar_one()

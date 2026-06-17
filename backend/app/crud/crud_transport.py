from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.transport import StudentTransport, TransportRoute, TransportStop, TransportVehicle


class CRUDSimple(CRUDBase):
    pass


crud_vehicle = CRUDSimple(TransportVehicle)
crud_route = CRUDSimple(TransportRoute)
crud_stop = CRUDSimple(TransportStop)
crud_student_transport = CRUDSimple(StudentTransport)


# For getting stops by route
async def get_stops_by_route(
    db: AsyncSession, school_id: UUID, route_id: UUID
) -> List[TransportStop]:
    query = select(TransportStop).filter(
        TransportStop.school_id == school_id, TransportStop.route_id == route_id
    )
    result = await db.execute(query)
    return result.scalars().all()

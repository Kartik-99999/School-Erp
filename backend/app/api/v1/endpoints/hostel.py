from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_hostel import (
    crud_hostel_allocation,
    crud_hostel_building,
    crud_hostel_room,
    get_room_occupancy,
)
from app.models.hostel import HostelAllocation, HostelBuilding, HostelRoom
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.hostel import (
    HostelAllocationCreate,
    HostelAllocationResponse,
    HostelBuildingCreate,
    HostelBuildingResponse,
    HostelRoomCreate,
    HostelRoomResponse,
)

router = APIRouter()


# --- BUILDINGS ---
@router.post(
    "/buildings",
    response_model=APIResponse[HostelBuildingResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_building(
    building_in: HostelBuildingCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    building = await crud_hostel_building.create(db, obj_in=building_in, school_id=school_id)
    return APIResponse(success=True, data=building)


@router.get("/buildings", response_model=APIResponse[List[HostelBuildingResponse]])
async def get_buildings(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    buildings = await crud_hostel_building.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=buildings)


# --- ROOMS ---
@router.post(
    "/rooms",
    response_model=APIResponse[HostelRoomResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_room(
    room_in: HostelRoomCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    room = await crud_hostel_room.create(db, obj_in=room_in, school_id=school_id)
    return APIResponse(success=True, data=room)


@router.get("/rooms", response_model=APIResponse[List[HostelRoomResponse]])
async def get_rooms(
    building_id: UUID = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(HostelRoom, HostelBuilding)
        .join(HostelBuilding, HostelBuilding.id == HostelRoom.building_id)
        .filter(HostelRoom.school_id == UUID(school_id))
    )

    if building_id:
        query = query.filter(HostelRoom.building_id == building_id)

    query = query.order_by(HostelBuilding.name, HostelRoom.room_number)
    results = await db.execute(query)

    data = []
    for room, building in results:
        resp = HostelRoomResponse.model_validate(room)
        resp.building_name = building.name
        resp.occupancy = await get_room_occupancy(db, room.id)
        data.append(resp)

    return APIResponse(success=True, data=data)


# --- ALLOCATIONS ---
@router.post(
    "/allocations",
    response_model=APIResponse[HostelAllocationResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def assign_student_to_room(
    alloc_in: HostelAllocationCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # 1. Check if student already allocated
    existing_alloc = (
        (
            await db.execute(
                select(HostelAllocation).filter(
                    HostelAllocation.student_id == alloc_in.student_id,
                    HostelAllocation.status == "Active",
                )
            )
        )
        .scalars()
        .first()
    )
    if existing_alloc:
        raise HTTPException(status_code=400, detail="Student is already assigned to a room.")

    # 2. Check room capacity
    room = await crud_hostel_room.get(db, id=alloc_in.room_id, school_id=school_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    current_occupancy = await get_room_occupancy(db, room.id)
    if current_occupancy >= room.capacity:
        raise HTTPException(status_code=400, detail="Room is at full capacity.")

    # 3. Create allocation
    alloc = await crud_hostel_allocation.create(db, obj_in=alloc_in, school_id=school_id)

    # 4. Auto-bill the room's monthly fee as a student due
    from app.crud.crud_fees import create_adhoc_due

    due = await create_adhoc_due(
        db,
        UUID(school_id),
        alloc_in.student_id,
        room.monthly_fee,
        f"Hostel Fee - Room {room.room_number}",
    )
    await db.commit()

    msg = (
        "Student assigned to room. Hostel fee added to dues."
        if due
        else "Student assigned to room. No fee was billed (set an active academic year and a room fee > 0)."
    )
    return APIResponse(success=True, data=alloc, message=msg)


@router.get("/allocations", response_model=APIResponse[List[HostelAllocationResponse]])
async def get_allocations(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(HostelAllocation, Student, HostelRoom, HostelBuilding)
        .join(Student, Student.id == HostelAllocation.student_id)
        .join(HostelRoom, HostelRoom.id == HostelAllocation.room_id)
        .join(HostelBuilding, HostelBuilding.id == HostelRoom.building_id)
        .filter(HostelAllocation.school_id == UUID(school_id), HostelAllocation.status == "Active")
    )

    results = await db.execute(query)

    data = []
    for alloc, student, room, building in results:
        resp = HostelAllocationResponse.model_validate(alloc)
        resp.student_name = f"{student.first_name} {student.last_name}"
        resp.admission_number = student.admission_number
        resp.room_number = room.room_number
        resp.building_name = building.name
        data.append(resp)

    return APIResponse(success=True, data=data)


@router.post(
    "/allocations/{alloc_id}/vacate",
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def vacate_room(
    alloc_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    alloc = await crud_hostel_allocation.get(db, id=alloc_id, school_id=school_id)
    if not alloc:
        raise HTTPException(404, "Allocation not found")

    alloc.status = "Vacated"
    db.add(alloc)
    # Cancel any unpaid hostel due for this student — they're leaving the room.
    from app.models.fees import FeeSchedule

    await db.execute(
        delete(FeeSchedule).where(
            FeeSchedule.school_id == UUID(school_id),
            FeeSchedule.student_id == alloc.student_id,
            FeeSchedule.label.like("Hostel Fee%"),
            FeeSchedule.amount_paid == 0,
        )
    )
    await db.commit()

    return APIResponse(success=True, message="Room vacated successfully.")

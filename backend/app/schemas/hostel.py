from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class HostelBuildingBase(BaseModel):
    name: str
    warden_name: Optional[str] = None
    warden_contact: Optional[str] = None
    type: str


class HostelBuildingCreate(HostelBuildingBase):
    pass


class HostelBuildingResponse(HostelBuildingBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class HostelRoomBase(BaseModel):
    building_id: UUID
    room_number: str
    room_type: str
    capacity: int
    monthly_fee: float


class HostelRoomCreate(HostelRoomBase):
    pass


class HostelRoomResponse(HostelRoomBase):
    id: UUID
    # Extended for UI
    building_name: Optional[str] = None
    occupancy: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)


class HostelAllocationBase(BaseModel):
    student_id: UUID
    room_id: UUID


class HostelAllocationCreate(HostelAllocationBase):
    academic_year_id: UUID


class HostelAllocationResponse(HostelAllocationBase):
    id: UUID
    status: str
    # Extended for UI
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    room_number: Optional[str] = None
    building_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

from datetime import date, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TransportVehicleBase(BaseModel):
    vehicle_number: str
    capacity: int
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    fitness_expiry_date: Optional[date] = None


class TransportVehicleCreate(TransportVehicleBase):
    pass


class TransportVehicleResponse(TransportVehicleBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class TransportStopBase(BaseModel):
    stop_name: str
    pickup_time: Optional[time] = None
    drop_time: Optional[time] = None
    monthly_fee: float = 0


class TransportStopCreate(TransportStopBase):
    route_id: UUID


class TransportStopResponse(TransportStopBase):
    id: UUID
    route_id: UUID
    model_config = ConfigDict(from_attributes=True)


class TransportRouteBase(BaseModel):
    name: str
    starting_point: Optional[str] = None
    vehicle_id: Optional[UUID] = None


class TransportRouteCreate(TransportRouteBase):
    pass


class TransportRouteResponse(TransportRouteBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class StudentTransportBase(BaseModel):
    student_id: UUID
    route_id: UUID
    stop_id: UUID


class StudentTransportCreate(StudentTransportBase):
    academic_year_id: UUID


class StudentTransportResponse(StudentTransportBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

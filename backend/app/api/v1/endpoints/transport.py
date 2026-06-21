from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.crud.crud_transport import (
    crud_route,
    crud_stop,
    crud_student_transport,
    crud_vehicle,
    get_stops_by_route,
)
from app.models.students import Student
from app.models.transport import StudentTransport, TransportStop
from app.schemas.base import APIResponse
from app.schemas.transport import (
    StudentTransportCreate,
    StudentTransportResponse,
    TransportRouteCreate,
    TransportRouteResponse,
    TransportStopCreate,
    TransportStopResponse,
    TransportVehicleCreate,
    TransportVehicleResponse,
)

router = APIRouter()


# --- VEHICLES ---
@router.post(
    "/vehicles",
    response_model=APIResponse[TransportVehicleResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_vehicle(
    vehicle_in: TransportVehicleCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    try:
        vehicle = await crud_vehicle.create(db, obj_in=vehicle_in, school_id=school_id)
        return APIResponse(success=True, data=vehicle)
    except Exception:
        raise HTTPException(400, "Vehicle number might already exist.")


@router.get("/vehicles", response_model=APIResponse[List[TransportVehicleResponse]])
async def get_vehicles(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    vehicles = await crud_vehicle.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=vehicles)


# --- ROUTES & STOPS ---
@router.post(
    "/routes",
    response_model=APIResponse[TransportRouteResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_route(
    route_in: TransportRouteCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    route = await crud_route.create(db, obj_in=route_in, school_id=school_id)
    return APIResponse(success=True, data=route)


@router.get("/routes", response_model=APIResponse[List[TransportRouteResponse]])
async def get_routes(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    routes = await crud_route.get_multi(db, school_id=school_id)
    return APIResponse(success=True, data=routes)


@router.post(
    "/stops",
    response_model=APIResponse[TransportStopResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_stop(
    stop_in: TransportStopCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    stop = await crud_stop.create(db, obj_in=stop_in, school_id=school_id)
    return APIResponse(success=True, data=stop)


@router.get("/routes/{route_id}/stops", response_model=APIResponse[List[TransportStopResponse]])
async def get_route_stops(
    route_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    stops = await get_stops_by_route(db, UUID(school_id), route_id)
    return APIResponse(success=True, data=stops)


# --- STUDENT ASSIGNMENT ---
@router.post(
    "/assignments",
    response_model=APIResponse[StudentTransportResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def assign_student(
    assign_in: StudentTransportCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    try:
        # One student = one active route
        assign = await crud_student_transport.create(db, obj_in=assign_in, school_id=school_id)

        # Auto-bill the stop's monthly fee as a student due
        from app.crud.crud_fees import create_adhoc_due

        stop = await crud_stop.get(db, id=assign_in.stop_id, school_id=school_id)
        route = await crud_route.get(db, id=assign_in.route_id, school_id=school_id)
        due = None
        if stop:
            label = f"Transport Fee - {route.name if route else 'Route'}"
            due = await create_adhoc_due(
                db, UUID(school_id), assign_in.student_id, stop.monthly_fee, label
            )
            await db.commit()

        msg = (
            "Student assigned. Transport fee added to dues."
            if due
            else "Student assigned. No transport fee was billed."
        )
        return APIResponse(success=True, data=assign, message=msg)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Student might already be assigned to a route.")


@router.get("/routes/{route_id}/students")
async def get_route_students(
    route_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = (
        select(StudentTransport, Student, TransportStop)
        .join(Student, Student.id == StudentTransport.student_id)
        .join(TransportStop, TransportStop.id == StudentTransport.stop_id)
        .filter(
            StudentTransport.route_id == route_id, StudentTransport.school_id == UUID(school_id)
        )
    )
    result = await db.execute(query)

    data = []
    for row in result:
        st_trans, student, stop = row
        data.append(
            {
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "admission_number": student.admission_number,
                "stop_name": stop.stop_name,
                "pickup_time": stop.pickup_time,
            }
        )
    return APIResponse(success=True, data=data)


# Register Manifest Template
pdf_module.TEMPLATES[
    "route_manifest.html"
] = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h2>ROUTE MANIFEST</h2>
        <h3>{{ route.name }}</h3>
    </div>
    <div class="details">
        <p><strong>Vehicle:</strong> {{ vehicle.vehicle_number }} (Capacity: {{ vehicle.capacity }})</p>
        <p><strong>Driver:</strong> {{ vehicle.driver_name }} ({{ vehicle.driver_contact }})</p>
        <p><strong>Total Students:</strong> {{ students|length }}</p>
    </div>
    <table>
        <tr>
            <th>Student Name</th>
            <th>Admission No</th>
            <th>Stop Name</th>
            <th>Pickup Time</th>
        </tr>
        {% for s in students %}
        <tr>
            <td>{{ s.student_name }}</td>
            <td>{{ s.admission_number }}</td>
            <td>{{ s.stop_name }}</td>
            <td>{{ s.pickup_time }}</td>
        </tr>
        {% endfor %}
    </table>
</body>
</html>
"""


@router.get("/routes/{route_id}/manifest/pdf")
async def generate_route_manifest(
    route_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    route = await crud_route.get(db, id=route_id, school_id=school_id)
    if not route:
        raise HTTPException(404)
    vehicle = await crud_vehicle.get(db, id=route.vehicle_id, school_id=school_id)

    students_res = await get_route_students(route_id, db, school_id)

    context = {"route": route, "vehicle": vehicle, "students": students_res.data}

    pdf_bytes = pdf_module.generate_pdf("route_manifest.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Manifest_{route.name}.pdf"},
    )

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud.crud_staff import crud_staff, crud_staff_salary
from app.schemas.base import APIResponse
from app.schemas.staff import (
    StaffSalaryStructureCreate,
    StaffSalaryStructureResponse,
)

router = APIRouter()


@router.get("/employees")
async def get_payroll_employees(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    staff_list = await crud_staff.get_multi(db, skip=0, limit=1000, school_id=school_id)
    result = []
    for staff in staff_list:
        structure = await crud_staff_salary.get_by_staff(
            db, staff_id=staff.id, school_id=UUID(school_id)
        )
        result.append({"staff": staff, "structure": structure})
    return APIResponse(success=True, data=result)


@router.get("/structure/{staff_id}", response_model=APIResponse[StaffSalaryStructureResponse])
async def get_salary_structure(
    staff_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    structure = await crud_staff_salary.get_by_staff(
        db, staff_id=staff_id, school_id=UUID(school_id)
    )
    if not structure:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    return APIResponse(success=True, data=structure)


@router.post(
    "/structure",
    response_model=APIResponse[StaffSalaryStructureResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
async def create_salary_structure(
    structure_in: StaffSalaryStructureCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    # Check if exists
    existing = await crud_staff_salary.get_by_staff(
        db, staff_id=structure_in.staff_id, school_id=UUID(school_id)
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Salary structure already exists. Use update instead."
        )

    structure = await crud_staff_salary.create(db, obj_in=structure_in, school_id=school_id)
    return APIResponse(success=True, data=structure)


# In-memory template registration for payslip
import app.utils.pdf as pdf_module

pdf_module.TEMPLATES[
    "payslip.html"
] = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h2>PAYSLIP</h2>
        <p>Month: {{ month }} | Year: {{ year }}</p>
    </div>
    <div class="details">
        <p><strong>Name:</strong> {{ staff.first_name }} {{ staff.last_name }}</p>
        <p><strong>Employee ID:</strong> {{ staff.employee_id }}</p>
        <p><strong>Designation:</strong> {{ staff.designation }}</p>
    </div>
    <table>
        <tr>
            <th>Earnings</th>
            <th>Amount (INR)</th>
            <th>Deductions</th>
            <th>Amount (INR)</th>
        </tr>
        <tr>
            <td>Basic Salary</td>
            <td>{{ structure.basic_salary }}</td>
            <td>PF</td>
            <td>{{ structure.deductions.get('PF', 0) }}</td>
        </tr>
        <tr>
            <td>HRA</td>
            <td>{{ structure.hra }}</td>
            <td>TDS</td>
            <td>{{ structure.deductions.get('TDS', 0) }}</td>
        </tr>
        <tr>
            <td>DA</td>
            <td>{{ structure.da }}</td>
            <td>Other</td>
            <td>{{ structure.deductions.get('Other', 0) }}</td>
        </tr>
        <tr class="total">
            <td>Gross Earnings</td>
            <td>{{ gross_earnings }}</td>
            <td>Total Deductions</td>
            <td>{{ total_deductions }}</td>
        </tr>
    </table>
    <h3 style="text-align: right;">Net Payable: INR {{ net_payable }}</h3>
</body>
</html>
"""


@router.get("/payslip/{staff_id}")
async def generate_payslip(
    staff_id: UUID,
    month: str,
    year: str,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    staff = await crud_staff.get(db, id=staff_id, school_id=school_id)
    structure = await crud_staff_salary.get_by_staff(
        db, staff_id=staff_id, school_id=UUID(school_id)
    )

    if not staff or not structure:
        raise HTTPException(status_code=404, detail="Staff or Salary Structure not found")

    gross = (
        float(structure.basic_salary)
        + float(structure.hra)
        + float(structure.da)
        + sum(structure.allowances.values())
    )
    deductions = sum(structure.deductions.values())
    net = gross - deductions

    context = {
        "staff": staff,
        "structure": structure,
        "month": month,
        "year": year,
        "gross_earnings": gross,
        "total_deductions": deductions,
        "net_payable": net,
    }

    pdf_bytes = pdf_module.generate_pdf("payslip.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=payslip_{staff.employee_id}_{month}_{year}.pdf"
        },
    )


import io
import zipfile

from pydantic import BaseModel


class PayrollProcessRequest(BaseModel):
    month: str
    year: str


@router.post(
    "/process",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
async def process_payroll(
    req: PayrollProcessRequest,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    # Mock endpoint for processing payroll
    return APIResponse(success=True, message=f"Payroll processed for {req.month} {req.year}")


@router.get(
    "/payslip/batch/download",
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
async def batch_generate_payslips(
    month: str,
    year: str,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    # Get all staff
    staff_list = await crud_staff.get_multi(db, skip=0, limit=10000, school_id=school_id)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for staff in staff_list:
            structure = await crud_staff_salary.get_by_staff(
                db, staff_id=staff.id, school_id=UUID(school_id)
            )
            if structure:
                gross = (
                    float(structure.basic_salary)
                    + float(structure.hra)
                    + float(structure.da)
                    + sum(structure.allowances.values())
                )
                deductions = sum(structure.deductions.values())
                net = gross - deductions

                context = {
                    "staff": staff,
                    "structure": structure,
                    "month": month,
                    "year": year,
                    "gross_earnings": gross,
                    "total_deductions": deductions,
                    "net_payable": net,
                }

                pdf_bytes = pdf_module.generate_pdf("payslip.html", context)
                filename = f"payslip_{staff.employee_id or staff.id}_{month}_{year}.pdf"
                zip_file.writestr(filename, pdf_bytes)

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=payslips_{month}_{year}.zip"},
    )

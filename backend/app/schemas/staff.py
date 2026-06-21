from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class LeaveStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class StaffBase(BaseModel):
    first_name: str
    last_name: str
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    date_of_joining: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None


class StaffCreate(StaffBase):
    email: EmailStr
    role_name: str = "Teacher"  # Super Admin, School Admin, Teacher, Accountant


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None


class StaffResponse(StaffBase):
    id: UUID
    school_id: UUID
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)


class StaffDocumentBase(BaseModel):
    staff_id: UUID
    document_type: str
    document_url: str


class StaffDocumentCreate(StaffDocumentBase):
    pass


class StaffDocumentResponse(StaffDocumentBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StaffSalaryStructureBase(BaseModel):
    staff_id: UUID
    basic_salary: float
    hra: float
    da: float
    allowances: Dict[str, float] = {}
    deductions: Dict[str, float] = {}


class StaffSalaryStructureCreate(StaffSalaryStructureBase):
    pass


class StaffSalaryStructureUpdate(BaseModel):
    basic_salary: Optional[float] = None
    hra: Optional[float] = None
    da: Optional[float] = None
    allowances: Optional[Dict[str, float]] = None
    deductions: Optional[Dict[str, float]] = None


class StaffSalaryStructureResponse(StaffSalaryStructureBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class PayrollEmployeeResponse(BaseModel):
    """One row of GET /payroll/employees: a staff member + their salary structure (if any)."""
    staff: StaffResponse
    structure: Optional[StaffSalaryStructureResponse] = None
    model_config = ConfigDict(from_attributes=True)


class AttendanceStaffBase(BaseModel):
    staff_id: UUID
    date: date
    status: str
    remarks: Optional[str] = None


class AttendanceStaffCreate(AttendanceStaffBase):
    marked_by: Optional[UUID] = None


class AttendanceStaffResponse(AttendanceStaffBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class AttendanceBulkMark(BaseModel):
    date: date
    attendance_records: List[AttendanceStaffBase]


class LeaveTypeBase(BaseModel):
    name: str
    days_allowed: int


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeResponse(LeaveTypeBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class LeaveApplicationBase(BaseModel):
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveApplicationCreate(LeaveApplicationBase):
    staff_id: UUID


class LeaveApplicationResponse(LeaveApplicationBase):
    id: UUID
    staff_id: UUID
    status: LeaveStatus
    model_config = ConfigDict(from_attributes=True)

import enum

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class Staff(Base):
    __tablename__ = "staff"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    employee_id = Column(String(50))
    designation = Column(String(100))
    department = Column(String(100))
    dob = Column(Date)
    gender = Column(String(20))
    date_of_joining = Column(Date)
    phone = Column(String(50))
    address = Column(Text)
    photo_url = Column(Text)
    qualification = Column(Text)
    experience_years = Column(Integer)
    bank_account_no = Column(String(100))
    bank_ifsc = Column(String(50))
    bank_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class StaffDocument(Base):
    __tablename__ = "staff_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    document_type = Column(String(100))
    document_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class StaffSalaryStructure(Base):
    __tablename__ = "staff_salary_structures"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    basic_salary = Column(Numeric(10, 2), default=0)
    hra = Column(Numeric(10, 2), default=0)
    da = Column(Numeric(10, 2), default=0)
    allowances = Column(JSON, default=dict)
    deductions = Column(JSON, default=dict)  # PF, ESI, TDS
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class AttendanceStaff(Base):
    __tablename__ = "attendance_staff"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False)  # Present, Absent, Half Day, Leave
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class LeaveType(Base):
    __tablename__ = "leave_types"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)  # Casual Leave, Sick Leave, etc.
    days_allowed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    leave_type_id = Column(
        UUID(as_uuid=True), ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    balance = Column(Numeric(5, 1), default=0)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class LeaveStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class LeaveApplication(Base):
    __tablename__ = "leave_applications"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    staff_id = Column(
        UUID(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False
    )
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

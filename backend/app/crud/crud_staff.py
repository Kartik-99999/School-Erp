from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import generate_random_password, get_password_hash
from app.crud.base import CRUDBase
from app.models.staff import (
    AttendanceStaff,
    LeaveApplication,
    LeaveBalance,
    LeaveType,
    Staff,
    StaffDocument,
    StaffSalaryStructure,
)
from app.models.users import Role, User
from app.schemas.staff import (
    StaffCreate,
    StaffSalaryStructureCreate,
    StaffSalaryStructureUpdate,
    StaffUpdate,
)


class CRUDStaff(CRUDBase[Staff, StaffCreate, StaffUpdate]):
    async def create_with_user(
        self, db: AsyncSession, *, obj_in: StaffCreate, school_id: str
    ) -> Staff:
        school_uuid = UUID(school_id)

        # 1. Get Role ID
        role_query = select(Role).filter(
            Role.name == obj_in.role_name, Role.school_id == school_uuid
        )
        role_result = await db.execute(role_query)
        role = role_result.scalars().first()
        if not role:
            role = Role(school_id=school_uuid, name=obj_in.role_name, permissions={})
            db.add(role)
            await db.commit()
            await db.refresh(role)

        # 2. Setup User Account with a securely generated one-time password
        raw_password = generate_random_password(10)
        hashed_pw = get_password_hash(raw_password)

        new_user = User(
            school_id=school_uuid, email=obj_in.email, hashed_password=hashed_pw, role_id=role.id
        )
        db.add(new_user)
        await db.flush()

        # 3. Create Staff
        staff_data = obj_in.dict(exclude={"email", "role_name"})
        staff_data["school_id"] = school_uuid
        staff_data["user_id"] = new_user.id

        # Generate Employee ID if not provided
        if not staff_data.get("employee_id"):
            seq_result = await db.execute(text("SELECT nextval('global_employee_seq')"))
            seq = seq_result.scalar_one()
            staff_data["employee_id"] = f"EMP{str(seq).zfill(4)}"

        new_staff = Staff(**staff_data)
        db.add(new_staff)
        await db.commit()
        await db.refresh(new_staff)

        # Attach the one-time plaintext password as a transient attribute so the
        # endpoint can surface it once to the admin (never persisted/serialized).
        new_staff.generated_password = raw_password
        return new_staff


class CRUDStaffSalaryStructure(
    CRUDBase[StaffSalaryStructure, StaffSalaryStructureCreate, StaffSalaryStructureUpdate]
):
    async def get_by_staff(
        self, db: AsyncSession, *, staff_id: UUID, school_id: UUID
    ) -> Optional[StaffSalaryStructure]:
        query = select(self.model).filter(
            self.model.school_id == school_id, self.model.staff_id == staff_id
        )
        result = await db.execute(query)
        return result.scalars().first()


crud_staff = CRUDStaff(Staff)
crud_staff_salary = CRUDStaffSalaryStructure(StaffSalaryStructure)


# Quick CRUDs
class CRUDBaseSimple(CRUDBase):
    pass


crud_staff_document = CRUDBaseSimple(StaffDocument)
crud_attendance_staff = CRUDBaseSimple(AttendanceStaff)
crud_leave_type = CRUDBaseSimple(LeaveType)
crud_leave_application = CRUDBaseSimple(LeaveApplication)
crud_leave_balance = CRUDBaseSimple(LeaveBalance)

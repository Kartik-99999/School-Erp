from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import generate_random_password, get_password_hash
from app.crud.base import CRUDBase
from app.models.school import School
from app.models.setup import AcademicYear
from app.models.students import Parent, Student, StudentMedical
from app.models.users import Role, User
from app.schemas.students import StudentCreate, StudentUpdate
from app.utils.twilio import send_whatsapp_if_enabled


class CRUDStudent(CRUDBase[Student, StudentCreate, StudentUpdate]):

    async def generate_admission_number(
        self, db: AsyncSession, school_id: UUID, academic_year_id: UUID
    ) -> str:
        # Get School Acronym
        school = await db.execute(select(School).filter(School.id == school_id))
        school_obj = school.scalars().first()
        school_code = (
            "".join([word[0] for word in school_obj.name.split()[:3]]).upper()
            if school_obj
            else "SCH"
        )

        # Get Year String
        year = await db.execute(select(AcademicYear).filter(AcademicYear.id == academic_year_id))
        year_obj = year.scalars().first()
        year_str = year_obj.name.split("-")[0] if year_obj else str(datetime.now().year)

        # Get Sequence using PostgreSQL sequence
        seq_result = await db.execute(text("SELECT nextval('global_admission_seq')"))
        seq = seq_result.scalar_one()

        return f"{school_code}/{year_str}/{str(seq).zfill(4)}"

    async def create_with_parent_and_user(
        self, db: AsyncSession, *, obj_in: StudentCreate, school_id: str, commit: bool = True
    ) -> Student:
        school_uuid = UUID(school_id)

        # 1. Get Parent Role ID
        role_query = select(Role).filter(Role.name == "Parent", Role.school_id == school_uuid)
        role_result = await db.execute(role_query)
        role = role_result.scalars().first()
        if not role:
            # Fallback for dev - if role doesn't exist, create it
            role = Role(school_id=school_uuid, name="Parent", permissions={})
            db.add(role)
            await db.flush()  # part of the caller's transaction (no mid-flow commit)

        # 2. Setup Parent User Account
        parent_email = (
            obj_in.parent.primary_contact_email
            or f"parent_{school_uuid.hex[:6]}_{datetime.now().timestamp()}@placeholder.com"
        )
        parent_phone = (
            obj_in.parent.father_phone or obj_in.parent.mother_phone or obj_in.parent.guardian_phone
        )

        # Check if parent user already exists
        existing_user_query = select(User).filter(
            User.email == parent_email, User.school_id == school_uuid
        )
        existing_user_res = await db.execute(existing_user_query)
        existing_user = existing_user_res.scalars().first()

        raw_password = None
        if not existing_user:
            raw_password = generate_random_password(8)
            hashed_pw = get_password_hash(raw_password)

            existing_user = User(
                school_id=school_uuid,
                email=parent_email,
                hashed_password=hashed_pw,
                role_id=role.id,
            )
            db.add(existing_user)
            await db.flush()  # get user id

        # 3. Create or Fetch Parent Profile
        existing_parent_query = select(Parent).filter(Parent.user_id == existing_user.id)
        existing_parent_res = await db.execute(existing_parent_query)
        existing_parent = existing_parent_res.scalars().first()

        if not existing_parent:
            parent_data = obj_in.parent.dict()
            parent_data["school_id"] = school_uuid
            parent_data["user_id"] = existing_user.id
            existing_parent = Parent(**parent_data)
            db.add(existing_parent)
            await db.flush()  # get parent id

        # 4. Generate Admission Number & Create Student User
        adm_no = await self.generate_admission_number(db, school_uuid, obj_in.academic_year_id)

        # Create Student Role
        st_role_query = select(Role).filter(Role.name == "Student", Role.school_id == school_uuid)
        st_role_res = await db.execute(st_role_query)
        st_role = st_role_res.scalars().first()
        if not st_role:
            st_role = Role(school_id=school_uuid, name="Student", permissions={})
            db.add(st_role)
            await db.flush()  # part of the caller's transaction (no mid-flow commit)

        # Create Student User with a securely generated one-time password
        student_email = f"{adm_no}@student.educore.local"
        student_raw_password = generate_random_password(8)
        student_hashed_pw = get_password_hash(student_raw_password)
        new_student_user = User(
            school_id=school_uuid,
            email=student_email,
            hashed_password=student_hashed_pw,
            role_id=st_role.id,
        )
        db.add(new_student_user)
        await db.flush()

        student_data = obj_in.dict(exclude={"parent", "medical"})
        student_data["school_id"] = school_uuid
        student_data["parent_id"] = existing_parent.id
        student_data["admission_number"] = adm_no
        student_data["user_id"] = new_student_user.id
        new_student = Student(**student_data)
        db.add(new_student)
        await db.flush()

        # 5. Create Medical Profile if provided
        if obj_in.medical:
            med_data = obj_in.medical.dict()
            med_data["school_id"] = school_uuid
            med_data["student_id"] = new_student.id
            new_med = StudentMedical(**med_data)
            db.add(new_med)

        # When commit=False the caller owns the transaction (e.g. admissions
        # convert, which commits the student + enquiry-stage update together).
        if commit:
            await db.commit()
            await db.refresh(new_student)
        else:
            await db.flush()

        # 7. Send WhatsApp Credentials (parent account + student login) — opt-in per school.
        if parent_phone:
            lines = ["Dear Parent, welcome to School ERP!"]
            if raw_password:
                lines.append(f"Parent login:\nEmail: {parent_email}\nPass: {raw_password}")
            lines.append(f"Student login:\nAdmission No: {adm_no}\nPass: {student_raw_password}")
            school = (
                (await db.execute(select(School).filter(School.id == school_uuid)))
                .scalars()
                .first()
            )
            send_whatsapp_if_enabled(school, parent_phone, "\n".join(lines))

        # Surface generated student password once for the admin UI (transient, not persisted)
        new_student.generated_password = student_raw_password
        return new_student


crud_student = CRUDStudent(Student)

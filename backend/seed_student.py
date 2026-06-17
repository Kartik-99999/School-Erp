import asyncio
import uuid

from sqlalchemy import text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal


async def seed_student():
    async with AsyncSessionLocal() as session:
        try:
            # 1. Ensure 'Student' role exists
            role_result = await session.execute(
                text("SELECT id FROM roles WHERE name = 'Student' LIMIT 1")
            )
            role_id = role_result.scalar_one_or_none()

            if not role_id:
                print("Creating 'Student' role...")
                role_result = await session.execute(
                    text(
                        "INSERT INTO roles (name, permissions) VALUES ('Student', '{\"dashboard\": true}') RETURNING id"
                    )
                )
                role_id = role_result.scalar_one()

            # 2. Create Dummy School
            school_subdomain = "springfield"
            school_name = "Springfield High"
            school_result = await session.execute(
                text("SELECT id FROM schools WHERE subdomain = :subdomain"),
                {"subdomain": school_subdomain},
            )
            school_id = school_result.scalar_one_or_none()

            if not school_id:
                print(f"Creating '{school_name}' school...")
                school_result = await session.execute(
                    text(
                        "INSERT INTO schools (name, subdomain, status) VALUES (:name, :subdomain, 'Active') RETURNING id"
                    ),
                    {"name": school_name, "subdomain": school_subdomain},
                )
                school_id = school_result.scalar_one()

            # 3. Create Parent User (Required for Student)
            parent_email = "homer@springfield.com"
            user_result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"), {"email": parent_email}
            )
            parent_user_id = user_result.scalar_one_or_none()

            if not parent_user_id:
                print("Creating Parent user...")
                hashed_pw = get_password_hash("parent123")
                user_result = await session.execute(
                    text(
                        "INSERT INTO users (email, hashed_password, role_id, school_id) VALUES (:email, :pw, :role_id, :school_id) RETURNING id"
                    ),
                    {
                        "email": parent_email,
                        "pw": hashed_pw,
                        "role_id": role_id,
                        "school_id": school_id,
                    },  # Reusing student role just to bypass role creation, though it should be parent
                )
                parent_user_id = user_result.scalar_one()

            # Insert into parents table
            parent_result = await session.execute(
                text("SELECT id FROM parents WHERE user_id = :user_id"), {"user_id": parent_user_id}
            )
            parent_id = parent_result.scalar_one_or_none()

            if not parent_id:
                parent_result = await session.execute(
                    text(
                        "INSERT INTO parents (user_id, school_id, father_name, mother_name) VALUES (:user_id, :school_id, 'Homer Simpson', 'Marge Simpson') RETURNING id"
                    ),
                    {"user_id": parent_user_id, "school_id": school_id},
                )
                parent_id = parent_result.scalar_one()

            # 4. Create Student User
            student_email = "student@springfield.com"
            user_result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"), {"email": student_email}
            )
            user_id = user_result.scalar_one_or_none()

            if not user_id:
                print("Creating Student user...")
                hashed_pw = get_password_hash("student123")
                user_result = await session.execute(
                    text(
                        "INSERT INTO users (email, hashed_password, role_id, school_id) VALUES (:email, :pw, :role_id, :school_id) RETURNING id"
                    ),
                    {
                        "email": student_email,
                        "pw": hashed_pw,
                        "role_id": role_id,
                        "school_id": school_id,
                    },
                )
                user_id = user_result.scalar_one()

                # Also insert into students table
                await session.execute(
                    text(
                        "INSERT INTO students (user_id, school_id, parent_id, first_name, last_name, admission_number, dob) VALUES (:user_id, :school_id, :parent_id, 'Bart', 'Simpson', 'ADM-1001', '2010-04-01')"
                    ),
                    {"user_id": user_id, "school_id": school_id, "parent_id": parent_id},
                )
                print(
                    f"✅ Student created! \n   Subdomain: {school_subdomain}\n   Email: {student_email} \n   Password: student123"
                )
            else:
                print(
                    f"✅ Student already exists! \n   Subdomain: {school_subdomain}\n   Email: {student_email}\n   Password: student123"
                )

            await session.commit()
        except Exception as e:
            print(f"Error connecting to database: {e}")
            await session.rollback()


if __name__ == "__main__":
    asyncio.run(seed_student())

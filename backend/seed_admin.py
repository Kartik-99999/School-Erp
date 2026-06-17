import asyncio

from sqlalchemy import text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal


async def seed_admin():
    async with AsyncSessionLocal() as session:
        try:
            # Check if Super Admin role exists
            role_result = await session.execute(
                text("SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1")
            )
            role_id = role_result.scalar_one_or_none()

            if not role_id:
                print("Creating 'Super Admin' role...")
                role_result = await session.execute(
                    text(
                        "INSERT INTO roles (name, permissions) VALUES ('Super Admin', '{\"all\": true}') RETURNING id"
                    )
                )
                role_id = role_result.scalar_one()

            # Check if admin user exists
            admin_email = "admin@educore.com"
            user_result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"), {"email": admin_email}
            )
            user_id = user_result.scalar_one_or_none()

            if not user_id:
                print("Creating Admin user...")
                hashed_pw = get_password_hash("admin123")
                await session.execute(
                    text(
                        "INSERT INTO users (email, hashed_password, role_id) VALUES (:email, :pw, :role_id)"
                    ),
                    {"email": admin_email, "pw": hashed_pw, "role_id": role_id},
                )
                print(f"✅ Admin created! \n   Email: {admin_email} \n   Password: admin123")
            else:
                print(f"✅ Admin already exists! \n   Email: {admin_email}")

            await session.commit()
        except Exception as e:
            print(f"Error connecting to database: {e}")
            print(
                "\nPlease make sure PostgreSQL is running, the 'school_erp' database exists, and the schema has been loaded from db/schema.sql!"
            )


if __name__ == "__main__":
    asyncio.run(seed_admin())

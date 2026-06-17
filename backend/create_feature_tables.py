"""Create the audit_logs + password_reset_tokens + student_documents tables
(idempotent).

Run:  cd backend && PYTHONPATH=. ./venv/bin/python create_feature_tables.py
"""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.audit import AuditLog
from app.models.auth_tokens import PasswordResetToken
from app.models.students import Student, StudentDocument  # noqa: F401 (Student is the FK target)
from app.models.users import User  # noqa: F401 (FK target for password_reset_tokens)


async def main():
    engine = create_async_engine(settings.async_database_uri)
    async with engine.begin() as conn:
        await conn.run_sync(AuditLog.__table__.create, checkfirst=True)
        await conn.run_sync(PasswordResetToken.__table__.create, checkfirst=True)
        await conn.run_sync(StudentDocument.__table__.create, checkfirst=True)
    await engine.dispose()
    print("audit_logs + password_reset_tokens + student_documents tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())

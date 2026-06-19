"""DB-backed test for PII encryption at rest (Aadhaar/APAAR/PEN).

Requires a local Postgres (auto-skips otherwise). Sets a test Fernet key, writes a
student + parent via the ORM, and asserts the RAW column holds ciphertext while the
ORM transparently decrypts — and that the API response still masks the decrypted value.
"""

import uuid
from datetime import date

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_CLEANUP = ["students", "parents"]


async def _reachable(uri: str) -> bool:
    eng = create_async_engine(uri)
    try:
        async with eng.connect() as c:
            await c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await eng.dispose()


@pytest_asyncio.fixture
async def owner_session():
    uri = settings.async_database_uri  # owner connection bypasses RLS
    if not await _reachable(uri):
        pytest.skip("DB not reachable for PII encryption test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
        await s.rollback()
        for tbl in _CLEANUP:
            await s.execute(
                text(
                    f"DELETE FROM {tbl} WHERE school_id IN "
                    "(SELECT id FROM schools WHERE subdomain LIKE 'piitest-%')"
                )
            )
        await s.execute(text("DELETE FROM schools WHERE subdomain LIKE 'piitest-%'"))
        await s.commit()
    await engine.dispose()


async def test_pii_encrypted_at_rest_and_decrypts(owner_session, monkeypatch):
    from app.models.school import School
    from app.models.students import Parent, Student

    # Force encryption on regardless of the ambient env (CI has no key set).
    monkeypatch.setattr(settings, "PII_ENCRYPTION_KEY", Fernet.generate_key().decode())

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="PII Test", subdomain=f"piitest-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    parent = Parent(school_id=school.id, father_name="P", father_aadhaar="111122223333")
    s.add(parent)
    await s.flush()
    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        first_name="A",
        last_name="B",
        dob=date(2010, 1, 1),
        aadhaar_no="123456789012",
        apaar_id="APAAR0001",
        pen_number="PEN0001",
    )
    s.add(student)
    await s.commit()

    # 1. The raw stored value is ciphertext, not the plaintext ID.
    raw_aadhaar = (
        await s.execute(text("SELECT aadhaar_no FROM students WHERE id = :i"), {"i": student.id})
    ).scalar()
    assert raw_aadhaar != "123456789012"
    assert raw_aadhaar.startswith("gAAAAA")  # Fernet token marker
    raw_parent = (
        await s.execute(text("SELECT father_aadhaar FROM parents WHERE id = :i"), {"i": parent.id})
    ).scalar()
    assert raw_parent != "111122223333"
    assert raw_parent.startswith("gAAAAA")

    # 2. The ORM transparently decrypts on read.
    await s.refresh(student)
    await s.refresh(parent)
    assert student.aadhaar_no == "123456789012"
    assert student.apaar_id == "APAAR0001"
    assert student.pen_number == "PEN0001"
    assert parent.father_aadhaar == "111122223333"

    # 3. The API response still masks the decrypted value (encryption + masking compose).
    from app.schemas.students import StudentResponse

    dumped = StudentResponse.model_validate(student).model_dump()
    assert dumped["aadhaar_no"] == "••••••••9012"

"""DB-backed test for fee-payment money math (Decimal, no float drift).

Requires a local Postgres; auto-skips otherwise (the rest of the suite is DB-less).
Uses an owner connection (RLS bypassed) to set up a tenant + due, then drives
crud_fee_payment.process_payment and asserts exact amounts + partial/paid status.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_CLEANUP_ORDER = [
    "fee_payments",
    "fee_schedules",
    "fee_receipts",
    "students",
    "parents",
    "academic_years",
]


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
        pytest.skip("DB not reachable for payment math test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
        await s.rollback()  # release any locks/pending state from a raising test
        for tbl in _CLEANUP_ORDER:
            await s.execute(
                text(
                    f"DELETE FROM {tbl} WHERE school_id IN "
                    "(SELECT id FROM schools WHERE subdomain LIKE 'paytest-%')"
                )
            )
        await s.execute(text("DELETE FROM schools WHERE subdomain LIKE 'paytest-%'"))
        await s.commit()
    await engine.dispose()


def _payment(student_id, sched_id, amount):
    from app.schemas.fees import OfflinePaymentCreate, PaymentAllocation

    return OfflinePaymentCreate(
        student_id=student_id,
        payment_mode="Cash",
        allocations=[PaymentAllocation(fee_schedule_id=sched_id, amount=amount)],
    )


async def test_process_payment_decimal_math(owner_session):
    from app.crud.crud_fees import crud_fee_payment
    from app.models.fees import FeeSchedule
    from app.models.school import School
    from app.models.setup import AcademicYear
    from app.models.students import Parent, Student

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    school = School(name="Pay Test School", subdomain=f"paytest-{suf}", status="Trial")
    ay = AcademicYear(
        school_id=None,
        name="2026-2027",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_active=True,
    )
    parent = Parent(school_id=None, father_name="Test Parent")
    s.add(school)
    await s.flush()
    ay.school_id = school.id
    parent.school_id = school.id
    s.add_all([ay, parent])
    await s.flush()
    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        first_name="Test",
        last_name="Student",
        dob=date(2010, 1, 1),
        status="Active",
    )
    s.add(student)
    await s.flush()
    sched = FeeSchedule(
        school_id=school.id,
        student_id=student.id,
        academic_year_id=ay.id,
        due_date=date(2026, 4, 10),
        base_amount=Decimal("1000.00"),
        net_due_amount=Decimal("1000.00"),
        amount_paid=Decimal("0"),
        status="Pending",
    )
    s.add(sched)
    await s.commit()

    # 1. Partial payment of 500.50 -> exact, status Partial
    r1 = await crud_fee_payment.process_payment(
        s, school.id, _payment(student.id, sched.id, Decimal("500.50"))
    )
    assert r1.total_amount == Decimal("500.50")
    await s.refresh(sched)
    assert sched.amount_paid == Decimal("500.50")
    assert sched.status == "Partial"

    # 2. Pay the exact remainder 499.50 -> fully paid, no float drift
    await crud_fee_payment.process_payment(
        s, school.id, _payment(student.id, sched.id, Decimal("499.50"))
    )
    await s.refresh(sched)
    assert sched.amount_paid == Decimal("1000.00")
    assert sched.status == "Paid"

    # 3. Any further allocation is rejected (remaining due is 0)
    with pytest.raises(ValueError):
        await crud_fee_payment.process_payment(
            s, school.id, _payment(student.id, sched.id, Decimal("0.01"))
        )
    await s.rollback()

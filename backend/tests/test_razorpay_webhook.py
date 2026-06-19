"""Razorpay async webhook.

Mocks the Razorpay client (verify_webhook_signature / order.fetch) so it runs without a
real gateway. The signature-rejection test is DB-free; the recording / idempotency / cap /
tenant tests are DB-backed and auto-skip without Postgres (matching the rest of the suite).
"""

import json
import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.main import app
from app.utils import razorpay as rzp

WEBHOOK = f"{settings.API_V1_STR}/fees/payments/online/webhook"


def _event(order_id: str, payment_id: str, amount_paise: int, event: str = "payment.captured"):
    return {
        "event": event,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": amount_paise,
                    "status": "captured",
                }
            }
        },
    }


# --------------------------------------------------------------------------- #
# signature rejection (no DB)
# --------------------------------------------------------------------------- #
def test_tampered_signature_rejected_before_db(client, monkeypatch):
    # Even with a secret configured, a signature the SDK rejects -> 400 (fail-closed),
    # and we never touch the DB (the `client` fixture's get_db is a no-op).
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test")

    def _reject(*a, **k):
        raise Exception("signature mismatch")

    monkeypatch.setattr(rzp.client.utility, "verify_webhook_signature", _reject)
    body = json.dumps(_event("order_x", "pay_x", 50000))
    r = client.post(WEBHOOK, content=body, headers={"X-Razorpay-Signature": "bad"})
    assert r.status_code == 400


def test_missing_signature_rejected(client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test")
    r = client.post(WEBHOOK, content=json.dumps(_event("o", "p", 100)))
    assert r.status_code == 400


# --------------------------------------------------------------------------- #
# DB-backed
# --------------------------------------------------------------------------- #
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
    uri = settings.async_database_uri  # owner connection (bypasses RLS for setup/asserts)
    if not await _reachable(uri):
        pytest.skip("DB not reachable for Razorpay webhook test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def seeded(owner_session):
    """A throwaway school + parent + student + one Pending due of 500. Cleaned up after."""
    from app.models.fees import FeeSchedule
    from app.models.school import School
    from app.models.setup import AcademicYear
    from app.models.students import Parent, Student

    s = owner_session
    school = School(
        name="RZP Webhook Test", subdomain=f"rzpwh-{uuid.uuid4().hex[:8]}", status="Trial"
    )
    s.add(school)
    await s.flush()
    parent = Parent(school_id=school.id, father_name="P")
    s.add(parent)
    await s.flush()
    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        first_name="Web",
        last_name="Hook",
        dob=date(2010, 1, 1),
    )
    s.add(student)
    ay = AcademicYear(
        school_id=school.id,
        name="2025-2026",
        start_date=date(2025, 4, 1),
        end_date=date(2026, 3, 31),
        is_active=True,
    )
    s.add(ay)
    await s.flush()
    sched = FeeSchedule(
        school_id=school.id,
        student_id=student.id,
        academic_year_id=ay.id,
        due_date=date.today(),
        base_amount=Decimal("500"),
        net_due_amount=Decimal("500"),
        amount_paid=Decimal("0"),
        status="Pending",
    )
    s.add(sched)
    await s.commit()

    yield {"school_id": school.id, "student_id": student.id, "schedule_id": sched.id}

    for tbl in (
        "fee_payments",
        "fee_receipts",
        "fee_schedules",
        "academic_years",
        "students",
        "parents",
    ):
        await s.execute(text(f"DELETE FROM {tbl} WHERE school_id = :sid"), {"sid": school.id})
    await s.execute(text("DELETE FROM schools WHERE id = :sid"), {"sid": school.id})
    await s.commit()


@pytest_asyncio.fixture
async def app_client():
    # Dispose the app's module-level engine after each test so the next async test
    # recreates its pool on its own event loop (avoids cross-loop reuse errors).
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


def _mock_gateway(monkeypatch, seeded, alloc_amount="500"):
    """Configure a secret, a passing signature, and an order.fetch that returns notes
    carrying the intent for the seeded schedule."""
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(rzp.client.utility, "verify_webhook_signature", lambda *a, **k: None)
    notes = {
        "school_id": str(seeded["school_id"]),
        "student_id": str(seeded["student_id"]),
        "intent": json.dumps(
            [{"fee_schedule_id": str(seeded["schedule_id"]), "amount": alloc_amount}]
        ),
    }
    monkeypatch.setattr(
        rzp.client.order, "fetch", lambda order_id: {"id": order_id, "notes": notes}
    )


async def _receipts_for(owner_session, payment_id):
    await owner_session.rollback()  # fresh snapshot (sees the webhook's committed rows)
    rows = (
        await owner_session.execute(
            text(
                "SELECT id, school_id, total_amount FROM fee_receipts WHERE transaction_reference = :p"
            ),
            {"p": payment_id},
        )
    ).all()
    return rows


async def test_webhook_records_receipt_and_pays_due(seeded, app_client, owner_session, monkeypatch):
    _mock_gateway(monkeypatch, seeded)
    pay_id = f"pay_{uuid.uuid4().hex[:10]}"
    body = json.dumps(_event("order_abc", pay_id, 50000))  # 500.00 INR captured
    r = await app_client.post(WEBHOOK, content=body, headers={"X-Razorpay-Signature": "ok"})
    assert r.status_code == 200, r.text

    rows = await _receipts_for(owner_session, pay_id)
    assert len(rows) == 1
    assert rows[0].school_id == seeded["school_id"]  # tenant derived from order notes
    assert Decimal(rows[0].total_amount) == Decimal("500")
    sched = (
        await owner_session.execute(
            text("SELECT amount_paid, status FROM fee_schedules WHERE id = :i"),
            {"i": seeded["schedule_id"]},
        )
    ).first()
    assert Decimal(sched.amount_paid) == Decimal("500")
    assert sched.status == "Paid"


async def test_webhook_is_idempotent(seeded, app_client, owner_session, monkeypatch):
    _mock_gateway(monkeypatch, seeded)
    pay_id = f"pay_{uuid.uuid4().hex[:10]}"
    body = json.dumps(_event("order_abc", pay_id, 50000))
    r1 = await app_client.post(WEBHOOK, content=body, headers={"X-Razorpay-Signature": "ok"})
    r2 = await app_client.post(WEBHOOK, content=body, headers={"X-Razorpay-Signature": "ok"})
    assert r1.status_code == 200 and r2.status_code == 200
    rows = await _receipts_for(owner_session, pay_id)
    assert len(rows) == 1  # duplicate delivery -> exactly one receipt


async def test_webhook_caps_at_captured_amount(seeded, app_client, owner_session, monkeypatch):
    # Intent allocates 500 but Razorpay only captured 100 -> rejected, no receipt.
    _mock_gateway(monkeypatch, seeded, alloc_amount="500")
    pay_id = f"pay_{uuid.uuid4().hex[:10]}"
    body = json.dumps(_event("order_abc", pay_id, 10000))  # 100.00 INR captured
    r = await app_client.post(WEBHOOK, content=body, headers={"X-Razorpay-Signature": "ok"})
    assert r.status_code == 400, r.text
    assert len(await _receipts_for(owner_session, pay_id)) == 0

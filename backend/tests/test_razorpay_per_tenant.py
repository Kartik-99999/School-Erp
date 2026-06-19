"""Per-tenant Razorpay payments.

Each school uses its OWN Razorpay credentials (encrypted at rest) and its OWN webhook at
/fees/payments/online/webhook/{school_id}. The Razorpay client is mocked (via the fees
module's get_client) so these run without a real gateway. DB-backed tests auto-skip
without Postgres.
"""

import json
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.main import app
from app.utils.razorpay import get_client

API = settings.API_V1_STR


def _event(order_id, payment_id, amount_paise, event="payment.captured"):
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
# pure logic (no DB)
# --------------------------------------------------------------------------- #
def test_get_client_requires_keys():
    import razorpay
    from fastapi import HTTPException

    assert isinstance(get_client("rzp_test_x", "secret_x"), razorpay.Client)
    for bad in [(None, None), ("", ""), ("rzp_x", ""), (None, "s")]:
        with pytest.raises(HTTPException) as ei:
            get_client(*bad)
        assert ei.value.status_code == 409


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
    uri = settings.async_database_uri
    if not await _reachable(uri):
        pytest.skip("DB not reachable for per-tenant Razorpay test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def seeded(owner_session):
    """A school WITH per-school Razorpay config + a student and a Pending due of 500."""
    from app.models.fees import FeeSchedule
    from app.models.school import School
    from app.models.setup import AcademicYear
    from app.models.students import Parent, Student

    s = owner_session
    school = School(
        name="RZP PerTenant",
        subdomain=f"rzpt-{uuid.uuid4().hex[:8]}",
        status="Trial",
        razorpay_key_id="rzp_test_school",
        razorpay_key_secret="secret_school",
        razorpay_webhook_secret="whsec_school",
        razorpay_enabled=True,
    )
    s.add(school)
    await s.flush()
    parent = Parent(school_id=school.id, father_name="P")
    s.add(parent)
    await s.flush()
    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        first_name="Per",
        last_name="Tenant",
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
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


def _mock_client(monkeypatch, notes, *, sig_valid=True):
    """Patch the fees module's get_client to return a mock Razorpay client."""
    client = MagicMock()
    client.utility.verify_webhook_signature = (
        MagicMock(return_value=None)
        if sig_valid
        else MagicMock(side_effect=Exception("bad signature"))
    )
    client.order.fetch = MagicMock(return_value={"id": "order_x", "notes": notes})
    client.payment.fetch = MagicMock(return_value={"status": "captured", "amount": 50000})
    monkeypatch.setattr("app.api.v1.endpoints.fees.get_client", lambda key_id, key_secret: client)
    return client


def _notes(school_id, student_id, schedule_id, amount="500"):
    return {
        "school_id": str(school_id),
        "student_id": str(student_id),
        "intent": json.dumps([{"fee_schedule_id": str(schedule_id), "amount": amount}]),
    }


async def _receipts(owner_session, payment_id):
    await owner_session.rollback()
    return (
        await owner_session.execute(
            text(
                "SELECT school_id, total_amount FROM fee_receipts WHERE transaction_reference = :p"
            ),
            {"p": payment_id},
        )
    ).all()


def _hook_url(school_id):
    return f"{API}/fees/payments/online/webhook/{school_id}"


async def test_school_secret_encrypted_at_rest_and_client_built(owner_session, monkeypatch):
    from app.models.school import School

    monkeypatch.setattr(settings, "PII_ENCRYPTION_KEY", Fernet.generate_key().decode())
    s = owner_session
    school = School(
        name="Enc",
        subdomain=f"rzpenc-{uuid.uuid4().hex[:8]}",
        status="Trial",
        razorpay_key_id="rzp_live_abc",
        razorpay_key_secret="super-secret-value",
        razorpay_webhook_secret="whsec-value",
        razorpay_enabled=True,
    )
    s.add(school)
    await s.commit()
    try:
        raw = (
            await s.execute(
                text("SELECT razorpay_key_secret FROM schools WHERE id = :i"), {"i": school.id}
            )
        ).scalar()
        assert raw != "super-secret-value"
        assert raw.startswith("gAAAAA")  # Fernet ciphertext
        await s.refresh(school)
        assert school.razorpay_key_secret == "super-secret-value"  # ORM decrypts
        import razorpay

        assert isinstance(
            get_client(school.razorpay_key_id, school.razorpay_key_secret), razorpay.Client
        )
    finally:
        await s.execute(text("DELETE FROM schools WHERE id = :i"), {"i": school.id})
        await s.commit()


async def test_webhook_records_with_school_secret(seeded, app_client, owner_session, monkeypatch):
    notes = _notes(seeded["school_id"], seeded["student_id"], seeded["schedule_id"])
    _mock_client(monkeypatch, notes, sig_valid=True)
    pay = f"pay_{uuid.uuid4().hex[:10]}"
    r = await app_client.post(
        _hook_url(seeded["school_id"]),
        content=json.dumps(_event("order_x", pay, 50000)),
        headers={"X-Razorpay-Signature": "ok"},
    )
    assert r.status_code == 200, r.text
    rows = await _receipts(owner_session, pay)
    assert len(rows) == 1
    assert rows[0].school_id == seeded["school_id"]
    assert Decimal(rows[0].total_amount) == Decimal("500")


async def test_webhook_tampered_signature_rejected(seeded, app_client, owner_session, monkeypatch):
    notes = _notes(seeded["school_id"], seeded["student_id"], seeded["schedule_id"])
    _mock_client(monkeypatch, notes, sig_valid=False)
    pay = f"pay_{uuid.uuid4().hex[:10]}"
    r = await app_client.post(
        _hook_url(seeded["school_id"]),
        content=json.dumps(_event("order_x", pay, 50000)),
        headers={"X-Razorpay-Signature": "tampered"},
    )
    assert r.status_code == 400, r.text
    assert len(await _receipts(owner_session, pay)) == 0


async def test_webhook_unknown_school_404(owner_session, app_client):
    r = await app_client.post(
        _hook_url(uuid.uuid4()),
        content=json.dumps(_event("order_x", "pay_x", 50000)),
        headers={"X-Razorpay-Signature": "ok"},
    )
    assert r.status_code == 404, r.text


async def test_webhook_idempotent(seeded, app_client, owner_session, monkeypatch):
    notes = _notes(seeded["school_id"], seeded["student_id"], seeded["schedule_id"])
    _mock_client(monkeypatch, notes, sig_valid=True)
    pay = f"pay_{uuid.uuid4().hex[:10]}"
    body = json.dumps(_event("order_x", pay, 50000))
    r1 = await app_client.post(
        _hook_url(seeded["school_id"]), content=body, headers={"X-Razorpay-Signature": "ok"}
    )
    r2 = await app_client.post(
        _hook_url(seeded["school_id"]), content=body, headers={"X-Razorpay-Signature": "ok"}
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert len(await _receipts(owner_session, pay)) == 1


async def test_webhook_caps_at_captured(seeded, app_client, owner_session, monkeypatch):
    notes = _notes(seeded["school_id"], seeded["student_id"], seeded["schedule_id"], amount="500")
    _mock_client(monkeypatch, notes, sig_valid=True)
    pay = f"pay_{uuid.uuid4().hex[:10]}"
    r = await app_client.post(
        _hook_url(seeded["school_id"]),
        content=json.dumps(_event("order_x", pay, 10000)),  # only 100.00 captured
        headers={"X-Razorpay-Signature": "ok"},
    )
    assert r.status_code == 400, r.text
    assert len(await _receipts(owner_session, pay)) == 0


async def test_webhook_rejects_order_from_other_school(
    seeded, app_client, owner_session, monkeypatch
):
    # notes carry a DIFFERENT school_id than the path -> recorder rejects (no cross-tenant).
    notes = _notes(uuid.uuid4(), seeded["student_id"], seeded["schedule_id"])
    _mock_client(monkeypatch, notes, sig_valid=True)
    pay = f"pay_{uuid.uuid4().hex[:10]}"
    r = await app_client.post(
        _hook_url(seeded["school_id"]),
        content=json.dumps(_event("order_x", pay, 50000)),
        headers={"X-Razorpay-Signature": "ok"},
    )
    assert r.status_code == 400, r.text
    assert len(await _receipts(owner_session, pay)) == 0

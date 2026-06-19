"""Per-school fee options: external payment URL + bank transfer (display/redirect only).

Pure validator tests (no DB) + DB-backed settings round-trip / 422 rejection /
parent-facing payment-options reflection (httpx over the ASGI app; auto-skip without PG).
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.main import app
from app.utils import validators as v

API = settings.API_V1_STR


# --------------------------------------------------------------------------- #
# pure validators (no DB)
# --------------------------------------------------------------------------- #
def test_clean_ifsc():
    assert v.clean_ifsc("hdfc0001234") == "HDFC0001234"  # upper-normalized
    assert v.clean_ifsc("HDFC0001234") == "HDFC0001234"
    assert v.clean_ifsc(None) is None
    assert v.clean_ifsc("   ") is None
    for bad in ["HDFC1001234", "HDF0001234", "HDFC0001", "1234000ABCD", "HDFC0001234X"]:
        with pytest.raises(ValueError):
            v.clean_ifsc(bad)


def test_clean_bank_account():
    assert v.clean_bank_account("123456789") == "123456789"  # 9 digits ok
    assert v.clean_bank_account("1234 5678 9012") == "123456789012"  # spaces stripped
    assert v.clean_bank_account(None) is None
    assert v.clean_bank_account("") is None
    for bad in ["12345678", "1" * 19, "12345678a", "abcdefghi"]:
        with pytest.raises(ValueError):
            v.clean_bank_account(bad)


def test_clean_external_url():
    assert v.clean_external_url("https://pay.school.edu/fees") == "https://pay.school.edu/fees"
    assert v.clean_external_url("http://x.com") == "http://x.com"
    assert v.clean_external_url(None) is None
    assert v.clean_external_url("") is None
    for bad in ["ftp://x.com", "notaurl", "javascript:alert(1)", "://nohost"]:
        with pytest.raises(ValueError):
            v.clean_external_url(bad)


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
        pytest.skip("DB not reachable for fee-options test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def admin(owner_session):
    """A throwaway school + School Admin user; yields login creds + school_id."""
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    school = School(name="FeeOpt", subdomain=f"feeopt-{uuid.uuid4().hex[:8]}", status="Trial")
    s.add(school)
    await s.flush()
    role = Role(school_id=school.id, name="School Admin", permissions={"all": True})
    s.add(role)
    await s.flush()
    email = f"feeopt-{uuid.uuid4().hex[:8]}@example.com"
    password = "Sup3r!pass"
    user = User(
        school_id=school.id,
        email=email,
        hashed_password=get_password_hash(password),
        role_id=role.id,
        is_active=True,
    )
    s.add(user)
    await s.commit()
    yield {"email": email, "password": password, "school_id": school.id}
    await s.execute(text("DELETE FROM users WHERE school_id = :s"), {"s": school.id})
    await s.execute(text("DELETE FROM roles WHERE school_id = :s"), {"s": school.id})
    await s.execute(text("DELETE FROM schools WHERE id = :s"), {"s": school.id})
    await s.commit()


@pytest_asyncio.fixture
async def app_client():
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


async def _auth(ac, admin):
    tok = (
        await ac.post(
            f"{API}/auth/login", data={"username": admin["email"], "password": admin["password"]}
        )
    ).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


async def test_fee_options_roundtrip(admin, app_client):
    h = await _auth(app_client, admin)
    body = {
        "external_payment_enabled": True,
        "external_payment_url": "https://pay.feeopt.edu/portal",
        "bank_transfer_enabled": True,
        "bank_name": "State Bank",
        "bank_account_number": "1234 5678 9012",
        "bank_ifsc": "sbin0001234",
        "bank_branch": "MG Road",
        "bank_account_holder": "FeeOpt School Trust",
        "bank_upi_id": "feeopt@sbi",
    }
    r = await app_client.put(f"{API}/settings/fee-options", headers=h, json=body)
    assert r.status_code == 200, r.text
    data = (await app_client.get(f"{API}/settings/fee-options", headers=h)).json()["data"]
    assert data["external_payment_enabled"] is True
    assert data["external_payment_url"] == "https://pay.feeopt.edu/portal"
    assert data["bank_transfer_enabled"] is True
    assert data["bank_account_number"] == "123456789012"  # normalized
    assert data["bank_ifsc"] == "SBIN0001234"  # upper-normalized


async def test_fee_options_reject_bad(admin, app_client):
    h = await _auth(app_client, admin)
    for bad in [
        {"bank_ifsc": "BADIFSC"},
        {"bank_account_number": "12"},
        {"external_payment_url": "notaurl"},
    ]:
        r = await app_client.put(f"{API}/settings/fee-options", headers=h, json=bad)
        assert r.status_code == 422, (bad, r.text)


async def test_payment_options_reflects_enabled(admin, app_client):
    h = await _auth(app_client, admin)
    await app_client.put(
        f"{API}/settings/fee-options",
        headers=h,
        json={
            "external_payment_enabled": True,
            "external_payment_url": "https://pay.feeopt.edu/portal",
            "bank_transfer_enabled": True,
            "bank_name": "State Bank",
            "bank_ifsc": "SBIN0001234",
        },
    )
    opts = (await app_client.get(f"{API}/fees/payment-options", headers=h)).json()["data"]
    assert opts["razorpay"]["enabled"] is False  # no keys configured
    assert opts["external"]["enabled"] is True
    assert opts["external"]["url"] == "https://pay.feeopt.edu/portal"
    assert opts["bank"]["enabled"] is True
    assert opts["bank"]["ifsc"] == "SBIN0001234"

"""DB-backed tests for parent-teacher appointments. Auto-skip without Postgres."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.main import app

API = settings.API_V1_STR


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
        pytest.skip("DB not reachable for appointments test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def env(owner_session):
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.staff import Staff
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    a = School(name="ApptA", subdomain=f"appta-{suf}", status="Trial")
    s.add(a)
    await s.flush()
    trole = Role(school_id=a.id, name="Teacher", permissions={})
    prole = Role(school_id=a.id, name="Parent", permissions={})
    s.add_all([trole, prole])
    await s.flush()
    te, tp = f"t-{suf}@example.com", "Teach3r!a"
    tuser = User(
        school_id=a.id,
        email=te,
        hashed_password=get_password_hash(tp),
        role_id=trole.id,
        is_active=True,
    )
    pe, pp = f"p-{suf}@example.com", "Par3nt!a"
    puser = User(
        school_id=a.id,
        email=pe,
        hashed_password=get_password_hash(pp),
        role_id=prole.id,
        is_active=True,
    )
    s.add_all([tuser, puser])
    await s.flush()
    staff = Staff(school_id=a.id, user_id=tuser.id, first_name="Asha", last_name="Rao")
    s.add(staff)
    await s.flush()

    # second school's parent (tenant isolation)
    b = School(name="ApptB", subdomain=f"apptb-{suf}", status="Trial")
    s.add(b)
    await s.flush()
    prole_b = Role(school_id=b.id, name="Parent", permissions={})
    s.add(prole_b)
    await s.flush()
    pe_b, pp_b = f"pb-{suf}@example.com", "Par3nt!b"
    puser_b = User(
        school_id=b.id,
        email=pe_b,
        hashed_password=get_password_hash(pp_b),
        role_id=prole_b.id,
        is_active=True,
    )
    s.add(puser_b)
    await s.commit()

    yield {
        "t_email": te,
        "t_pw": tp,
        "p_email": pe,
        "p_pw": pp,
        "pb_email": pe_b,
        "pb_pw": pp_b,
        "a_id": a.id,
        "b_id": b.id,
    }

    for tbl in ("appointments", "appointment_slots", "staff", "users", "roles"):
        await s.execute(
            text(f"DELETE FROM {tbl} WHERE school_id IN (:a, :b)"), {"a": a.id, "b": b.id}
        )
    await s.execute(text("DELETE FROM schools WHERE id IN (:a, :b)"), {"a": a.id, "b": b.id})
    await s.commit()


@pytest_asyncio.fixture
async def app_client():
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


async def _token(ac, email, pw):
    r = await ac.post(f"{API}/auth/login", data={"username": email, "password": pw})
    return r.json().get("access_token")


async def test_appointment_flow(env, app_client):
    th = {"Authorization": f"Bearer {await _token(app_client, env['t_email'], env['t_pw'])}"}
    ph = {"Authorization": f"Bearer {await _token(app_client, env['p_email'], env['p_pw'])}"}

    start = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=1, minutes=30)).isoformat()

    # teacher creates a slot; bad window rejected
    bad = await app_client.post(
        f"{API}/appointments/slots", headers=th, json={"start_time": end, "end_time": start}
    )
    assert bad.status_code == 400, bad.text
    made = await app_client.post(
        f"{API}/appointments/slots", headers=th, json={"start_time": start, "end_time": end}
    )
    assert made.status_code == 200, made.text
    slot_id = made.json()["data"]["id"]

    # parent sees the open slot (with teacher name)
    slots = (await app_client.get(f"{API}/appointments/slots", headers=ph)).json()["data"]
    mine = [s for s in slots if s["id"] == slot_id]
    assert len(mine) == 1 and mine[0]["teacher_name"] == "Asha Rao"

    # parent books it
    booked = await app_client.post(
        f"{API}/appointments", headers=ph, json={"slot_id": slot_id, "note": "Discuss progress"}
    )
    assert booked.status_code == 200, booked.text

    # double-book rejected
    again = await app_client.post(f"{API}/appointments", headers=ph, json={"slot_id": slot_id})
    assert again.status_code == 409, again.text

    # the slot is no longer offered
    slots2 = (await app_client.get(f"{API}/appointments/slots", headers=ph)).json()["data"]
    assert all(s["id"] != slot_id for s in slots2)

    # parent + teacher both see the appointment
    p_me = (await app_client.get(f"{API}/appointments/me", headers=ph)).json()["data"]
    assert len(p_me) == 1 and p_me[0]["teacher_name"] == "Asha Rao"
    t_me = (await app_client.get(f"{API}/appointments/me", headers=th)).json()["data"]
    assert len(t_me) == 1


async def test_appointments_tenant_isolation(env, app_client):
    th = {"Authorization": f"Bearer {await _token(app_client, env['t_email'], env['t_pw'])}"}
    start = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=2, minutes=30)).isoformat()
    slot_id = (
        await app_client.post(
            f"{API}/appointments/slots", headers=th, json={"start_time": start, "end_time": end}
        )
    ).json()["data"]["id"]

    pbh = {"Authorization": f"Bearer {await _token(app_client, env['pb_email'], env['pb_pw'])}"}
    # school B parent can't see school A's slot
    slots = (await app_client.get(f"{API}/appointments/slots", headers=pbh)).json()["data"]
    assert all(s["id"] != slot_id for s in slots)
    # nor book it
    r = await app_client.post(f"{API}/appointments", headers=pbh, json={"slot_id": slot_id})
    assert r.status_code == 404, r.text

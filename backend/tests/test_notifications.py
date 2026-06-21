"""DB-backed tests for notifications: device register (idempotent), per-user list
isolation, and notice -> notification fan-out. Auto-skip without Postgres.
"""

import uuid

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
        pytest.skip("DB not reachable for notifications test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def env(owner_session):
    from app.core.security import get_password_hash
    from app.models.notifications import Notification
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="NotifSch", subdomain=f"notif-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    arole = Role(school_id=school.id, name="School Admin", permissions={"all": True})
    prole = Role(school_id=school.id, name="Parent", permissions={})
    s.add_all([arole, prole])
    await s.flush()
    ae, ap = f"adm-{suf}@example.com", "Adm1n!pass"
    auser = User(school_id=school.id, email=ae, hashed_password=get_password_hash(ap), role_id=arole.id, is_active=True)
    pe, pp = f"par-{suf}@example.com", "Par3nt!pass"
    puser = User(school_id=school.id, email=pe, hashed_password=get_password_hash(pp), role_id=prole.id, is_active=True)
    s.add_all([auser, puser])
    await s.flush()
    # Seed: 2 notifications for the parent, 1 for the admin
    s.add_all([
        Notification(school_id=school.id, user_id=puser.id, title="Fees due", body="Term 2", type="fee"),
        Notification(school_id=school.id, user_id=puser.id, title="Absent today", body="Marked absent", type="absence"),
        Notification(school_id=school.id, user_id=auser.id, title="Admin note", body="x", type="general"),
    ])
    await s.commit()

    yield {"a_email": ae, "a_pw": ap, "p_email": pe, "p_pw": pp, "school_id": school.id}

    for tbl in ("notifications", "device_tokens", "notices", "users", "roles"):
        await s.execute(text(f"DELETE FROM {tbl} WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM schools WHERE id=:s"), {"s": school.id})
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


async def test_list_is_per_user(env, app_client):
    ph = {"Authorization": f"Bearer {await _token(app_client, env['p_email'], env['p_pw'])}"}
    ah = {"Authorization": f"Bearer {await _token(app_client, env['a_email'], env['a_pw'])}"}
    p_list = (await app_client.get(f"{API}/notifications", headers=ph)).json()["data"]
    a_list = (await app_client.get(f"{API}/notifications", headers=ah)).json()["data"]
    assert len(p_list) == 2
    assert len(a_list) == 1
    assert {n["type"] for n in p_list} == {"fee", "absence"}


async def test_register_device_idempotent(env, app_client, owner_session):
    ph = {"Authorization": f"Bearer {await _token(app_client, env['p_email'], env['p_pw'])}"}
    tok = f"ExponentPushToken[{uuid.uuid4().hex}]"
    for _ in range(2):
        r = await app_client.post(f"{API}/notifications/register-device", headers=ph, json={"expo_push_token": tok})
        assert r.status_code == 200, r.text
    n = (await owner_session.execute(text("SELECT count(*) FROM device_tokens WHERE expo_push_token=:t"), {"t": tok})).scalar()
    assert n == 1


async def test_notice_fans_out_to_parents(env, app_client):
    ah = {"Authorization": f"Bearer {await _token(app_client, env['a_email'], env['a_pw'])}"}
    ph = {"Authorization": f"Bearer {await _token(app_client, env['p_email'], env['p_pw'])}"}
    # Admin posts a notice targeted at Parents
    r = await app_client.post(
        f"{API}/communication/notices",
        headers=ah,
        json={"title": "PTM Saturday", "body": "Please attend.", "target_audience": "Parents", "category": "Notice"},
    )
    assert r.status_code == 200, r.text
    # Parent now has a 'notice' notification for it (2 seeded + 1 fanned)
    p_list = (await app_client.get(f"{API}/notifications", headers=ph)).json()["data"]
    notice_notifs = [n for n in p_list if n["type"] == "notice" and n["title"] == "PTM Saturday"]
    assert len(notice_notifs) == 1
    assert notice_notifs[0]["ref_id"]

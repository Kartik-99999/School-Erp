"""DB-backed tests for authenticated self-service change-password. Auto-skip without PG."""

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
        pytest.skip("DB not reachable for change-password test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def user(owner_session):
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="PwTest", subdomain=f"pwtest-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    role = Role(school_id=school.id, name="School Admin", permissions={"all": True})
    s.add(role)
    await s.flush()
    email = f"pw-{suf}@example.com"
    password = "OldPass123"
    u = User(
        school_id=school.id,
        email=email,
        hashed_password=get_password_hash(password),
        role_id=role.id,
        is_active=True,
    )
    s.add(u)
    await s.commit()
    yield {"email": email, "password": password, "school_id": school.id}
    await s.execute(text("DELETE FROM users WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM roles WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM schools WHERE id=:s"), {"s": school.id})
    await s.commit()


@pytest_asyncio.fixture
async def app_client():
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


async def _token(ac, email, password):
    r = await ac.post(f"{API}/auth/login", data={"username": email, "password": password})
    return r.json().get("access_token")


async def test_change_password_flow(user, app_client):
    tok = await _token(app_client, user["email"], user["password"])
    h = {"Authorization": f"Bearer {tok}"}
    # too short
    r_short = await app_client.post(
        f"{API}/auth/change-password",
        headers=h,
        json={"current_password": user["password"], "new_password": "x1"},
    )
    assert r_short.status_code == 400, r_short.text
    # wrong current
    r_wrong = await app_client.post(
        f"{API}/auth/change-password",
        headers=h,
        json={"current_password": "nope", "new_password": "Brand0New!"},
    )
    assert r_wrong.status_code == 400, r_wrong.text
    # happy path
    r_ok = await app_client.post(
        f"{API}/auth/change-password",
        headers=h,
        json={"current_password": user["password"], "new_password": "Brand0New!"},
    )
    assert r_ok.status_code == 200, r_ok.text
    # old password no longer works; new one does
    assert await _token(app_client, user["email"], user["password"]) is None
    assert await _token(app_client, user["email"], "Brand0New!")


async def test_change_password_requires_auth(app_client):
    r = await app_client.post(
        f"{API}/auth/change-password", json={"current_password": "a", "new_password": "Brand0New!"}
    )
    assert r.status_code == 401, r.text

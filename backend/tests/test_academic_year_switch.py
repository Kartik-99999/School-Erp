"""DB-backed tests for per-user active academic-year set/get. Auto-skip without PG."""

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
        pytest.skip("DB not reachable for academic-year test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def setup(owner_session):
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="YrTest", subdomain=f"yrtest-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    role = Role(school_id=school.id, name="School Admin", permissions={"all": True})
    s.add(role)
    await s.flush()
    email = f"yr-{suf}@example.com"
    password = "YrPass123"
    u = User(
        school_id=school.id,
        email=email,
        hashed_password=get_password_hash(password),
        role_id=role.id,
        is_active=True,
    )
    s.add(u)
    await s.flush()
    yr_id = (
        await s.execute(
            text(
                "INSERT INTO academic_years (school_id, name, start_date, end_date) "
                "VALUES (:s, '2026-27', '2026-04-01', '2027-03-31') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    await s.commit()
    yield {"email": email, "password": password, "school_id": school.id, "year_id": str(yr_id)}
    await s.execute(text("DELETE FROM academic_years WHERE school_id=:s"), {"s": school.id})
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


async def test_active_year_set_get_and_validation(setup, app_client):
    tok = await _token(app_client, setup["email"], setup["password"])
    h = {"Authorization": f"Bearer {tok}"}
    # initially unset
    r0 = await app_client.get(f"{API}/academic-years/active", headers=h)
    assert r0.status_code == 200, r0.text
    assert r0.json()["data"]["active_academic_year_id"] is None
    # list includes the year
    rl = await app_client.get(f"{API}/academic-years/", headers=h)
    assert any(y["id"] == setup["year_id"] for y in rl.json()["data"])
    # set a valid year
    rs = await app_client.put(
        f"{API}/academic-years/active", headers=h, json={"academic_year_id": setup["year_id"]}
    )
    assert rs.status_code == 200, rs.text
    # get reflects it
    r1 = await app_client.get(f"{API}/academic-years/active", headers=h)
    assert r1.json()["data"]["active_academic_year_id"] == setup["year_id"]
    # an unknown / cross-school year is rejected
    rb = await app_client.put(
        f"{API}/academic-years/active", headers=h, json={"academic_year_id": str(uuid.uuid4())}
    )
    assert rb.status_code == 404, rb.text

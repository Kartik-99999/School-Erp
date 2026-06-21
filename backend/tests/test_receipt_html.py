"""Guard tests for the Android-safe HTML receipt endpoint: requires auth and is
tenant-scoped (unknown/other-school receipt -> 404). Auto-skip without Postgres.
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
        pytest.skip("DB not reachable for receipt-html test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def admin(owner_session):
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="RcptSch", subdomain=f"rcpt-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    role = Role(school_id=school.id, name="School Admin", permissions={"all": True})
    s.add(role)
    await s.flush()
    email, pw = f"rcpt-{suf}@example.com", "Adm1n!pass"
    s.add(User(school_id=school.id, email=email, hashed_password=get_password_hash(pw), role_id=role.id, is_active=True))
    await s.commit()
    yield {"email": email, "pw": pw, "school_id": school.id}
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


async def test_receipt_html_requires_auth(app_client):
    r = await app_client.get(f"{API}/fees/receipts/{uuid.uuid4()}/html")
    assert r.status_code == 401, r.text


async def test_receipt_html_unknown_is_404(admin, app_client):
    tok = (await app_client.post(f"{API}/auth/login", data={"username": admin["email"], "password": admin["pw"]})).json()["access_token"]
    r = await app_client.get(f"{API}/fees/receipts/{uuid.uuid4()}/html", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 404, r.text

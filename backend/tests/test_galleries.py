"""DB-backed tests for galleries: list (count/cover), detail photos, tenant scope.
Auto-skip without Postgres.
"""

import uuid
from datetime import date

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
        pytest.skip("DB not reachable for galleries test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def env(owner_session):
    from app.core.security import get_password_hash
    from app.models.communication import Gallery, GalleryPhoto
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    a = School(name="GalA", subdomain=f"gala-{suf}", status="Trial")
    s.add(a)
    await s.flush()
    ra = Role(school_id=a.id, name="Student", permissions={})
    s.add(ra)
    await s.flush()
    ea, pa = f"ga-{suf}@example.com", "Stud3nt!a"
    ua = User(school_id=a.id, email=ea, hashed_password=get_password_hash(pa), role_id=ra.id, is_active=True)
    s.add(ua)
    await s.flush()
    g = Gallery(school_id=a.id, title="Sports Day", target_audience="All", is_published=True, event_date=date(2026, 6, 1))
    s.add(g)
    await s.flush()
    p1 = GalleryPhoto(school_id=a.id, gallery_id=g.id, image_url="https://img/1.jpg", position=0)
    p2 = GalleryPhoto(school_id=a.id, gallery_id=g.id, image_url="https://img/2.jpg", position=1)
    s.add_all([p1, p2])
    await s.flush()

    b = School(name="GalB", subdomain=f"galb-{suf}", status="Trial")
    s.add(b)
    await s.flush()
    rb = Role(school_id=b.id, name="Student", permissions={})
    s.add(rb)
    await s.flush()
    eb, pb = f"gb-{suf}@example.com", "Stud3nt!b"
    ub = User(school_id=b.id, email=eb, hashed_password=get_password_hash(pb), role_id=rb.id, is_active=True)
    s.add(ub)
    await s.commit()

    yield {"a_email": ea, "a_pw": pa, "b_email": eb, "b_pw": pb, "gallery_id": str(g.id), "a_id": a.id, "b_id": b.id}

    for tbl in ("gallery_photos", "galleries", "users", "roles"):
        await s.execute(text(f"DELETE FROM {tbl} WHERE school_id IN (:a, :b)"), {"a": a.id, "b": b.id})
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


async def test_galleries_list_and_detail(env, app_client):
    ta = await _token(app_client, env["a_email"], env["a_pw"])
    ha = {"Authorization": f"Bearer {ta}"}
    gals = (await app_client.get(f"{API}/communication/galleries", headers=ha)).json()["data"]
    mine = [g for g in gals if g["id"] == env["gallery_id"]]
    assert len(mine) == 1
    assert mine[0]["photo_count"] == 2
    assert mine[0]["cover_url"] == "https://img/1.jpg"  # falls back to first photo
    detail = (await app_client.get(f"{API}/communication/galleries/{env['gallery_id']}", headers=ha)).json()["data"]
    assert len(detail["photos"]) == 2
    assert detail["photos"][0]["image_url"] == "https://img/1.jpg"


async def test_galleries_tenant_isolation(env, app_client):
    tb = await _token(app_client, env["b_email"], env["b_pw"])
    hb = {"Authorization": f"Bearer {tb}"}
    gals = (await app_client.get(f"{API}/communication/galleries", headers=hb)).json()["data"]
    assert all(g["id"] != env["gallery_id"] for g in gals)
    r = await app_client.get(f"{API}/communication/galleries/{env['gallery_id']}", headers=hb)
    assert r.status_code == 404, r.text

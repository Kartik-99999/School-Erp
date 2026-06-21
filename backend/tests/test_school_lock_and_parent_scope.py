"""DB-backed tests for the white-label login lock (X-School-Code header) and the
parent -> own-child access scoping on the student portal. Auto-skip without Postgres.
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
        pytest.skip("DB not reachable for school-lock/parent-scope test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def graph(owner_session):
    """A school + a Parent user with one child, plus a second parent's child (to prove
    cross-child reads are blocked)."""
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.students import Parent, Student
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]
    school = School(name="LockTest", subdomain=f"locktest-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    prole = Role(school_id=school.id, name="Parent", permissions={})
    s.add(prole)
    await s.flush()

    email = f"parent-{suf}@example.com"
    password = "Par3nt!pass"
    puser = User(
        school_id=school.id,
        email=email,
        hashed_password=get_password_hash(password),
        role_id=prole.id,
        is_active=True,
    )
    s.add(puser)
    await s.flush()
    parent = Parent(school_id=school.id, user_id=puser.id, father_name="Mr. A")
    s.add(parent)
    await s.flush()
    child = Student(
        school_id=school.id, parent_id=parent.id, first_name="Aarav", last_name="A", dob=date(2014, 1, 1)
    )
    s.add(child)
    await s.flush()

    parent2 = Parent(school_id=school.id, father_name="Mr. B")
    s.add(parent2)
    await s.flush()
    other = Student(
        school_id=school.id, parent_id=parent2.id, first_name="Bina", last_name="B", dob=date(2014, 2, 2)
    )
    s.add(other)
    await s.flush()
    await s.commit()

    yield {
        "subdomain": school.subdomain,
        "school_id": school.id,
        "email": email,
        "password": password,
        "child_id": str(child.id),
        "other_id": str(other.id),
    }

    await s.execute(text("DELETE FROM students WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM parents WHERE school_id=:s"), {"s": school.id})
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


async def test_login_rejects_wrong_school_code(graph, app_client):
    # An account from a different school is rejected before any token is issued.
    r = await app_client.post(
        f"{API}/auth/login",
        data={"username": graph["email"], "password": graph["password"]},
        headers={"X-School-Code": "someoneelse"},
    )
    assert r.status_code == 403, r.text
    # The correct school code logs in.
    r2 = await app_client.post(
        f"{API}/auth/login",
        data={"username": graph["email"], "password": graph["password"]},
        headers={"X-School-Code": graph["subdomain"]},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json().get("access_token")


async def _parent_token(ac, graph):
    r = await ac.post(
        f"{API}/auth/login",
        data={"username": graph["email"], "password": graph["password"]},
        headers={"X-School-Code": graph["subdomain"]},
    )
    return r.json()["access_token"]


async def test_parent_scope_on_portal_fees(graph, app_client):
    tok = await _parent_token(app_client, graph)
    h = {"Authorization": f"Bearer {tok}"}
    # Own child -> 200
    r_own = await app_client.get(f"{API}/student-portal/fees?student_id={graph['child_id']}", headers=h)
    assert r_own.status_code == 200, r_own.text
    # Another parent's child -> 403
    r_other = await app_client.get(f"{API}/student-portal/fees?student_id={graph['other_id']}", headers=h)
    assert r_other.status_code == 403, r_other.text
    # Parent without student_id -> 400
    r_none = await app_client.get(f"{API}/student-portal/fees", headers=h)
    assert r_none.status_code == 400, r_none.text

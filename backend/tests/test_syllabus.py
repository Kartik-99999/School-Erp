"""DB-backed tests for the read-only syllabus/lesson-planner portal view.
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
        pytest.skip("DB not reachable for syllabus test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def env(owner_session):
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.students import Parent, Student
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    school = School(name="SylSch", subdomain=f"syl-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    srole = Role(school_id=school.id, name="Student", permissions={})
    prole = Role(school_id=school.id, name="Parent", permissions={})
    s.add_all([srole, prole])
    await s.flush()

    se, sp = f"syl-stu-{suf}@example.com", "Stud3nt!x"
    suser = User(
        school_id=school.id,
        email=se,
        hashed_password=get_password_hash(sp),
        role_id=srole.id,
        is_active=True,
    )
    pe, pp = f"syl-par-{suf}@example.com", "Par3nt!x"
    puser = User(
        school_id=school.id,
        email=pe,
        hashed_password=get_password_hash(pp),
        role_id=prole.id,
        is_active=True,
    )
    s.add_all([suser, puser])
    await s.flush()
    parent = Parent(school_id=school.id, user_id=puser.id, father_name="Mr P")
    s.add(parent)
    await s.flush()

    year_id = (
        await s.execute(
            text(
                "INSERT INTO academic_years (school_id, name, start_date, end_date) "
                "VALUES (:s, '2026-27', '2026-04-01', '2027-03-31') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    class_id = (
        await s.execute(
            text(
                "INSERT INTO classes (school_id, name, numeric_value) VALUES (:s, 'VIII', 8) RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    section_id = (
        await s.execute(
            text(
                "INSERT INTO sections (school_id, class_id, name) VALUES (:s, :c, 'A') RETURNING id"
            ),
            {"s": school.id, "c": class_id},
        )
    ).scalar()
    subject_id = (
        await s.execute(
            text(
                "INSERT INTO subjects (school_id, name, code, type) VALUES (:s, 'Mathematics', 'MATH', 'Core') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()

    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        user_id=suser.id,
        first_name="Aarav",
        last_name="A",
        dob=date(2014, 1, 1),
        current_class_id=class_id,
        current_section_id=section_id,
    )
    s.add(student)
    await s.flush()

    ch1 = (
        await s.execute(
            text(
                "INSERT INTO syllabus_chapters (school_id, academic_year_id, class_id, subject_id, chapter_name, order_index) "
                "VALUES (:s, :y, :c, :sub, 'Algebra Basics', 0) RETURNING id"
            ),
            {"s": school.id, "y": year_id, "c": class_id, "sub": subject_id},
        )
    ).scalar()
    await s.execute(
        text(
            "INSERT INTO syllabus_chapters (school_id, academic_year_id, class_id, subject_id, chapter_name, order_index) "
            "VALUES (:s, :y, :c, :sub, 'Linear Equations', 1)"
        ),
        {"s": school.id, "y": year_id, "c": class_id, "sub": subject_id},
    )
    # Mark chapter 1 complete for this section
    await s.execute(
        text(
            "INSERT INTO syllabus_progress (school_id, chapter_id, section_id, completion_date) "
            "VALUES (:s, :ch, :sec, '2026-06-01')"
        ),
        {"s": school.id, "ch": ch1, "sec": section_id},
    )
    await s.commit()

    yield {
        "s_email": se,
        "s_pw": sp,
        "p_email": pe,
        "p_pw": pp,
        "student_id": str(student.id),
        "school_id": school.id,
    }

    for tbl in ("syllabus_progress",):
        await s.execute(text("DELETE FROM syllabus_progress WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM syllabus_chapters WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM students WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM parents WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM users WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM sections WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM subjects WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM classes WHERE school_id=:s"), {"s": school.id})
    await s.execute(text("DELETE FROM academic_years WHERE school_id=:s"), {"s": school.id})
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


async def _token(ac, email, pw):
    r = await ac.post(f"{API}/auth/login", data={"username": email, "password": pw})
    return r.json().get("access_token")


async def test_student_sees_own_syllabus_progress(env, app_client):
    tok = await _token(app_client, env["s_email"], env["s_pw"])
    h = {"Authorization": f"Bearer {tok}"}
    data = (await app_client.get(f"{API}/student-portal/syllabus", headers=h)).json()["data"]
    assert data["overall"]["total"] == 2
    assert data["overall"]["completed"] == 1
    assert data["overall"]["percent"] == 50
    assert len(data["subjects"]) == 1
    assert data["subjects"][0]["subject_name"] == "Mathematics"


async def test_parent_child_scope_on_syllabus(env, app_client):
    tok = await _token(app_client, env["p_email"], env["p_pw"])
    h = {"Authorization": f"Bearer {tok}"}
    # own child
    r_own = await app_client.get(
        f"{API}/student-portal/syllabus?student_id={env['student_id']}", headers=h
    )
    assert r_own.status_code == 200, r_own.text
    assert r_own.json()["data"]["overall"]["percent"] == 50
    # unknown / not-their child
    r_other = await app_client.get(
        f"{API}/student-portal/syllabus?student_id={uuid.uuid4()}", headers=h
    )
    assert r_other.status_code == 403, r_other.text
    # missing student_id
    r_none = await app_client.get(f"{API}/student-portal/syllabus", headers=h)
    assert r_none.status_code == 400, r_none.text

"""DB-backed tests for the student/parent per-subject report card. Auto-skip without PG."""

import json
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
        pytest.skip("DB not reachable for report-card test")
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
    school = School(name="RcSch", subdomain=f"rc-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    srole = Role(school_id=school.id, name="Student", permissions={})
    prole = Role(school_id=school.id, name="Parent", permissions={})
    s.add_all([srole, prole])
    await s.flush()
    se, sp = f"rc-stu-{suf}@e.com", "Stud3nt!x"
    suser = User(
        school_id=school.id,
        email=se,
        hashed_password=get_password_hash(sp),
        role_id=srole.id,
        is_active=True,
    )
    pe, pp = f"rc-par-{suf}@e.com", "Par3nt!x"
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
    parent2 = Parent(school_id=school.id, father_name="Mr Q")
    s.add_all([parent, parent2])
    await s.flush()

    year = (
        await s.execute(
            text(
                "INSERT INTO academic_years (school_id, name, start_date, end_date) VALUES (:s,'2026-27','2026-04-01','2027-03-31') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    cls = (
        await s.execute(
            text(
                "INSERT INTO classes (school_id, name, numeric_value) VALUES (:s,'VIII',8) RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    sec = (
        await s.execute(
            text(
                "INSERT INTO sections (school_id, class_id, name) VALUES (:s,:c,'A') RETURNING id"
            ),
            {"s": school.id, "c": cls},
        )
    ).scalar()
    sub1 = (
        await s.execute(
            text(
                "INSERT INTO subjects (school_id, name, code, type) VALUES (:s,'Mathematics','MATH','Core') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    sub2 = (
        await s.execute(
            text(
                "INSERT INTO subjects (school_id, name, code, type) VALUES (:s,'Science','SCI','Core') RETURNING id"
            ),
            {"s": school.id},
        )
    ).scalar()
    etype = (
        await s.execute(
            text("INSERT INTO exam_types (school_id, name) VALUES (:s,'Half-Yearly') RETURNING id"),
            {"s": school.id},
        )
    ).scalar()
    exam = (
        await s.execute(
            text(
                "INSERT INTO exams (school_id, academic_year_id, exam_type_id, class_id, name, status) VALUES (:s,:y,:t,:c,'Half-Yearly Examination','Published') RETURNING id"
            ),
            {"s": school.id, "y": year, "t": etype, "c": cls},
        )
    ).scalar()
    es1 = (
        await s.execute(
            text(
                "INSERT INTO exam_schedules (school_id, exam_id, subject_id, exam_date, max_marks, passing_marks) VALUES (:s,:e,:sub,'2026-09-10',100,33) RETURNING id"
            ),
            {"s": school.id, "e": exam, "sub": sub1},
        )
    ).scalar()
    es2 = (
        await s.execute(
            text(
                "INSERT INTO exam_schedules (school_id, exam_id, subject_id, exam_date, max_marks, passing_marks) VALUES (:s,:e,:sub,'2026-09-12',100,33) RETURNING id"
            ),
            {"s": school.id, "e": exam, "sub": sub2},
        )
    ).scalar()

    child = Student(
        school_id=school.id,
        parent_id=parent.id,
        user_id=suser.id,
        first_name="Aarav",
        last_name="A",
        dob=date(2014, 1, 1),
        current_class_id=cls,
        current_section_id=sec,
        admission_number="ADM-1",
    )
    other = Student(
        school_id=school.id,
        parent_id=parent2.id,
        first_name="Bina",
        last_name="B",
        dob=date(2014, 2, 2),
    )
    s.add_all([child, other])
    await s.flush()

    await s.execute(
        text(
            "INSERT INTO student_marks (school_id, exam_schedule_id, student_id, marks_obtained, is_absent) VALUES (:s,:es,:st,78,false)"
        ),
        {"s": school.id, "es": es1, "st": child.id},
    )
    await s.execute(
        text(
            "INSERT INTO student_marks (school_id, exam_schedule_id, student_id, marks_obtained, is_absent) VALUES (:s,:es,:st,65,false)"
        ),
        {"s": school.id, "es": es2, "st": child.id},
    )
    await s.execute(
        text(
            "INSERT INTO results (school_id, exam_id, student_id, total_marks, obtained_marks, percentage, grade, status, rank) VALUES (:s,:e,:st,200,143,71.5,'B','Pass',3)"
        ),
        {"s": school.id, "e": exam, "st": child.id},
    )
    rules = json.dumps(
        [
            {"min": 80, "max": 100, "grade": "A"},
            {"min": 60, "max": 79.99, "grade": "B"},
            {"min": 0, "max": 59.99, "grade": "C"},
        ]
    )
    await s.execute(
        text(
            "INSERT INTO grade_scales (school_id, name, rules, is_default) VALUES (:s,'Default',CAST(:r AS json),true)"
        ),
        {"s": school.id, "r": rules},
    )
    await s.commit()

    yield {
        "s_email": se,
        "s_pw": sp,
        "p_email": pe,
        "p_pw": pp,
        "exam_id": str(exam),
        "child_id": str(child.id),
        "other_id": str(other.id),
        "school_id": school.id,
    }

    for tbl in (
        "results",
        "student_marks",
        "exam_schedules",
        "exams",
        "grade_scales",
        "exam_types",
        "students",
        "parents",
        "subjects",
        "sections",
        "classes",
        "academic_years",
        "users",
        "roles",
    ):
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


async def test_student_self_report_card(env, app_client):
    h = {"Authorization": f"Bearer {await _token(app_client, env['s_email'], env['s_pw'])}"}
    lst = (await app_client.get(f"{API}/student-portal/report-cards", headers=h)).json()["data"]
    assert any(x["exam_id"] == env["exam_id"] for x in lst)
    rc = (
        await app_client.get(f"{API}/student-portal/report-cards/{env['exam_id']}", headers=h)
    ).json()["data"]
    assert len(rc["subjects"]) == 2
    assert {s["subject_name"] for s in rc["subjects"]} == {"Mathematics", "Science"}
    assert sorted(s["obtained"] for s in rc["subjects"]) == [65.0, 78.0]
    assert rc["summary"]["obtained_marks"] == 143.0
    assert rc["summary"]["total_marks"] == 200.0
    assert rc["summary"]["grade"] == "B"
    # per-subject grade derived from the school's grade scale (78%,65% -> B)
    assert all(s["grade"] == "B" for s in rc["subjects"])


async def test_parent_report_card_scope(env, app_client):
    h = {"Authorization": f"Bearer {await _token(app_client, env['p_email'], env['p_pw'])}"}
    own = await app_client.get(
        f"{API}/student-portal/report-cards/{env['exam_id']}?student_id={env['child_id']}",
        headers=h,
    )
    assert own.status_code == 200, own.text
    assert len(own.json()["data"]["subjects"]) == 2
    other = await app_client.get(
        f"{API}/student-portal/report-cards/{env['exam_id']}?student_id={env['other_id']}",
        headers=h,
    )
    assert other.status_code == 403, other.text
    missing = await app_client.get(f"{API}/student-portal/report-cards/{env['exam_id']}", headers=h)
    assert missing.status_code == 400, missing.text

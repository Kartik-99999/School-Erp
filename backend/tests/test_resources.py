"""Resources / documents library.

DB-backed (httpx over the ASGI app; auto-skips without Postgres). Cloudinary's upload_file
is monkeypatched so it runs without real keys. Covers: teacher upload happy path, bad file
type -> 400, Student upload -> 403, audience filtering (Student/Parent see only what's
targeted), and soft-delete hiding a resource.
"""

import uuid
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.api.v1.endpoints.resources as resmod
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
        pytest.skip("DB not reachable for resources test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def seeded(owner_session):
    """A school with a class + Teacher / Student / Parent users (student is in the class,
    child of the parent). Returns login creds + the class id."""
    from app.core.security import get_password_hash
    from app.models.school import School
    from app.models.setup import ClassModel
    from app.models.students import Parent, Student
    from app.models.users import Role, User

    s = owner_session
    pw = "Pass!234"
    suf = uuid.uuid4().hex[:8]
    school = School(name="ResTest", subdomain=f"res-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    cls = ClassModel(school_id=school.id, name="Grade 5")
    s.add(cls)
    await s.flush()
    roles = {}
    for name in ("Teacher", "Student", "Parent"):
        r = Role(school_id=school.id, name=name, permissions={})
        s.add(r)
        roles[name] = r
    await s.flush()

    def mkuser(prefix, role):
        u = User(
            school_id=school.id,
            email=f"{prefix}-{suf}@example.com",
            hashed_password=get_password_hash(pw),
            role_id=role.id,
            is_active=True,
        )
        s.add(u)
        return u

    teacher_u = mkuser("teacher", roles["Teacher"])
    student_u = mkuser("student", roles["Student"])
    parent_u = mkuser("parent", roles["Parent"])
    await s.flush()
    parent = Parent(school_id=school.id, user_id=parent_u.id, father_name="P")
    s.add(parent)
    await s.flush()
    student = Student(
        school_id=school.id,
        parent_id=parent.id,
        user_id=student_u.id,
        first_name="St",
        last_name="U",
        dob=date(2012, 1, 1),
        current_class_id=cls.id,
    )
    s.add(student)
    await s.commit()

    yield {
        "pw": pw,
        "teacher": teacher_u.email,
        "student": student_u.email,
        "parent": parent_u.email,
        "class_id": str(cls.id),
        "school_id": school.id,
    }

    for tbl in ("resources", "students", "parents", "users", "roles", "classes"):
        await s.execute(text(f"DELETE FROM {tbl} WHERE school_id = :s"), {"s": school.id})
    await s.execute(text("DELETE FROM schools WHERE id = :s"), {"s": school.id})
    await s.commit()


@pytest_asyncio.fixture
async def app_client():
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await app_engine.dispose()


async def _login(ac, email, pw):
    tok = (await ac.post(f"{API}/auth/login", data={"username": email, "password": pw})).json()[
        "access_token"
    ]
    return {"Authorization": f"Bearer {tok}"}


async def test_teacher_upload_happy_path(seeded, app_client, monkeypatch):
    monkeypatch.setattr(resmod, "upload_file", lambda content, folder: "https://cdn.test/notes.pdf")
    h = await _login(app_client, seeded["teacher"], seeded["pw"])
    r = await app_client.post(
        f"{API}/resources",
        headers=h,
        data={"title": "Lecture Notes", "category": "Study Material", "target_audience": "All"},
        files={"file": ("notes.pdf", b"%PDF-1.4 hello", "application/pdf")},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["file_url"] == "https://cdn.test/notes.pdf"
    assert data["file_type"] == "pdf"
    assert data["category"] == "Study Material"


async def test_bad_file_type_rejected(seeded, app_client, monkeypatch):
    monkeypatch.setattr(resmod, "upload_file", lambda content, folder: "https://cdn.test/x")
    h = await _login(app_client, seeded["teacher"], seeded["pw"])
    r = await app_client.post(
        f"{API}/resources",
        headers=h,
        data={"title": "Bad", "category": "Other", "target_audience": "All"},
        files={"file": ("malware.exe", b"MZ", "application/octet-stream")},
    )
    assert r.status_code == 400, r.text


async def test_student_cannot_upload(seeded, app_client):
    h = await _login(app_client, seeded["student"], seeded["pw"])
    r = await app_client.post(
        f"{API}/resources",
        headers=h,
        data={
            "title": "Nope",
            "category": "Other",
            "target_audience": "All",
            "external_url": "https://x.com/d",
        },
    )
    assert r.status_code == 403, r.text


async def _create(ac, h, title, audience, class_id=None):
    data = {
        "title": title,
        "category": "Circular",
        "target_audience": audience,
        "external_url": "https://x.com/doc",
    }
    if class_id:
        data["target_class_id"] = class_id
    r = await ac.post(f"{API}/resources", headers=h, data=data)
    assert r.status_code == 200, r.text
    return r.json()["data"]["id"]


async def test_audience_filtering(seeded, app_client):
    th = await _login(app_client, seeded["teacher"], seeded["pw"])
    await _create(app_client, th, "R-All", "All")
    await _create(app_client, th, "R-Students", "Students")
    await _create(app_client, th, "R-Parents", "Parents")
    await _create(app_client, th, "R-Class", "Specific Class", class_id=seeded["class_id"])

    def titles(headers_resp):
        return {x["title"] for x in headers_resp}

    teacher_list = (await app_client.get(f"{API}/resources", headers=th)).json()["data"]
    assert {"R-All", "R-Students", "R-Parents", "R-Class"}.issubset(titles(teacher_list))

    sh = await _login(app_client, seeded["student"], seeded["pw"])
    student_list = titles((await app_client.get(f"{API}/resources", headers=sh)).json()["data"])
    assert {"R-All", "R-Students", "R-Class"}.issubset(student_list)
    assert "R-Parents" not in student_list

    ph = await _login(app_client, seeded["parent"], seeded["pw"])
    parent_list = titles((await app_client.get(f"{API}/resources", headers=ph)).json()["data"])
    assert {"R-All", "R-Parents", "R-Class"}.issubset(parent_list)
    assert "R-Students" not in parent_list


async def test_soft_delete_hides_resource(seeded, app_client):
    th = await _login(app_client, seeded["teacher"], seeded["pw"])
    rid = await _create(app_client, th, "ToDelete", "All")
    before = {
        x["title"] for x in (await app_client.get(f"{API}/resources", headers=th)).json()["data"]
    }
    assert "ToDelete" in before
    assert (await app_client.delete(f"{API}/resources/{rid}", headers=th)).status_code == 200
    after = {
        x["title"] for x in (await app_client.get(f"{API}/resources", headers=th)).json()["data"]
    }
    assert "ToDelete" not in after

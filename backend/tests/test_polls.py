"""DB-backed tests for polls: vote flow, one-vote-per-user, audience/tenant scope.
Auto-skip without Postgres.
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
        pytest.skip("DB not reachable for polls test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def env(owner_session):
    from app.core.security import get_password_hash
    from app.models.communication import Poll, PollOption
    from app.models.school import School
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    a = School(name="PollA", subdomain=f"polla-{suf}", status="Trial")
    s.add(a)
    await s.flush()
    ra = Role(school_id=a.id, name="Student", permissions={})
    s.add(ra)
    await s.flush()
    ea, pa = f"sa-{suf}@example.com", "Stud3nt!a"
    ua = User(
        school_id=a.id,
        email=ea,
        hashed_password=get_password_hash(pa),
        role_id=ra.id,
        is_active=True,
    )
    s.add(ua)
    await s.flush()
    poll = Poll(
        school_id=a.id, question="Favourite sport?", target_audience="Students", is_active=True
    )
    s.add(poll)
    await s.flush()
    o1 = PollOption(school_id=a.id, poll_id=poll.id, text="Cricket", position=0)
    o2 = PollOption(school_id=a.id, poll_id=poll.id, text="Football", position=1)
    s.add_all([o1, o2])
    await s.flush()

    b = School(name="PollB", subdomain=f"pollb-{suf}", status="Trial")
    s.add(b)
    await s.flush()
    rb = Role(school_id=b.id, name="Student", permissions={})
    s.add(rb)
    await s.flush()
    eb, pb = f"sb-{suf}@example.com", "Stud3nt!b"
    ub = User(
        school_id=b.id,
        email=eb,
        hashed_password=get_password_hash(pb),
        role_id=rb.id,
        is_active=True,
    )
    s.add(ub)
    await s.commit()

    yield {
        "a_email": ea,
        "a_pw": pa,
        "b_email": eb,
        "b_pw": pb,
        "poll_id": str(poll.id),
        "opt1": str(o1.id),
        "opt2": str(o2.id),
        "a_id": a.id,
        "b_id": b.id,
    }

    for tbl in ("poll_votes", "poll_options", "polls", "users", "roles"):
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


async def test_polls_vote_flow(env, app_client):
    ta = await _token(app_client, env["a_email"], env["a_pw"])
    ha = {"Authorization": f"Bearer {ta}"}

    polls = (await app_client.get(f"{API}/communication/polls", headers=ha)).json()["data"]
    mine = [p for p in polls if p["id"] == env["poll_id"]]
    assert len(mine) == 1
    assert mine[0]["total_votes"] == 0
    assert mine[0]["my_option_id"] is None
    assert len(mine[0]["options"]) == 2

    rv = await app_client.post(
        f"{API}/communication/polls/{env['poll_id']}/vote",
        headers=ha,
        json={"option_id": env["opt1"]},
    )
    assert rv.status_code == 200, rv.text

    p2 = [
        p
        for p in (await app_client.get(f"{API}/communication/polls", headers=ha)).json()["data"]
        if p["id"] == env["poll_id"]
    ][0]
    assert p2["total_votes"] == 1
    assert p2["my_option_id"] == env["opt1"]
    assert [o for o in p2["options"] if o["id"] == env["opt1"]][0]["votes"] == 1

    # double vote rejected
    rv2 = await app_client.post(
        f"{API}/communication/polls/{env['poll_id']}/vote",
        headers=ha,
        json={"option_id": env["opt2"]},
    )
    assert rv2.status_code == 400, rv2.text
    # invalid option rejected
    rbad = await app_client.post(
        f"{API}/communication/polls/{env['poll_id']}/vote",
        headers=ha,
        json={"option_id": str(uuid.uuid4())},
    )
    assert rbad.status_code == 400, rbad.text


async def test_polls_tenant_isolation(env, app_client):
    tb = await _token(app_client, env["b_email"], env["b_pw"])
    hb = {"Authorization": f"Bearer {tb}"}
    polls = (await app_client.get(f"{API}/communication/polls", headers=hb)).json()["data"]
    assert all(p["id"] != env["poll_id"] for p in polls)
    rv = await app_client.post(
        f"{API}/communication/polls/{env['poll_id']}/vote",
        headers=hb,
        json={"option_id": env["opt1"]},
    )
    assert rv.status_code == 404, rv.text

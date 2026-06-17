"""DB-backed Row-Level-Security isolation tests.

Unlike the rest of the suite (which runs WITHOUT a database), these require a local
Postgres AND the non-owner ``educore_app`` role + ``tenant_isolation`` policies that
``backend/enable_rls.py`` installs. They auto-skip when that role isn't reachable, so
the default DB-less `pytest` run is unaffected. Run them after enable_rls.py with a
local DB to prove tenant isolation holds at the database layer.
"""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

APP_ROLE = settings.APP_DB_USER or "educore_app"
APP_PW = settings.APP_DB_PASSWORD or "educore_app"
APP_URI = (
    f"postgresql+asyncpg://{APP_ROLE}:{APP_PW}@{settings.POSTGRES_SERVER}:"
    f"{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)


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


async def _set_ctx(conn, tenant: str = "", bypass: str = ""):
    await conn.execute(text("SELECT set_config('app.current_tenant', :t, true)"), {"t": tenant})
    await conn.execute(text("SELECT set_config('app.bypass_rls', :b, true)"), {"b": bypass})


@pytest_asyncio.fixture
async def tenants():
    """Create two throwaway tenants as the owner; yield (A_id, B_id); clean up."""
    if not await _reachable(APP_URI):
        pytest.skip(f"RLS role {APP_ROLE!r} not reachable — run enable_rls.py on a local DB")
    a, b = str(uuid.uuid4()), str(uuid.uuid4())
    suf = uuid.uuid4().hex[:8]
    owner = create_async_engine(settings.async_database_uri)
    async with owner.begin() as c:
        for sid, slug in ((a, f"rlspy-a-{suf}"), (b, f"rlspy-b-{suf}")):
            await c.execute(
                text(
                    "INSERT INTO schools (id, name, subdomain, status) "
                    "VALUES (CAST(:id AS uuid), :n, :s, 'Trial')"
                ),
                {"id": sid, "n": f"RLSpy {slug}", "s": slug},
            )
    try:
        yield a, b
    finally:
        async with owner.begin() as c:
            await c.execute(text("DELETE FROM academic_years WHERE name LIKE 'RLSPY-%'"))
            await c.execute(text("DELETE FROM roles WHERE name LIKE 'RLSPY-%'"))
            await c.execute(text("DELETE FROM schools WHERE subdomain LIKE 'rlspy-%'"))
        await owner.dispose()


async def _seed_year(conn, school_id, name):
    await conn.execute(
        text(
            "INSERT INTO academic_years (school_id, name, start_date, end_date) "
            "VALUES (CAST(:s AS uuid), :n, '2026-04-01', '2027-03-31')"
        ),
        {"s": school_id, "n": name},
    )


async def test_strict_table_isolation_and_fail_closed_and_bypass(tenants):
    a, b = tenants
    app = create_async_engine(APP_URI)
    try:
        async with app.connect() as c:
            async with c.begin():
                await _set_ctx(c, a)
                await _seed_year(c, a, "RLSPY-A")
            async with c.begin():
                await _set_ctx(c, b)
                await _seed_year(c, b, "RLSPY-B")

            # Each tenant sees only its own rows.
            async with c.begin():
                await _set_ctx(c, a)
                seen = (
                    await c.execute(
                        text(
                            "SELECT string_agg(name, ',' ORDER BY name) "
                            "FROM academic_years WHERE name LIKE 'RLSPY-%'"
                        )
                    )
                ).scalar()
            assert seen == "RLSPY-A"

            # No tenant context => no rows (fail closed), not a cross-tenant leak.
            async with c.begin():
                await _set_ctx(c, "")
                n = (
                    await c.execute(
                        text("SELECT count(*) FROM academic_years WHERE name LIKE 'RLSPY-%'")
                    )
                ).scalar()
            assert n == 0

            # Super-Admin bypass sees everything.
            async with c.begin():
                await _set_ctx(c, "", "on")
                n = (
                    await c.execute(
                        text("SELECT count(*) FROM academic_years WHERE name LIKE 'RLSPY-%'")
                    )
                ).scalar()
            assert n == 2
    finally:
        await app.dispose()


async def test_with_check_blocks_cross_tenant_write(tenants):
    a, b = tenants
    app = create_async_engine(APP_URI)
    try:
        async with app.connect() as c:
            with pytest.raises(Exception):
                async with c.begin():
                    await _set_ctx(c, a)  # context = A ...
                    await _seed_year(c, b, "RLSPY-EVIL")  # ... but row for B
    finally:
        await app.dispose()


async def test_identity_table_permissive_when_unset(tenants):
    a, b = tenants
    app = create_async_engine(APP_URI)
    try:
        async with app.connect() as c:
            async with c.begin():
                await _set_ctx(c, a)
                await c.execute(
                    text(
                        "INSERT INTO roles (school_id, name) VALUES (CAST(:s AS uuid), 'RLSPY-ROLE')"
                    ),
                    {"s": a},
                )
            # Login path reads identity tables before any tenant context exists.
            async with c.begin():
                await _set_ctx(c, "")
                n_unset = (
                    await c.execute(text("SELECT count(*) FROM roles WHERE name='RLSPY-ROLE'"))
                ).scalar()
            # But once a different tenant's context is set, they are restricted.
            async with c.begin():
                await _set_ctx(c, b)
                n_other = (
                    await c.execute(text("SELECT count(*) FROM roles WHERE name='RLSPY-ROLE'"))
                ).scalar()
            assert n_unset >= 1
            assert n_other == 0
    finally:
        await app.dispose()

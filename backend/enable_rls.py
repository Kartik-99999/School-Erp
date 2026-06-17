"""Enable Postgres Row-Level Security for true multi-tenant isolation.

Run as the DB OWNER (postgres):
    cd backend && PYTHONPATH=. ./venv/bin/python enable_rls.py

Idempotent. It:
  1. On every BASE TABLE that has a ``school_id`` column: enables RLS and installs a
     single canonical ``tenant_isolation`` policy (dropping ALL pre-existing policies
     first, so a stale permissive policy can't OR-override the strict one).
       - Tenant tables -> STRICT: rows are visible/writable only when
         ``app.current_tenant`` matches ``school_id``. A request that forgets to set
         the tenant context therefore sees NOTHING (fails closed) instead of leaking.
       - Identity / append tables (users, roles, students, staff, audit_logs) ->
         PERMISSIVE-WHEN-UNSET: also reachable when no tenant context is set, because
         login / signup / password-reset / audit must read or append to them before
         any tenant context exists. Once a context IS set they restrict to it too.
       - Every policy also allows access when ``app.bypass_rls = 'on'`` (the escape
         the platform Super Admin sets - see super_admin.get_super_admin_db).
     RLS is ENABLED but NOT FORCED, so the table owner (migrations, DDL scripts, and
     the app while APP_DB_USER is unset) keeps full access and nothing breaks.
  2. Creates a non-owner login role (default ``educore_app``, NOBYPASSRLS) and grants
     it DML on all tables/sequences (plus default privileges for future tables).

Then set in backend/.env and restart the backend so the app connects as the
non-owner role -- RLS only applies to non-owners:
    APP_DB_USER=educore_app
    APP_DB_PASSWORD=<the password printed below>
Migrations keep using POSTGRES_USER (the owner).
"""

import asyncio
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

APP_ROLE = settings.APP_DB_USER or "educore_app"
APP_PASSWORD = settings.APP_DB_PASSWORD or "educore_app"

# Identity / login-path + append-only tables that must be reachable before any
# tenant context exists (login looks up users/students/staff cross-tenant; signup
# and audit append rows with no context). These get a permissive-when-unset policy;
# every other school_id table is strict (fails closed when no context is set).
IDENTITY_TABLES = {"users", "roles", "students", "staff", "audit_logs"}

# Catalog-sourced identifiers are interpolated into DDL, so validate them defensively.
_IDENT_RE = re.compile(r"^[a-z_][a-z0-9_]*$")

STRICT_PREDICATE = (
    "school_id = nullif(current_setting('app.current_tenant', true), '')::uuid "
    "OR current_setting('app.bypass_rls', true) = 'on'"
)
PERMISSIVE_PREDICATE = (
    "current_setting('app.current_tenant', true) IS NULL "
    "OR current_setting('app.current_tenant', true) = '' "
    "OR school_id = nullif(current_setting('app.current_tenant', true), '')::uuid "
    "OR current_setting('app.bypass_rls', true) = 'on'"
)


def _ident(name: str) -> str:
    if not _IDENT_RE.fullmatch(name):
        raise SystemExit(f"Unsafe SQL identifier from catalog: {name!r}")
    return name


async def main():
    if not _IDENT_RE.fullmatch(APP_ROLE):
        raise SystemExit(f"Unsafe APP_DB_USER role name: {APP_ROLE!r}")
    pw = APP_PASSWORD.replace("'", "''")  # escape for the SQL string literal

    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        tables = list(
            (
                await conn.execute(
                    text(
                        "SELECT c.table_name "
                        "FROM information_schema.columns c "
                        "JOIN information_schema.tables tb "
                        "  ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema "
                        "WHERE c.table_schema = 'public' AND c.column_name = 'school_id' "
                        "  AND tb.table_type = 'BASE TABLE' "
                        "ORDER BY c.table_name"
                    )
                )
            ).scalars()
        )

        for t in tables:
            _ident(t)
            await conn.execute(text(f'ALTER TABLE public."{t}" ENABLE ROW LEVEL SECURITY'))
            await conn.execute(text(f'ALTER TABLE public."{t}" NO FORCE ROW LEVEL SECURITY'))
            # Drop every existing policy so a stale permissive one can't OR-override us.
            existing = list(
                (
                    await conn.execute(
                        text(
                            "SELECT policyname FROM pg_policies "
                            "WHERE schemaname='public' AND tablename=:t"
                        ),
                        {"t": t},
                    )
                ).scalars()
            )
            for p in existing:
                await conn.execute(text(f'DROP POLICY IF EXISTS "{_ident(p)}" ON public."{t}"'))
            predicate = PERMISSIVE_PREDICATE if t in IDENTITY_TABLES else STRICT_PREDICATE
            await conn.execute(
                text(
                    f'CREATE POLICY tenant_isolation ON public."{t}" '
                    f"USING ({predicate}) WITH CHECK ({predicate})"
                )
            )

        # Non-owner application role. RLS applies to it; the owner still bypasses RLS.
        await conn.execute(
            text(
                f"DO $$ BEGIN "
                f"IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN "
                f"CREATE ROLE {APP_ROLE} LOGIN PASSWORD '{pw}' NOBYPASSRLS; "
                f"ELSE ALTER ROLE {APP_ROLE} NOBYPASSRLS; "
                f"END IF; END $$;"
            )
        )
        for stmt in [
            f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}",
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}",
            f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}",
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE}",
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {APP_ROLE}",
        ]:
            await conn.execute(text(stmt))

    await engine.dispose()
    identity = sorted(t for t in tables if t in IDENTITY_TABLES)
    strict = sorted(t for t in tables if t not in IDENTITY_TABLES)
    print(f"RLS enabled with tenant_isolation policy on {len(tables)} tables.")
    print(f"  strict / fail-closed ({len(strict)}): {strict}")
    print(f"  permissive-when-unset ({len(identity)}): {identity}")
    print(f"App role '{APP_ROLE}' ready (NOBYPASSRLS). Now set in backend/.env and restart:")
    print(f"    APP_DB_USER={APP_ROLE}")
    print(f"    APP_DB_PASSWORD={APP_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())

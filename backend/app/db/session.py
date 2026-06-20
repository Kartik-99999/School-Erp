from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from app.core.config import settings

# Behind PgBouncer in TRANSACTION pooling mode, asyncpg's prepared-statement cache must be
# disabled (a prepared statement is bound to one server connection, which txn pooling does
# not guarantee across statements). The per-transaction `SET LOCAL app.current_tenant`
# below stays correct: txn pooling keeps one server connection for the whole transaction,
# and SET LOCAL is transaction-scoped, so it applies to every statement and resets on commit.
_connect_args: dict = {}
if settings.DB_PGBOUNCER:
    _connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    settings.app_database_uri,
    echo=False,
    future=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # drop connections severed by PgBouncer / managed-PG idle timeouts
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


@event.listens_for(Session, "after_begin")
def _reapply_rls_context(session, transaction, connection):
    """Re-assert the tenant RLS context at the start of EVERY transaction.

    The deps set ``app.current_tenant`` transaction-locally, but the app commits
    mid-request and a session may check out a fresh pooled connection for its next
    transaction. Without re-applying, a post-commit query — e.g. the ORM ``refresh``
    after an insert, or a lazy load during response serialization — would run with
    no tenant context and be blocked by the fail-closed RLS policy.

    Values come from ``session.info`` (populated by deps.set_tenant_context /
    super_admin.get_super_admin_db / the public signup+enquiry routes). The tenant
    is validated as a UUID before being stashed, so embedding it as a SQL literal
    here is safe. ``SET LOCAL`` is transaction-scoped, so it clears itself at commit
    and can't leak to the next request on a pooled connection.
    """
    tenant = session.info.get("rls_tenant")
    if tenant:
        connection.exec_driver_sql(f"SET LOCAL app.current_tenant = '{tenant}'")
    if session.info.get("rls_bypass"):
        connection.exec_driver_sql("SET LOCAL app.bypass_rls = 'on'")


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

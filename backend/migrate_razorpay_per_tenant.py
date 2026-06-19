"""Add per-school Razorpay credential columns to `schools` (idempotent).

Run after pulling the per-tenant payments change:
    cd backend && PYTHONPATH=. ./venv/bin/python migrate_razorpay_per_tenant.py

Each school now collects fees into its OWN Razorpay account; key_secret / webhook_secret
are encrypted at rest by EncryptedString (Fernet, PII_ENCRYPTION_KEY). Existing rows default
to razorpay_enabled = FALSE until a School Admin configures their keys in Settings.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

STATEMENTS = [
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS razorpay_enabled BOOLEAN DEFAULT FALSE",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print("schools: per-school Razorpay columns ensured.")


if __name__ == "__main__":
    asyncio.run(main())

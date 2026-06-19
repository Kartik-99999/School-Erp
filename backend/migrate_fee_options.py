"""Add per-school fee-collection option columns to `schools` (idempotent).

Run: cd backend && PYTHONPATH=. ./venv/bin/python migrate_fee_options.py

Two extra DISPLAY/REDIRECT-only methods alongside per-tenant Razorpay: an external payment
URL (parents redirected out) and bank-transfer details (shown for manual NEFT/IMPS/UPI). Both
are non-secret and off by default; existing rows default to disabled. These never auto-create
receipts — reconciliation uses the existing offline-payment flow.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

STATEMENTS = [
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS external_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS external_payment_url TEXT",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(34)",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(11)",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255)",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255)",
    "ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_upi_id VARCHAR(255)",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print("schools: fee-collection option columns ensured (external URL + bank transfer).")


if __name__ == "__main__":
    asyncio.run(main())

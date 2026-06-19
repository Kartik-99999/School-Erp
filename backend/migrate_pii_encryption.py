"""Widen the government-ID columns to TEXT so EncryptedString ciphertext fits.

Run after pulling the PII-encryption change (idempotent):
    cd backend && PYTHONPATH=. ./venv/bin/python migrate_pii_encryption.py

Existing rows are NOT rewritten — EncryptedString reads legacy plaintext gracefully,
and new writes are encrypted once PII_ENCRYPTION_KEY is set. For a DB with existing
PII you want encrypted in place, re-save those records (or add a one-off re-encrypt
pass) after setting the key.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

WIDEN = [
    "ALTER TABLE students ALTER COLUMN aadhaar_no TYPE TEXT",
    "ALTER TABLE students ALTER COLUMN apaar_id TYPE TEXT",
    "ALTER TABLE students ALTER COLUMN pen_number TYPE TEXT",
    "ALTER TABLE parents ALTER COLUMN father_aadhaar TYPE TEXT",
    "ALTER TABLE parents ALTER COLUMN mother_aadhaar TYPE TEXT",
    "ALTER TABLE parents ALTER COLUMN guardian_aadhaar TYPE TEXT",
]


async def main():
    engine = create_async_engine(settings.async_database_uri)  # owner connection
    async with engine.begin() as conn:
        for stmt in WIDEN:
            await conn.execute(text(stmt))
    await engine.dispose()
    state = "SET (new writes encrypted)" if settings.PII_ENCRYPTION_KEY else "unset (plaintext)"
    print(f"PII columns widened to TEXT. PII_ENCRYPTION_KEY is {state}.")


if __name__ == "__main__":
    asyncio.run(main())

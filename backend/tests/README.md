# Backend tests

Pytest suite for the School ERP backend.

## Run

```bash
cd backend
./venv/bin/pip install -r requirements-dev.txt   # first time only
PYTHONPATH=. ./venv/bin/python -m pytest
```

Config lives in `backend/pytest.ini` (`testpaths = tests`, so the ad-hoc
`test_*.py` scripts in the backend root are not collected).

## What's covered (no database required)

These tests run without a DB — `get_db` is overridden with a no-op in
`conftest.py`, so they exercise pure logic and the request paths that return
*before* any query:

- **`test_security.py`** — password hashing round-trip, bcrypt salting, random-password generation.
- **`test_subdomain.py`** — signup subdomain regex, reserved words, default role seeding.
- **`test_audit_and_tokens.py`** — audit `content_hash` determinism/tamper-detection, reset-token sha256 hashing.
- **`test_grades.py`** — exam grade-boundary calculation.
- **`test_api_guards.py`** — security guards from recent hardening: protected
  endpoints (audit, students/paged, **receipt-PDF & exam-results IDOR fixes**)
  reject anonymous callers (401); signup + password-reset input validation (400).

## Next layer: DB-backed integration tests (not yet wired)

The high-value integration tests — tenant isolation (one school can't read
another's data), the fee-payment ownership/lost-update fixes, atomic
enquiry→student conversion, self-serve signup provisioning — need a throwaway
Postgres (the app uses Postgres-specific features: `uuid_generate_v4()`,
sequences, RLS). Recommended setup:

1. Spin up a disposable Postgres (e.g. `docker run -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres`).
2. Point a `TEST_DATABASE_URL` at it, apply `db/schema.sql` + the `create_*`/`migrate_*` scripts.
3. Add a session-scoped fixture that overrides `get_db` with a real test session and rolls back per test.

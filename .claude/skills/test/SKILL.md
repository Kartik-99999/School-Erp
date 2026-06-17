---
name: test
description: Run the School ERP automated test suite and checks — backend pytest plus frontend type-check/build. Use whenever asked to run tests, check that tests pass, verify nothing is broken, or validate the build before committing/pushing.
---

# Test

Run the project's automated checks and report pass/fail honestly (show the
failing output if anything breaks — never claim green without seeing it).

Project root: `/Users/kartikbhardwaj/school-erp` (backend = FastAPI, frontend = Next.js 14).

## 1. Backend — pytest (primary)

Tests live in `backend/tests/` (config: `backend/pytest.ini`, `testpaths = tests`,
so the ad-hoc `test_*.py` scripts in the backend root are NOT collected).

First run only — install dev deps into the existing venv:
```bash
cd backend && ./venv/bin/pip install -r requirements-dev.txt
```

Run the suite (note `PYTHONPATH=.` and the venv interpreter — both required):
```bash
cd backend && PYTHONPATH=. ./venv/bin/python -m pytest
```

- These tests run WITHOUT a database (`get_db` is overridden in `tests/conftest.py`),
  so they need no Postgres and no env setup.
- A `urllib3 ... NotOpenSSLWarning` line is harmless LibreSSL noise — ignore it.
- To run one file/test: `... -m pytest tests/test_api_guards.py -k receipt`.

## 2. Frontend — type-check + build

```bash
cd frontend && npx tsc --noEmit          # fast: catches type errors (expect exit 0)
cd frontend && npx next build            # thorough: compiles every page (slower)
```

Run `tsc --noEmit` always; run `next build` when changes touch pages/routing or
before a release.

## 3. Reporting

State exactly what ran and the result (e.g. "backend: 46 passed; frontend tsc: 0
errors"). If something fails, paste the relevant failure and stop — do not
"fix-and-rerun" silently unless asked.

## Extending the suite

- Add backend unit tests as `backend/tests/test_*.py` (pure logic, no DB).
- Add API guard tests using the `client` fixture in `conftest.py` (covers auth
  401s and pre-DB validation 400s).
- DB-backed **integration** tests (tenant isolation, fee-payment ownership,
  enquiry→student conversion, signup provisioning) are not wired yet — they need a
  throwaway Postgres. See `backend/tests/README.md` for the recommended setup.

# School ERP — Current State & Handoff (2026-06-19)

> Read this first in a new session. It's the live snapshot; `PROJECT_HANDOFF.md` is
> the older narrative and `PROJECT_OVERVIEW.md` the original. Repo is on GitHub:
> **github.com/Kartik-99999/School-Erp** (private), CI green.

## 1. What this is
Multi-tenant **School ERP SaaS**. One deployment serves many schools (tenants), each
on a subdomain; a platform Super Admin onboards schools. India-flavored (₹, Razorpay,
WhatsApp, CBSE, APAAR/Aadhaar/PEN). ~20 modules, 6 roles.
- **Stack:** Backend = FastAPI (async) · SQLAlchemy 2.0 + asyncpg · PostgreSQL 15 ·
  Pydantic v2 · JWT (python-jose HS256) + passlib/bcrypt. ~201 routes. Frontend =
  Next.js 14 (App Router) · React 18 · TS · Tailwind · NextAuth v4 (Credentials) ·
  axios. ~90 pages.
- **Location:** `/Users/kartikbhardwaj/school-erp` → `backend/`, `frontend/`, `db/schema.sql`

## 2. Git / GitHub / CI
- `main` has ~13 commits; **CI is green** (`.github/workflows/ci.yml`).
- Remote `origin` = https://github.com/Kartik-99999/School-Erp.git. `gh` is installed +
  logged in, so **`git push origin main` just works** (no token needed). The old PATs
  were revoked.
- **CI:** backend job (ruff + black + isort + pytest) runs against a **postgres:15
  service** — applies schema + create_*/migrate_* scripts + `enable_rls.py`, so the
  DB-backed tests actually execute. Frontend job runs `tsc --noEmit`. Python 3.9.
- Workflow: feature work done on short-lived `hardening/*` branches, fast-forward
  merged to `main`.

## 3. What was completed this session (all on main)
1. **Postgres RLS enforced** — `backend/enable_rls.py` installs a fail-closed
   `tenant_isolation` policy on all ~67 `school_id` tables + a non-owner role
   `educore_app` (NOBYPASSRLS) with a `app.bypass_rls` escape for Super Admin.
   - App connects as `educore_app` only when `APP_DB_USER`/`APP_DB_PASSWORD` are set in
     `backend/.env` (they are). Owner (`postgres`) bypasses RLS → used by migrations.
   - Tenant context set per-request via `deps.set_tenant_context` (used by 21 routers);
     re-asserted every transaction by an `after_begin` hook in `app/db/session.py`
     (because the app commits mid-request). `admissions.py` + signup set it manually.
   - Identity/append tables (users, roles, students, staff, audit_logs) are
     permissive-when-unset so login/signup work pre-context.
   - Tests: `backend/tests/test_rls_isolation.py` (DB-backed, auto-skips w/o DB).
2. **Rate limiting** — slowapi (`app/core/limiter.py`), per-IP, on auth/login,
   forgot/reset password, signup, public enquiry, fee payments/structure-delete.
3. **Model↔DB drift fixed + dev DB rebuilt** — `db/schema.sql` reconciled to the ORM;
   `create_academics_tables.py` repaired (does `create_all` of all model tables);
   `migrate_*` made idempotent. Drift checker (throwaway) = 0.
4. **Money → Decimal** — `schemas/fees.py` + `crud_fees.py` (removed float epsilon
   hacks). Test: `tests/test_fee_payment_decimal.py`.
5. **Error-leak sanitization** — 11 `HTTPException(400, str(e))` / bulk-import sites now
   log server-side + return generic messages (fees/exams/students/staff/academics).
6. **Real SMTP email** — `app/utils/email.py` sends via smtplib when `SMTP_HOST` set,
   logs otherwise. `SMTP_*` in config/.env.example.
7. **Auth depth** — 60-min access tokens + DB-backed **rotating refresh tokens**
   (`refresh_tokens` table, `RefreshToken` model), `/auth/refresh` (rotate) +
   `/auth/logout` (revoke); login returns `refresh_token`+`expires_in`. Frontend
   NextAuth jwt-callback refreshes transparently. Backend verified by curl; frontend
   only type-checked (NEEDS A BROWSER TEST).
8. **PII masking + encryption** — `app/utils/masking.py` masks Aadhaar/APAAR/PEN on
   display (last 4); `app/core/crypto.py` `EncryptedString` (Fernet) encrypts them at
   rest (columns now TEXT). They compose: DB ciphertext → ORM decrypts → response
   masks. Key = `PII_ENCRYPTION_KEY` (in .env). Test: `tests/test_pii_encryption.py`.
9. **bcrypt pin** — `bcrypt>=3.2.0,<4.0` in requirements.txt (passlib 1.7.4 breaks on
   bcrypt 4.x — CI caught this; it would've broken login on a fresh deploy).
10. **git + GitHub + CI** set up (section 2).
11. **2FA (TOTP)** — opt-in two-factor (aimed at admin/staff, available to any user).
    Two-step login: password → short-lived `mfa_token` (5 min, purpose-scoped) →
    `/auth/2fa/verify` with a TOTP **or** a single-use recovery code → access+refresh.
    Routes under `/auth/2fa`: `status` · `setup` (returns `otpauth://` provisioning URI
    for QR) · `enable` (confirms a code, returns 10 recovery codes) · `disable` (password
    re-auth) · `verify`. Secret encrypted at rest (`EncryptedString`/Fernet); recovery
    codes sha256 + single-use. New tables `two_factor_secrets` / `two_factor_recovery_codes`
    have no `school_id` → no RLS (refresh-token precedent); `educore_app` granted via
    `enable_rls.py` default privileges. `pyotp` added. Tests: `tests/test_2fa.py` (pure
    logic + auth guards + DB-backed e2e). Verified live on `:8000`.
    Frontend (DONE): the NextAuth login **2FA challenge** (both `CoreTeamForm` +
    `SchoolForm`) and a `TwoFactorSettings` card on the admin settings page — QR enroll
    (`qrcode.react`) + manual secret, code confirm → one-time recovery codes, and a
    password-gated disable. `tsc` clean; login challenge + verify proven against `:3001`.

## 4. Run / verify
```bash
# Backend (port 8000)
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000 --reload
# Frontend (3001)
cd frontend && npm install && npm run dev
# Tests + lint
cd backend && PYTHONPATH=. ./venv/bin/python -m pytest        # 60 tests (DB ones skip w/o PG)
cd backend && ./venv/bin/ruff check app tests *.py && ./venv/bin/black --check app tests *.py
cd frontend && npx tsc --noEmit
```
Fresh DB: `psql -U postgres -d school_erp -f db/schema.sql` then run `backend/create_*.py`,
`migrate_*.py`, and **`enable_rls.py` LAST**.

## 5. Critical gotchas / ops notes
- **Network from this machine to GitHub is FLAKY** (TLS timeouts). Use a retry loop:
  `until git push origin main; do sleep 3; done`. `api.github.com` REST + git transport
  work intermittently; `gh repo create` (GraphQL) often timed out — repos were created
  via REST `curl POST /user/repos`.
- **Claude Code blocks the agent from pushing whole repos to new remotes** (data-exfil
  guardrail) — the USER must run `git push` (via `!` or their terminal). The agent
  can't push.
- **`PII_ENCRYPTION_KEY` is a vault secret** — back it up; losing it = unrecoverable
  PII. For existing plaintext rows, re-save them after setting the key.
- **RLS:** restart the backend after changing `APP_DB_USER` in `.env`. A backend started
  before activation keeps connecting as owner (RLS inert) until restarted.
- `SECRET_KEY` in `.env` must be stable across restarts or JWTs invalidate.
- Deps use `>=` (unpinned) — newer versions can break CI (bcrypt was one). Consider a
  lockfile / pinning.

## 6. Immediate loose ends (USER)
1. ~~Push `42fd7a6` (PII) + this doc~~ — **DONE**: pushed to GitHub (`be5ab2f`), CI re-ran.
2. ~~Reseed the empty dev DB~~ — **DONE**: Super Admin `admin@educore.com`/`admin123`;
   school `demo` with School Admin `admin@demo.edu`/`demo1234`. `:8000` confirmed
   connecting as `educore_app` (RLS enforced) — no restart needed.
3. **Browser-test the auth refresh** (still pending — needs a browser): log in, idle past
   60 min, confirm it stays logged in. Fallback if it misbehaves: raise
   `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`.
4. ~~Build the 2FA enroll/verify UI (frontend)~~ — **DONE** (§3.11). Only manual check
   left: click through enroll/verify in a real **browser** (headless can't exercise the
   React button clicks); the NextAuth login challenge + the `/auth/2fa/*` endpoints are
   already proven.

## 7. What's NEXT (prioritized)
**Bounded hardening (pick one):**
- ✅ **2FA (TOTP)** — DONE, backend + frontend (§3.11).
- **Aadhaar/APAAR input validation** (format/checksum) — small, finishes the PII story.
- **RS256** (asymmetric JWT) instead of HS256.
- **Razorpay webhook** (async payment confirm) + real Twilio/Cloudinary keys (needs
  real accounts to fully test).
- Rotate `educore_app` password for non-local; Redis-backed rate limiter for multi-instance.

**Product depth (bigger):** LMS (assignments/submissions/grading — `homework_submissions`
table already exists) · board-compliant report cards · communication hub · analytics/BI ·
granular RBAC (`roles.permissions` JSON is unused) · native mobile · the stub dashboards
(teacher/accountant/student previews).

**Recommended next:** Aadhaar/APAAR input validation (finishes the PII story) or RS256.

## 8. Key file map
- RLS: `backend/enable_rls.py`, `app/db/session.py` (after_begin), `app/api/deps.py`
  (set_tenant_context), `app/api/v1/endpoints/super_admin.py` (bypass).
- Auth: `app/api/v1/endpoints/auth.py`, `app/core/jwt.py`, `app/core/security.py`,
  `app/models/auth_tokens.py` (RefreshToken), frontend `src/app/api/auth/[...nextauth]/route.ts`.
- 2FA: `app/api/v1/endpoints/two_factor.py` (routes `/auth/2fa/*`), `app/core/twofa.py`
  (pyotp + recovery codes), `app/models/two_factor.py`, `app/schemas/two_factor.py`,
  `app/core/jwt.py` (`create_mfa_token`/`verify_mfa_token`), login gate +
  `_issue_login_tokens` in `auth.py`. Tables in `db/schema.sql`; tests `tests/test_2fa.py`.
  Frontend: `frontend/src/components/security/TwoFactorSettings.tsx`,
  `frontend/src/lib/api/twoFactor.ts`, `frontend/src/lib/authError.ts`, the NextAuth route
  + `login/CoreTeamForm.tsx` / `login/SchoolForm.tsx`, embedded in `admin/settings/page.tsx`.
- PII: `app/core/crypto.py` (EncryptedString), `app/utils/masking.py`, `app/schemas/students.py`.
- Money: `app/crud/crud_fees.py`, `app/schemas/fees.py`.
- Config/secrets: `app/core/config.py`, `backend/.env` (gitignored), `backend/.env.example`.
- CI: `.github/workflows/ci.yml`. Schema: `db/schema.sql`. Tests: `backend/tests/`.

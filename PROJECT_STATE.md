# School ERP — Current State & Handoff (2026-06-19)

> Read this first in a new session. It's the live snapshot; `PROJECT_HANDOFF.md` is
> the older narrative and `PROJECT_OVERVIEW.md` the original. Repo is on GitHub:
> **github.com/Kartik-99999/School-Erp** (private), CI green.

## 1. What this is
Multi-tenant **School ERP SaaS**. One deployment serves many schools (tenants), each
on a subdomain; a platform Super Admin onboards schools. India-flavored (₹, Razorpay,
WhatsApp, CBSE, APAAR/Aadhaar/PEN). ~20 modules, 6 roles.
- **Stack:** Backend = FastAPI (async) · SQLAlchemy 2.0 + asyncpg · PostgreSQL 15 ·
  Pydantic v2 · JWT (python-jose **RS256**, asymmetric) + passlib/bcrypt. ~201 routes. Frontend =
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
12. **Aadhaar / APAAR / PEN input validation** — `app/utils/validators.py` (Aadhaar:
    12 digits, leading 2–9, **Verhoeff** check digit; APAAR: 12 digits; PEN: lenient
    alphanumeric ≤20). Wired as pydantic `BeforeValidator`s on the **input** schemas only
    (`StudentCreate` / `StudentUpdate` / `ParentCreate`) — Response schemas stay
    unvalidated so legacy/imported rows still read + mask. Normalizes (strips spaces/
    hyphens), blank → None. Tests `tests/test_pii_validation.py`; live: bad → 422,
    valid → 201 on `:8000`.
13. **RS256 (asymmetric JWT)** — JWT signing migrated HS256 → **RS256**. `generate_jwt_keys.py`
    mints a 2048-bit RSA keypair (`--env` prints the `\n`-escaped `JWT_*` lines for `.env`
    or `$GITHUB_ENV`). `config.py`: `JWT_ALGORITHM` (default RS256) + `JWT_PRIVATE_KEY` /
    `JWT_PUBLIC_KEY`, with `jwt_private_key` / `jwt_public_key` properties (un-escape `\n`;
    HS256 falls back to `SECRET_KEY`). `app/core/jwt.py` signs access **and** the 2FA
    `mfa_token` with the private key (`_sign`) and verifies with the public key
    (`decode_token`); `app/api/deps.py` verifies via `decode_token`. Refresh tokens (opaque,
    DB-backed) untouched. CI mints an ephemeral keypair per run. **Design = hard cutover**
    (no HS256+RS256 window): in-flight HS256 access tokens are rejected post-deploy, but the
    DB refresh tokens transparently mint new RS256 ones, so users aren't logged out.
    `SECRET_KEY` kept for non-JWT use. Tests `tests/test_jwt_rs256.py` (6); live RS256 login
    proven on `:8000` (header alg=RS256, verifies w/ public key, HS256-forged → 401).
14. **Online fee payments — PER-TENANT Razorpay + async webhook** (evolves the a308b0e
    global webhook to per-school). Each SCHOOL collects into its OWN Razorpay account; the
    platform never holds funds. Per-school creds live on the `schools` row — `razorpay_key_id`,
    `razorpay_key_secret` + `razorpay_webhook_secret` (both `EncryptedString` at rest),
    `razorpay_enabled` (migration `migrate_razorpay_per_tenant.py`). `app/utils/razorpay.py`
    has NO global client: `get_client(key_id, key_secret)` builds one per school and
    `create_order`/`verify_payment`/`get_captured_amount`/`fetch_order`/`verify_webhook_signature`
    all take a client. `POST /fees/payments/online/initiate` loads the school's keys (409 if not
    `razorpay_enabled`), validates allocations, creates the order ON THE SCHOOL'S ACCOUNT with
    the intent in `notes`, and returns the school's `key_id` for checkout. Shared
    `record_online_payment(db, school, …)` reads the order notes (source of truth), sanity-checks
    notes.school_id == the school, sets tenant RLS context manually, dedupes on payment_id
    (idempotent), caps ≤ captured, records via `process_payment`. The **unauthenticated**
    `POST /fees/payments/online/webhook/{school_id}` looks up the school + its webhook secret
    (404 if unknown/unconfigured) and verifies `X-Razorpay-Signature` against the RAW body with
    THAT school's secret before parsing (fail-closed 400; 5xx → retried; 200 once recorded).
    Settings API `GET/PUT /settings/payment-gateway` (secrets write-only, never echoed); global
    `RAZORPAY_*` config removed. Frontend: admin Settings → **Payment Gateway** card (keys +
    enable + the school's webhook URL to paste into Razorpay); student checkout opens with the
    `key_id` from `/initiate`. Tests `tests/test_razorpay_per_tenant.py` (per-school key
    encryption + client, webhook signature/idempotency/cap/404/wrong-school; mocked client,
    DB-backed auto-skip). Proven live on `:8000`. Real delivery needs each school's keys + a
    tunnel (see §6).
15. **WhatsApp alerts OPTIONAL per school** (default OFF; platform Twilio sender, NOT
    per-tenant). `schools.whatsapp_enabled` (Boolean NOT NULL default false; migration
    `migrate_whatsapp_optional.py`, wired into CI). New `send_whatsapp_if_enabled(school, to,
    msg)` in `app/utils/twilio.py` — a no-op unless `school.whatsapp_enabled`, else sends
    best-effort inside a try/except that NEVER propagates (WhatsApp must not break the caller).
    All 4 call sites route through it using the in-scope school: `crud_student` (parent
    credentials), `crud_fees.process_payment` (receipt; school already loaded),
    `attendance.notify_parent_absent` (absence; school loaded once before the loop),
    `communication.process_broadcast_fanout` (broadcasts; school passed into the background
    task). Exposed in `GET/PUT /settings/me` (`SchoolResponse` + `SchoolSettingsUpdate`).
    Frontend: a **Notifications → WhatsApp alerts** toggle on the admin settings page (via
    `lib/api/settings.ts` `getMySchool`/`updateMySchool`). Default OFF for all rows (incl.
    existing) → zero behaviour change until opt-in. Tests `tests/test_whatsapp_optional.py`
    (gate off/on + exception swallowed). Proven live on `:8000`.
16. **Two more per-school fee options — external URL + bank transfer** (DISPLAY/REDIRECT only,
    each independently optional, alongside per-tenant Razorpay §3.14). 9 plaintext, non-secret
    columns on `schools` (`external_payment_enabled` / `external_payment_url`;
    `bank_transfer_enabled` + `bank_name` / `bank_account_number` / `bank_ifsc` / `bank_branch`
    / `bank_account_holder` / `bank_upi_id`); migration `migrate_fee_options.py` (in CI).
    Validators in `app/utils/validators.py`: IFSC `^[A-Z]{4}0[A-Z0-9]{6}$` (upper-normalized),
    account 9–18 digits, valid http(s) URL → **422** on bad input. `GET/PUT /settings/fee-options`
    (School Admin; readable — NOT write-only, unlike Razorpay secrets). Parent-facing
    `GET /fees/payment-options` (tenant-scoped; Student/Parent/Admin/Accountant) →
    `{razorpay:{enabled,key_id}, external:{enabled,url}, bank:{enabled,…}}`. **No auto-receipt**
    for external/bank — reconciled via the existing offline-payment flow; only Razorpay
    auto-records (its webhook). Frontend: admin **Fee Payment Options** card +
    `student/fees` renders Razorpay Pay-Now / an external "Pay on school portal" link (new tab)
    / a bank-details panel / a "contact the school" message when none are enabled. Default OFF
    for all. Tests `tests/test_fee_options.py`. Proven live on `:8000`.

## 4. Run / verify
```bash
# Backend (port 8000)
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000 --reload
# Frontend (3001)
cd frontend && npm install && npm run dev
# Tests + lint
cd backend && PYTHONPATH=. ./venv/bin/python -m pytest        # 92 tests (DB ones skip w/o PG)
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
- **JWT keys must be stable across restarts.** Tokens are RS256-signed with
  `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` (in `.env`); rotating them invalidates all in-flight
  access/MFA tokens (DB refresh tokens still mint new ones, so users aren't logged out).
  Generate with `python generate_jwt_keys.py --env >> .env`. The private key is a vault
  secret — `.env` is gitignored; **never commit it**. `SECRET_KEY` is retained for non-JWT use.
- Deps use `>=` (unpinned) — newer versions can break CI (bcrypt was one). Consider a
  lockfile / pinning.

## 6. Immediate loose ends (USER)
1. ~~Push `42fd7a6` (PII) + this doc~~ — **DONE**: pushed to GitHub (`be5ab2f`), CI re-ran.
2. ~~Reseed the empty dev DB~~ — **DONE**: Super Admin `admin@educore.com`/`admin123`;
   school `demo` with School Admin `admin@demo.edu`/`demo1234`. `:8000` confirmed
   connecting as `educore_app` (RLS enforced) — no restart needed.
3. ~~Browser-test the auth refresh~~ — **DONE & verified** (2026-06-19): logged in via the real
   NextAuth flow as Super Admin, idled the full ~63 min past the 60-min access TTL. The old
   access token then returns **401** (genuinely expired) while `GET /api/auth/session` still
   returns the user with **no error** and a freshly **rotated** RS256 access token that works
   against the backend (**200**) — i.e. the jwt-callback `/auth/refresh` path keeps the user
   logged in transparently. Done over HTTP (cookie jar); no `.env`/server changes.
4. ~~Build the 2FA enroll/verify UI (frontend)~~ — **DONE** (§3.11), and the UI click-through is
   now **verified** (2026-06-19), end-to-end in **headless Chrome** (`puppeteer-core` driving the
   real React components — so headless *can* exercise the button clicks): enable → confirm a
   computed TOTP → 10 recovery codes → re-login through the 2FA challenge (recovery-code path) →
   password-gated disable. Self-cleaning, so the demo account is left 2FA-off.

## 7. What's NEXT (prioritized)
**Bounded hardening (pick one):**
- ✅ **2FA (TOTP)** — DONE, backend + frontend (§3.11).
- ✅ **Aadhaar/APAAR/PEN input validation** — DONE (§3.12): Verhoeff + format on the input schemas.
- ✅ **RS256** (asymmetric JWT) — DONE (§3.13): RSA keypair, sign-private/verify-public, CI ephemeral keys.
- ✅ **Razorpay online payments** — DONE (§3.14): **per-tenant** (each school's own account)
  + intent-in-order + a per-school signature-verified unauthenticated webhook. (Real
  Twilio/Cloudinary keys still needed to fully exercise those integrations.)
- ✅ **WhatsApp alerts optional** — DONE (§3.15): per-school opt-in toggle (default OFF) +
  a gated, best-effort sender across all 4 call sites.
- ✅ **External-URL + bank-transfer fee options** — DONE (§3.16): per-school, display/redirect
  only, alongside Razorpay (external/bank reconciled via the offline-payment flow).
- Rotate `educore_app` password for non-local; Redis-backed rate limiter for multi-instance.

**Product depth (bigger):** LMS (assignments/submissions/grading — `homework_submissions`
table already exists) · board-compliant report cards · communication hub · analytics/BI ·
granular RBAC (`roles.permissions` JSON is unused) · native mobile · the stub dashboards
(teacher/accountant/student previews).

**Recommended next:** wire the 2FA card into the teacher/accountant settings areas, or
board-compliant report cards / the LMS (product depth).

## 8. Key file map
- RLS: `backend/enable_rls.py`, `app/db/session.py` (after_begin), `app/api/deps.py`
  (set_tenant_context), `app/api/v1/endpoints/super_admin.py` (bypass).
- Auth: `app/api/v1/endpoints/auth.py`, `app/core/jwt.py`, `app/core/security.py`,
  `app/models/auth_tokens.py` (RefreshToken), frontend `src/app/api/auth/[...nextauth]/route.ts`.
- JWT RS256: `backend/generate_jwt_keys.py` (keygen), `app/core/jwt.py` (`_sign` /
  `decode_token`), `app/core/config.py` (`JWT_ALGORITHM` + `jwt_private_key` /
  `jwt_public_key`), verify in `app/api/deps.py`, CI keygen step in `.github/workflows/ci.yml`,
  tests `tests/test_jwt_rs256.py` + the key fixture in `tests/conftest.py`.
- 2FA: `app/api/v1/endpoints/two_factor.py` (routes `/auth/2fa/*`), `app/core/twofa.py`
  (pyotp + recovery codes), `app/models/two_factor.py`, `app/schemas/two_factor.py`,
  `app/core/jwt.py` (`create_mfa_token`/`verify_mfa_token`), login gate +
  `_issue_login_tokens` in `auth.py`. Tables in `db/schema.sql`; tests `tests/test_2fa.py`.
  Frontend: `frontend/src/components/security/TwoFactorSettings.tsx`,
  `frontend/src/lib/api/twoFactor.ts`, `frontend/src/lib/authError.ts`, the NextAuth route
  + `login/CoreTeamForm.tsx` / `login/SchoolForm.tsx`, embedded in `admin/settings/page.tsx`.
- Input validation: `app/utils/validators.py` (Aadhaar Verhoeff + APAAR/PEN), wired on
  `StudentCreate`/`StudentUpdate`/`ParentCreate` in `app/schemas/students.py`; tests
  `tests/test_pii_validation.py`.
- PII: `app/core/crypto.py` (EncryptedString), `app/utils/masking.py`, `app/schemas/students.py`.
- Money: `app/crud/crud_fees.py`, `app/schemas/fees.py`.
- Razorpay / online payments (PER-TENANT): per-school creds on `app/models/school.py`
  (`razorpay_*`, `EncryptedString`) + `db/schema.sql` + `migrate_razorpay_per_tenant.py`;
  `app/utils/razorpay.py` (`get_client` + client-taking helpers, no global client);
  `app/api/v1/endpoints/fees.py` (`record_online_payment(db, school, …)` + `initiate` /
  `verify` / `webhook/{school_id}`); settings `GET/PUT /settings/payment-gateway` in
  `app/api/v1/endpoints/settings.py`; frontend `src/components/settings/PaymentGatewaySettings.tsx`
  + `src/lib/api/settings.ts` (mounted in `admin/settings/page.tsx`); tests
  `tests/test_razorpay_per_tenant.py`.
- WhatsApp opt-in: `schools.whatsapp_enabled` (`app/models/school.py` + `db/schema.sql` +
  `migrate_whatsapp_optional.py`); `send_whatsapp_if_enabled` in `app/utils/twilio.py` routed
  through `crud_student.py` / `crud_fees.py` / `attendance.py` / `communication.py`; settings
  in `app/api/v1/endpoints/settings.py` + `schemas/super_admin.py`; frontend Notifications
  toggle in `admin/settings/page.tsx` via `src/lib/api/settings.ts`; tests
  `tests/test_whatsapp_optional.py`.
- Fee options (external URL + bank transfer): `schools.*` (`app/models/school.py` +
  `db/schema.sql` + `migrate_fee_options.py`); validators in `app/utils/validators.py`;
  `GET/PUT /settings/fee-options` (`app/api/v1/endpoints/settings.py`); parent
  `GET /fees/payment-options` (`app/api/v1/endpoints/fees.py`); frontend
  `src/components/settings/FeePaymentOptionsSettings.tsx` + `src/lib/api/settings.ts` + student
  render in `src/app/student/fees/page.tsx` (`src/lib/api/studentPortal.ts`); tests
  `tests/test_fee_options.py`.
- Config/secrets: `app/core/config.py`, `backend/.env` (gitignored), `backend/.env.example`.
- CI: `.github/workflows/ci.yml`. Schema: `db/schema.sql`. Tests: `backend/tests/`.

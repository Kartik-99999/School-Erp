# School ERP SaaS — Handoff & Roadmap (2026-06)

> Paste this into a new chat for full context. Supersedes `PROJECT_OVERVIEW.md`
> (which is the original snapshot; this reflects the current state after the
> latest work session).

---

## 1. What this is
A **multi-tenant School ERP SaaS**. One deployment serves many schools
("tenants"), each on its own **subdomain** (e.g. `dcmc.localhost:3001`,
`springfield.erpcore.tech`). A platform **Super Admin / Core Team** on the base
domain onboards schools. India-flavored (₹, Razorpay, WhatsApp, CBSE grading,
APAAR/Aadhaar/PEN) but intended to go global.

- **Location:** `/Users/kartikbhardwaj/school-erp` → `backend/`, `frontend/`, `db/schema.sql`
- **Roles (6):** Super Admin, School Admin, Teacher, Student, Parent, Accountant (free-text in JWT `role` claim).
- **Modules (~20):** Students, Staff/HR, Admissions, Academics (timetable/syllabus), Attendance, Exams & Results, Fees, Hostel, Library, Transport, Communication, Leaves, Payroll, Reports, Settings, Super-Admin platform, Student Portal, Messaging, **Co-curricular (Houses/Clubs/Sports)**, **Audit Log**.

## 2. Tech stack
- **Backend:** FastAPI (async) · SQLAlchemy 2.0 + asyncpg · PostgreSQL · Pydantic v2 · JWT (python-jose, HS256) + bcrypt. **~199 routes.** Integrations: Razorpay, Twilio (WhatsApp), Cloudinary (uploads), WeasyPrint (PDFs, lazy-imported), pandas (CSV import).
- **Frontend:** Next.js 14 (App Router) · React 18 · TypeScript · TailwindCSS (custom design system) · NextAuth v4 (Credentials) · axios · recharts · lucide-react. **~90 pages.**
- **Tooling:** backend `black`/`isort`/`ruff` (config in `backend/pyproject.toml`); frontend `prettier` (`.prettierrc.json`); `pytest` suite in `backend/tests/` (46 tests, DB-less).

## 3. How to run
**Postgres** (DB `school_erp`, user/pass `postgres`, localhost:5432 — see `backend/.env`).

**Fresh DB setup** — apply schema then the additive scripts (idempotent):
```bash
psql -U postgres -d school_erp -f db/schema.sql
cd backend
PYTHONPATH=. ./venv/bin/python create_academics_tables.py
PYTHONPATH=. ./venv/bin/python create_student_portal_tables.py
PYTHONPATH=. ./venv/bin/python create_messaging_tables.py
PYTHONPATH=. ./venv/bin/python create_activities_tables.py   # houses/clubs/sports
PYTHONPATH=. ./venv/bin/python create_feature_tables.py      # audit_logs, password_reset_tokens, student_documents
PYTHONPATH=. ./venv/bin/python migrate_student_fields.py     # contact emails, joining date, APAAR/Aadhaar/PEN, per-contact demographics
PYTHONPATH=. ./venv/bin/python migrate_db_hardening.py       # FK indexes + fee_structures unique guard
PYTHONPATH=. ./venv/bin/python migrate_admissions_enquiry.py # +admission_for_class, academic_year_id nullable
PYTHONPATH=. ./venv/bin/python enable_rls.py                 # RLS policies + non-owner app role — RUN LAST
```

**Enforce RLS (tenant isolation):** `enable_rls.py` creates the non-owner role
`educore_app` and the `tenant_isolation` policies on every `school_id` table. To
actually enforce isolation the app must connect as that role — set
`APP_DB_USER=educore_app` / `APP_DB_PASSWORD=…` in `backend/.env` (already set for
local dev) and restart the backend. Without them the app connects as the owner and
RLS is bypassed (manual `school_id` filters only). Migrations always use
`POSTGRES_USER` (owner). Roll back by commenting those two `.env` lines out.
**Backend** (8000): `cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000`
(use `--reload` in dev so code changes auto-load).
**Frontend** (3001): `cd frontend && npm install && npm run dev`
**Test/lint:** `cd backend && PYTHONPATH=. ./venv/bin/python -m pytest`; `cd frontend && npx tsc --noEmit && npx next build`

**Login routing:** base domain → Core-Team/Super-Admin login; subdomain → that school's portal (validated via `GET /schools/lookup/{subdomain}`).

## 4. What the latest session added/fixed (current code state)

**Production hardening — RLS + rate limiting (most recent session)**
- **Postgres Row-Level Security is now implemented AND enforced** (the old #1 issue
  below). `backend/enable_rls.py` (idempotent) installs a `tenant_isolation` policy
  on all **67** `school_id` tables + a non-owner role `educore_app` (`NOBYPASSRLS`);
  the app connects as it via `APP_DB_USER` in `.env`. Tenant tables fail **closed**
  (no context ⇒ 0 rows, never a leak); identity/login tables (`users, roles,
  students, staff, audit_logs`) are permissive-when-unset so login/signup work;
  Super Admin uses an `app.bypass_rls` escape. An `after_begin` session hook
  (`app/db/session.py`) re-asserts the tenant GUC on every transaction, so the
  app's mid-request commits + post-commit ORM refreshes work. Verified by
  `backend/tests/test_rls_isolation.py` (DB-backed, auto-skips with no DB) + an
  app-level signup→login→cross-tenant-read smoke test. Hand-written `school_id`
  filters stay as defense-in-depth.
- **Rate limiting (slowapi)** on login (10/min), forgot-password (5/min), reset
  (10/min), signup (5/hr), public enquiry (10/hr), and fee payments/structure
  delete — keyed by client IP (point `storage_uri` at Redis for multi-instance).
- **Finished the prior session's half-wired work:** reconciled three out-of-sync
  RLS definitions (schema.sql vs live DB vs enable_rls.py) into `enable_rls.py` as
  the single source of truth; added tenant context to the only uncovered router
  (`admissions.py`) + signup/public-enquiry; fixed a corrupt `requirements.txt`
  line (`WeasyPrint…slowapi` had no newline).
- **Model↔DB drift fixed + dev DB rebuilt (pre-existing, unrelated to RLS).** A
  model-vs-DB audit (`check_drift`) found the dev DB was stale vs the ORM models on
  7 tables — `admissions_enquiries`, `admissions_documents`, `exams` (`status`),
  `fee_receipts` (`total_amount`…), `fee_schedules` (`net_due_amount`…), `homework`,
  and a missing `homework_submissions` — which 500'd exams, fees (receipts/dues),
  reports, admissions, and homework. Root cause: **dual schema sources** — `schema.sql`
  DDL *and* `create_*.py` `Base.metadata.create_all` (which only creates *missing*
  tables, never alters existing ones), so model columns added after a table existed
  never landed. Fixed `db/schema.sql` to match the models, repaired the broken
  `create_academics_tables.py` (3 dead imports + hardcoded URL → now registers all
  models and `create_all`s the model-only tables), made `migrate_class.py`
  idempotent, then **rebuilt the dev DB** from the corrected canonical scripts.
  Verified: a fresh build reports **0 drift**; the full authed GET sweep returns
  **0 × 500** (was 6). ⚠️ Minor latent item left as-is: signup accepts any `x@y`
  email but `SchoolResponse.contact_email` is a strict `EmailStr`, so a school saved
  with a reserved-TLD email (e.g. `…@x.local`) 500s `GET /settings/me`.

**New full-stack features**
- **Audit log** — append-only trail (`audit_logs`) with sha256 content hash; admin viewer at `/admin/audit`. `record_audit()` is **best-effort** (runs in a SAVEPOINT, swallows failures) so it can never break a business op. Wired into login, fee payment, enquiry-convert, signup, password-reset, fee-structure delete.
- **Self-serve school signup** — public `POST /schools/signup`: atomically creates School + 5 default roles + first School Admin + a default active AcademicYear. Page at `/signup`.
- **Password reset** — `POST /auth/forgot-password` + `/auth/reset-password/confirm` (single-use sha256-hashed tokens, 1h TTL). Pages `/forgot-password`, `/reset-password`. ⚠️ email is still a mock (links print to console).
- **Server-side student list** — `GET /students/paged` (search/sort/paginate); students page rewired (was `limit=5000` fetch-all).
- **Student edit flow** — `PUT /students/{id}` (updates student + parent + medical); shared `StudentForm` used by new + `[id]/edit`; "Edit Profile" button wired.
- **Co-curricular: Houses / Clubs / Sports** — full CRUD + memberships + house points ledger; admin pages under `/admin/activities/*`; surfaced on the student profile, the student portal (`/student/activities`), and the parent portal (`/parent/activities`). **Bulk member import via CSV** (+ downloadable templates).
- **Student document locker** — `student_documents` table + upload (Cloudinary or URL) / list / delete; wired into the profile.
- **Expanded student/parent data** — per-contact (father/mother/guardian) name·phone·email·occupation/relation·religion·category·nationality·Aadhaar; student date_of_joining, mother_tongue, APAAR ID, Aadhaar, PEN.
- **CSV templates** — `downloadCsvTemplate()` helper; templates for student + house/club/sport member imports (fixed a pre-existing broken students template).

**Critical fixes**
- **CORS** now allows tenant **subdomains** (`allow_origin_regex` for `*.localhost`, `*.127.0.0.1`, `*.erpcore.tech`) — previously every client-side call from a school subdomain was browser-blocked.
- Cross-tenant **IDOR** fixes: receipt-PDF and the entire exams read surface now filter `school_id` + role-guard.
- Fee **payment** ownership + lost-update race (SELECT … FOR UPDATE), N+1 fixes (dues/results), `fee_structures` unique constraint, FK indexes.
- Repo professionally formatted; scratch files moved to `archive/`, data to `sample_data/`; root `README.md` added.

**Verified state:** backend imports clean (199 routes), `ruff`/`black`/`isort` clean, **49 pytest pass** (46 + 3 new RLS isolation tests); RLS isolation verified at the DB layer (8 checks) and via an app-level smoke test (signup→login→cross-tenant reads, fully isolated); rate limiting verified live (login 401×10 then 429). Frontend `tsc`/`next build` not re-run this session (no frontend changes). All migrations + `enable_rls.py` have run on the local dev DB, which now connects as `educore_app`. ⚠️ A backend already running before this change keeps connecting as the owner until restarted.

## 5. Key file map
- Backend entry `backend/app/main.py` · routers `backend/app/api/v1/api.py` · auth/tenancy `backend/app/api/deps.py` · config `backend/app/core/config.py`
- Endpoints `backend/app/api/v1/endpoints/*.py` (notable: `activities.py`, `audit.py`, `students.py`, `fees.py`, `schools.py`, `auth.py`)
- Models `backend/app/models/*.py` · schemas `backend/app/schemas/*.py` · crud `backend/app/crud/*.py`
- DB: `db/schema.sql` · `backend/create_*.py` / `migrate_*.py`
- Frontend shell `frontend/src/components/layout/DashboardShell.tsx` · per-role nav in `app/<role>/layout.tsx` · API axios `src/lib/axios.ts` · tokens `tailwind.config.js`

## 6. Known issues / tech debt (honest)
1. ~~**RLS NOT enforced**~~ → **DONE (this session).** Postgres RLS is enforced via `enable_rls.py` (66 tables, fail-closed `tenant_isolation` policy, non-owner `educore_app` role) + an isolation test; hand-written `school_id` filters now act as defense-in-depth. *Remaining:* rotate the `educore_app` password for non-local envs; consider isolating the `schools` registry table (currently no RLS — read cross-tenant by login/lookup by design); audit any future raw-SQL endpoints for tenant context.
2. ~~**No rate limiting**~~ → **DONE (this session)** for login/signup/enquiry/password-reset/payments via slowapi (in-memory, per-IP). *Remaining:* point `storage_uri` at Redis for multi-instance deployments; tune limits per route.
3. ~~**JWT** 8-day, no refresh/rotation/revocation~~ → **DONE.** 60-min access token + DB-backed **rotating refresh tokens** (`/auth/refresh`) + **revocation** (`/auth/logout`); login returns `refresh_token`+`expires_in`; NextAuth refreshes transparently. *Remaining:* still HS256 (consider asymmetric RS256); no 2FA. ⚠️ The frontend refresh flow is type-checked but needs a browser smoke test (log in, idle past 60 min, confirm auto-refresh).
4. **Integrations partly mock/unconfigured:** email now sends via **SMTP when configured** (`SMTP_*` env; logs in dev if `SMTP_HOST` unset). *Remaining:* Razorpay/Twilio/Cloudinary need real keys; no Razorpay webhook (synchronous verify only).
5. ~~**PII** plaintext~~ → **DONE.** Aadhaar/APAAR/PEN are **masked on display** (last 4; `app/utils/masking.py` + Response serializers + update-guard) **and encrypted at rest** (Fernet `EncryptedString` in `app/core/crypto.py`, `PII_ENCRYPTION_KEY`; columns are TEXT, transparent decrypt-on-read, graceful passthrough for legacy/unkeyed). Encryption + masking compose (DB ciphertext → ORM decrypts → response masks); verified by `tests/test_pii_encryption.py`. *Remaining:* Aadhaar format/checksum validation; a key-rotation procedure.
6. ~~**Money** as `float` with epsilon hacks~~ → **DONE.** Fee schemas + `crud_fees` payment/dues math use `Decimal` end-to-end (DB columns were already `Numeric`); the `0.01`-paisa tolerances are gone. Covered by a DB-backed payment-math test. *Remaining:* subscription-plan pricing in `super_admin` is still `float` (lower stakes).
7. ~~**Error handling** leaking internals~~ → **DONE.** All 11 `HTTPException(400, str(e))` / bulk-import `str(e)` sites now log server-side and return sanitized messages (fees, exams, students, staff, academics).
8. **Tests** are DB-less by default (guards + pure logic) **plus** DB-backed tests for RLS isolation and payment math (auto-skip without a local Postgres). **CI** (`.github/workflows/ci.yml`) runs backend ruff/black/isort + pytest **with a Postgres service** (applies schema + scripts + `enable_rls.py`, so the RLS-isolation and payment-math tests actually execute — verified locally: 50 passed, 0 skipped) plus frontend `tsc`. **Now a git repo.** *Remaining:* broader integration/endpoint coverage; CI runs only once a GitHub remote exists + you push.
9. **Stub dashboards:** teacher classes/assignments, accountant transactions, student-dashboard previews are placeholder `[].map`s.
10. **India-only:** single currency ₹, Razorpay, CBSE defaults, WhatsApp-first.

## 7. Feature roadmap — what to add (prioritized)
**Quick wins**
- Wire audit into remaining actions (activities, documents, student edit, deletions).
- ~~Real email (SMTP)~~ **DONE** — `send_email` uses SMTP when configured; password-reset/notice emails send for real (SendGrid/API provider optional).
- Inline toasts instead of blocking `alert()`s; global loading/error patterns.
- ~~Aadhaar/APAAR masking~~ **DONE** (display masking + update-guard); validation + encryption-at-rest still TODO.

**Core product**
- **LMS:** assignments with submissions + grading, lesson content, quizzes, online classes (Zoom/Meet/BBB).
- **Communication hub:** templated SMS/email/WhatsApp campaigns with delivery tracking (replace mock).
- **Fees maturity:** installment plans, automated late fees, concessions stacking, online receipts, gateway reconciliation, multiple gateways (Stripe for global).
- **Exams:** full CBSE/ICSE/State report-card formats (scholastic + co-scholastic/CCE), grade cards, rank certificates, online exams.
- **Attendance:** biometric/RFID/QR, period-wise, geo-fenced; parent absence alerts (partially there).
- **Transport:** real GPS live tracking + route optimization (currently a placeholder).
- **Admissions CRM:** online application + payment, lead nurturing, document collection, merit lists.
- **HR/Payroll:** statutory (PF/ESI/TDS), payslips, loans/reimbursements, appraisals.
- **Library:** barcode/OPAC, fine automation.

**Platform/SaaS**
- **Granular RBAC** (the `roles.permissions` JSON is currently unused) + per-school custom roles.
- **Billing/subscription** self-service (Super-Admin has plans; wire Stripe billing + usage limits + trial→paid).
- **White-labeling** (per-school theme/logo/domain), **i18n/multi-currency**, **PWA/offline**, **native mobile apps** (the login page advertises App Store/Play badges but there's no app).
- **Analytics/BI:** dashboards, at-risk-student prediction, attendance/fee trends.
- **Data export / GDPR-FERPA** tooling, **audit/compliance** reports, **2FA**.

## 8. Where we're behind established competitors
(vs. PowerSchool, Fedena, Teachmint, Classe365, Entab/CampusCare, Skolaro, etc.)

| Area | Mature ERPs have | We have | Gap |
|---|---|---|---|
| **Mobile** | Native parent/student/teacher apps + push | Web only (fake store badges) | **Large** — biggest perceived gap for parents |
| **Communication** | Real SMS/email/WhatsApp, templates, delivery logs, auto-triggers | Mock prints | **Large** |
| **LMS / online classes** | Assignments+submission, content, video classes, quizzes | Timetable/syllabus only | **Large** |
| **Payments** | Multi-gateway, installments, auto late-fee, reconciliation, webhooks | Razorpay sync verify, manual | Medium-Large |
| **Report cards** | Board-compliant formats, CCE, customizable | Basic % + grade scale | Medium |
| **Security/compliance** | RLS/row-level multi-tenancy, 2FA, SOC2/ISO, encryption, audit | **RLS**, audit, rate limiting, **refresh tokens+revocation**, **PII masked + encrypted at rest**; no 2FA, HS256 | Medium |
| **Attendance** | Biometric/RFID/face, geo | Manual mark | Medium |
| **Transport** | Real GPS, parent live track, SOS | Placeholder tracking | Medium |
| **RBAC** | Granular per-permission, custom roles | Free-text role names, permissions unused | Medium |
| **Reliability** | Tests, CI/CD, monitoring, backups, SLAs | 50 tests (incl. RLS + payment), **CI (new)**, **git (new)**; no monitoring/backups | Medium (was Large) |
| **Onboarding/billing** | Self-serve signup→trial→paid, usage metering | Self-serve signup (new), manual billing | Medium |
| **Analytics** | BI dashboards, predictive insights | Basic stat cards | Medium |
| **i18n / global** | Multi-language, multi-currency, locale | India-only ₹/CBSE/WhatsApp | Medium |

**Bottom line for a new chat:** the data model and CRUD breadth are solid and broad; the gaps that separate it from established players are (1) **production hardening** — RLS, real auth/rate-limiting, tests/CI, version control; (2) **real integrations** — comms, payments, mobile; and (3) **depth** in LMS, exams/report-cards, and analytics. Prioritize (1) before any paying customer, then (2)/(3) for competitiveness.

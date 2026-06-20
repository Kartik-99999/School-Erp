# School ERP SaaS — Project Overview & Handoff

> Paste this into a new chat to give full context. Self-contained snapshot of the project's state.

## 1. What this is
A **multi-tenant School ERP SaaS**. One deployment serves many schools ("tenants"), each on its own **subdomain** (e.g. `springfield.erpcore.tech`). A platform-level **Super Admin / Core Team** (on the base domain) onboards schools. India-flavored today (₹, Razorpay, WhatsApp, CBSE grading) but intended to go global.

- **Location:** `/Users/kartikbhardwaj/school-erp` → `backend/`, `frontend/`, `db/schema.sql`
- **NOT a git repo** (no version control yet).
- **Roles (6):** Super Admin, School Admin, Teacher, Student, Parent, Accountant. Roles are free-text strings in the JWT (`role` claim), compared by name; the `roles` table holds them per-school.
- **~17 modules:** Students, Staff/HR, Admissions, Academics (timetable/syllabus/homework), Attendance, Exams & Results, Fees, Hostel, Library, Transport, Communication, Leaves, Payroll, Reports, Settings, Super-Admin platform, Student Portal, Messaging.

## 2. Tech stack
- **Backend:** FastAPI (async) · SQLAlchemy 2.0 + asyncpg · Postgres · Pydantic v2 · JWT (python-jose, HS256) + bcrypt (passlib). **~162 routes.** Integrations: Razorpay (payments), Twilio (WhatsApp), Cloudinary (uploads), WeasyPrint (PDFs, **lazy-imported**), pandas (CSV import).
- **Frontend:** Next.js 14 (App Router) · React 18 · TypeScript · TailwindCSS (custom design system) · NextAuth v4 (Credentials provider) · axios · recharts · lucide-react · @tanstack/react-table.

## 3. How to run
**Postgres** (DB `school_erp`, user `postgres`/`postgres`, localhost:5432 — defaults in `backend/.env`):
- Fresh install: apply `db/schema.sql` (creates all tables, sequences `global_admission_seq`/`global_employee_seq`/`global_receipt_seq`, and RLS policy stubs).
- This live DB already has the extra tables/columns applied via these idempotent scripts in `backend/`: `create_student_portal_tables.py`, `create_messaging_tables.py`, `migrate_fee_schedule.py`.

**Backend** (port 8000):
```
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000
```
`backend/.env` holds `SECRET_KEY` (generated), `POSTGRES_*`, `BACKEND_CORS_ORIGINS`. For live integrations add real `RAZORPAY_KEY_ID/SECRET`, `TWILIO_*`, `CLOUDINARY_*`.

**Frontend** (port **3001**):
```
cd frontend && npm install && npm run dev
```
`frontend/.env.local`: `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.

**Login routing:** base domain (`localhost:3001`) → Core-Team/Super-Admin login. Subdomain (`school.localhost:3001`) → that school's login (validated via `GET /api/v1/schools/lookup/{subdomain}`; unknown subdomain → "School not found").

## 4. Architecture
**Backend layers** (file-per-domain): `app/models/` (ORM) → `app/schemas/` (Pydantic, wrapped in a generic `APIResponse[T]` envelope `{success, data, message}`) → `app/crud/` (data access; generic `CRUDBase`) → `app/api/v1/endpoints/` (~22 routers, registered in `app/api/v1/api.py`) → `app/utils/` (cloudinary, razorpay, twilio, email, pdf).

**Auth/tenancy** (`app/api/deps.py`): `get_current_user_token_data` (decode JWT) → `get_current_tenant_id` / `get_user_school_id` (school_id from token) → `require_roles([...])` (RBAC guard) → `set_tenant_context` (runs `SELECT set_config('app.current_tenant', :id, true)` — intended for RLS) + `get_current_active_user` (loads User). Endpoints typically depend on `set_tenant_context` + `get_current_tenant_id`.

**Frontend:** App-Router route trees per role (`app/admin`, `app/teacher`, `app/student`, `app/parent`, `app/accountant`, `app/super-admin`). All 6 role layouts render one **`components/layout/DashboardShell.tsx`** (sidebar + topbar + mobile drawer) with a per-role nav config. API clients in `src/lib/api/*.ts` wrap a shared axios instance (`src/lib/axios.ts`) that injects the NextAuth Bearer token. Login is server-side via `next-auth/middleware` (`src/middleware.ts`).

## 5. Design system (frontend)
- **Tokens** (`tailwind.config.js`): `primary` (blue scale), `ink`/`ink-muted`/`ink-faint`, `surface`/`surface-card`, `border`/`border-strong`, semantic `success/warning/danger/info`, radii `card`(12px)/`btn`/`input`/`badge`, shadows `card`/`dropdown`/`modal`, font **Plus Jakarta Sans** (via next/font). Legacy shadcn tokens were removed.
- **Component library** (`src/components/ui/`): `Button` (4 variants), `Badge`, `Input`/`Select`/`Textarea`/`Label`, `Modal`, `StatCard`, `DataTable` (paginated), `PageHeader`, `EmptyState`, `Skeleton`/`TableSkeleton`, `SubNav`, `ConfirmDialog`. Helpers: `lib/utils.ts` (`cn`), `lib/download.ts` (`downloadFile` — token-authenticated blob download).
- **Status:** ~20 admin pages are fully hand-componentized; the rest of the ~78 pages received a global token sweep (consistent colors/radius/typography) but keep their original structure.

## 6. What was built/fixed (this session)
- **Boot fixes:** admissions module wrong imports (`app.db.base_class`→`app.models.base`, `app.schemas.response`→`app.schemas.base`, missing deps funcs), lazy WeasyPrint so the app starts without native PDF libs.
- **Security:** CORS restricted to frontend origin; `SECRET_KEY` from `.env`; removed hardcoded passwords (now `generate_random_password`); **role guards added across endpoints**; `set_tenant_context` parameterized (no SQL injection); cloudinary/razorpay no longer return fake-success on failure.
- **Completed stubs:** admissions `convert`→ actually creates a Student (now **atomic** — single transaction); settings persists all school-profile fields; communication `get_events` month/year filter; receipt numbers use a Postgres sequence; reports `current_month` bug fixed.
- **Student self-service portal:** `app/api/v1/endpoints/student_portal.py` → `/student-portal/{fees,attendance,library,facilities,leaves}` (+ POST leaves). New `student_leave_applications` table. 5 student pages rewired to real data.
- **Per-grade fees:** wired `GET/POST /fees/heads` + `GET/POST/PUT/DELETE /fees/structures` (upsert per class+head+year); rebuilt `admin/setup/fees` (pick a grade → set amount per fee head).
- **Class↔Subject mapping:** `GET/POST/DELETE /classes/{id}/subjects` + UI in `admin/setup/subjects`.
- **Hostel/Transport → auto-dues:** `FeeSchedule.fee_structure_id` made nullable + added `label`; `crud_fees.create_adhoc_due` (dedups, no double-bill); hostel allocation / transport assignment auto-create a fee due; hostel `vacate` cancels the unpaid due.
- **Grade scales:** `admin/exams/grades` UI (rules editor) over existing `/exams/grades` endpoints.
- **Teacher timetable:** added `GET /academics/timetable/teacher/{teacher_id}` (day-keyed) — fixed teacher schedule/dashboard 404; teacher "My Schedule" is now a full weekly grid.
- **Messaging:** parent↔school chat. `parent_messages` table + `app/api/v1/endpoints/messaging.py` (`/messages/me`, `/messages/threads`, `/messages/threads/{parent_id}`). Parent chat page + admin inbox (`admin/messages`, in the sidebar).
- **Subdomain validation:** public `GET /schools/lookup/{subdomain}`; `InvalidSubdomain` UI; `SchoolForm` shows the school's real name/logo.
- **Logout fix:** `signOut({redirect:false})` + `window.location` so it stays on the current origin/subdomain (was bouncing to :3000).
- **Code review (3 finder agents) — fixed 10/10:** online-payment idempotency + captured-amount check + role guards; staff-leave-approval role guard; `delete_class` tenant scoping; messaging cross-tenant injection check; hostel double-bill dedup + vacate-cancel; float money math (epsilon); silent-no-bill messaging; Pay-Now button stays disabled during checkout; fee-editor year filter; `www.` treated as base domain; admissions convert made atomic.

## 7. Known issues / what's left (honest, prioritized)
1. **RLS NOT enforced** — `set_tenant_context` sets `app.current_tenant`, but the app connects as the table owner so policies are bypassed. Tenant isolation currently rests entirely on per-query `school_id` filters. **#1 hardening priority before any paying customer:** add real RLS policies + a non-owner DB role + a tenant-isolation test.
2. **Integrations need real credentials:** Razorpay/Twilio/Cloudinary keys; **email is a pure mock** (`utils/email.py` just prints); **PDFs need WeasyPrint native libs** (`brew install pango gdk-pixbuf libffi`) or they 503. Razorpay has no **webhook** (only synchronous verify).
3. **No automated tests; no Alembic** (schema changes are manual scripts).
4. **No self-serve school signup** — Super Admin creates schools manually; needed to scale beyond hand-sold customers.
5. **India-only:** single currency ₹, Razorpay (no Stripe), CBSE grading defaults, WhatsApp-first. Global needs Stripe + multi-currency + i18n + GDPR/FERPA compliance (minors' data).
6. **Partial UI elevation:** ~20 admin pages fully componentized; others only color-swept.
7. **Minor:** fee concessions can't stack (largest applies); a few non-hand-built pages may still have inert controls.

## 8. Recommended next steps
1. **Real RLS tenant isolation + test** (security-critical).
2. **Self-serve school signup** (provision tenant + admin + subdomain automatically).
3. **Stripe + multi-currency** (gateway abstraction; per-school currency).
4. **Automated test suite + Alembic migrations.**
5. **Wire real integrations** (keys + Razorpay webhook + real SMTP).

## 9. Key file map
- Backend entry: `backend/app/main.py` · routers: `backend/app/api/v1/api.py` · auth/tenancy: `backend/app/api/deps.py` · config: `backend/app/core/config.py`
- Backend endpoints: `backend/app/api/v1/endpoints/*.py` (notably `fees.py`, `student_portal.py`, `messaging.py`, `schools.py`, `academics.py`, `admissions.py`, `hostel.py`, `transport.py`, `leaves.py`, `classes.py`)
- Backend money logic: `backend/app/crud/crud_fees.py`, `crud_student.py`
- DB schema: `db/schema.sql` · migration scripts: `backend/create_*.py`, `backend/migrate_fee_schedule.py`
- Frontend shell: `frontend/src/components/layout/DashboardShell.tsx` · UI library: `frontend/src/components/ui/` · API clients: `frontend/src/lib/api/` · design tokens: `frontend/tailwind.config.js`
- Login/tenancy: `frontend/src/app/login/` · middleware: `frontend/src/middleware.ts`

## 10. Verified state
Backend imports clean (162 routes, boots under uvicorn, `/health` ok). Frontend `tsc --noEmit` = 0 errors and `next build` compiles all ~79 pages. Live DB (`school_erp`) has all new tables/columns. Dev DB connects as `postgres` superuser (so RLS is bypassed locally — see issue #1).

<div align="center">

# ERPCore — Multi-Tenant School ERP

**One deployment, many schools.** A production SaaS that runs an entire school's
operations — admissions to alumni — with each school isolated on its own
subdomain and its own data boundary.

[![CI](https://github.com/Kartik-99999/School-Erp/actions/workflows/ci.yml/badge.svg)](https://github.com/Kartik-99999/School-Erp/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-live-brightgreen)](https://erpcore.tech)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688)](#tech-stack)
[![Frontend](https://img.shields.io/badge/frontend-Next.js%2014-000000)](#tech-stack)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

**Live:** [erpcore.tech](https://erpcore.tech) · **API:** [api.erpcore.tech](https://api.erpcore.tech/health)

</div>

> ⚠️ **Proprietary & confidential.** This repository is the source of a commercial
> product. It is not open source — see [`LICENSE`](./LICENSE). Do not copy,
> redistribute, or deploy without written permission.

---

## What it is

ERPCore is a **multi-tenant School ERP**. A single deployment serves many schools
("tenants"), each on its own subdomain (e.g. `springfield.erpcore.tech`). A
platform **Super-Admin / Core Team** onboards schools from the base domain; from
that point each school administers itself in complete isolation.

Tenant isolation is enforced at the database layer with **PostgreSQL Row-Level
Security** — every tenant-scoped table is fail-closed, so one school can never
read another's rows even if application code slips.

India-first today (₹, Razorpay, WhatsApp, CBSE grading, APAAR/Aadhaar/PEN) and
built to generalize.

## Feature modules

| Area | Modules |
|------|---------|
| **People** | Students · Staff / HR · Admissions · Parent & Student portals |
| **Academics** | Classes & Subjects · Timetable · Syllabus · Homework · Exams & Results · Attendance |
| **Operations** | Fees & Invoicing · Payroll · Hostel · Library · Transport · Leaves · Appointments |
| **Engagement** | Communication (WhatsApp) · Notifications · Messaging · Activities (Houses / Clubs / Sports) |
| **Platform** | Super-Admin console · Per-school Settings · Reports · Audit Log · Two-Factor Auth |

Six roles: **Super Admin · School Admin · Teacher · Student · Parent · Accountant.**

## Tech stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (async) · SQLAlchemy 2.0 + asyncpg · Pydantic v2 · PostgreSQL 15 (RLS) · JWT (python-jose, RS256) + bcrypt · **232 routes across 30 routers** |
| **Frontend** | Next.js 14 (App Router) · React 18 · TypeScript · TailwindCSS · NextAuth v4 · axios · recharts · lucide-react · **116 pages** |
| **Integrations** | Razorpay (payments) · Twilio (WhatsApp) · Cloudinary (uploads) · WeasyPrint (PDF payslips/receipts) · pandas (CSV bulk import) |
| **Infra** | Docker Compose · Caddy (wildcard TLS) · PgBouncer · Redis · AWS EC2 · Cloudflare DNS |

## Architecture

```
                    ┌──────────────────────────────┐
   *.erpcore.tech ─▶│  Caddy  (wildcard TLS, proxy) │
                    └───────────────┬──────────────┘
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌──────────────────┐    ┌────────────────────┐
              │  Next.js 14      │    │  FastAPI (async)   │
              │  (App Router)    │───▶│  gunicorn+uvicorn  │
              │  NextAuth (JWT)  │    │  JWT RS256 · RBAC  │
              └──────────────────┘    └─────────┬──────────┘
                                                 ▼
                                   ┌───────────────────────────┐
                                   │  PgBouncer ─▶ PostgreSQL   │
                                   │  Row-Level Security (RLS)  │
                                   │  one row-boundary / tenant │
                                   └───────────────────────────┘
                                                 ▲
                                            Redis (cache)
```

The active subdomain selects the tenant; the tenant id rides in the JWT and is
pushed into a Postgres session variable so RLS scopes every query automatically.

## Repository layout

```
backend/            FastAPI application
  app/
    api/v1/endpoints/   route handlers (30 routers)
    models/             SQLAlchemy ORM
    schemas/            Pydantic models (APIResponse[T] envelope)
    crud/               data-access layer
    core/ utils/        config, security, JWT, integrations
  tests/                pytest suite
  create_*.py migrate_*.py   idempotent DB scripts (no Alembic)
frontend/           Next.js app (App Router route tree per role)
db/schema.sql       full database DDL (fresh install)
deploy/             Docker Compose stack + Caddyfile (production)
sample_data/        example CSVs for bulk import
.github/workflows/  CI (ruff/black/isort/pytest + tsc)
```

## Quick start (local)

**Prerequisites:** Python 3.9+, Node 18+, PostgreSQL 14+.

```bash
# 1. Database — apply schema, then the additive scripts
psql -U postgres -d school_erp -f db/schema.sql
cd backend
PYTHONPATH=. ./venv/bin/python create_academics_tables.py
PYTHONPATH=. ./venv/bin/python create_student_portal_tables.py
PYTHONPATH=. ./venv/bin/python create_messaging_tables.py
PYTHONPATH=. ./venv/bin/python create_feature_tables.py     # audit_logs + reset tokens
PYTHONPATH=. ./venv/bin/python migrate_db_hardening.py      # indexes + guards
PYTHONPATH=. ./venv/bin/python enable_rls.py                # tenant isolation policies

# 2. Backend (port 8000)
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000

# 3. Frontend (port 3001)
cd frontend && npm install && npm run dev
```

Config lives in `backend/.env` (`SECRET_KEY`, `POSTGRES_*`, `BACKEND_CORS_ORIGINS`)
and `frontend/.env.local` (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`). See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full variable list.

**Login routing:** the base domain (`localhost:3001`) → Core-Team / Super-Admin
login; a subdomain (`school.localhost:3001`) → that school's portal.

## Test & lint

```bash
# Backend
cd backend && PYTHONPATH=. ./venv/bin/python -m pytest
cd backend && ./venv/bin/isort app tests && ./venv/bin/black app tests && ./venv/bin/ruff check app

# Frontend
cd frontend && npx tsc --noEmit && npx next build
```

CI (`.github/workflows/`) runs the backend suite against a real `postgres:15`
service (schema + scripts + RLS applied) and type-checks the frontend on every push.

## Deployment

Production runs as a Docker Compose stack (Caddy · Next.js · FastAPI · PostgreSQL ·
PgBouncer · Redis) on AWS EC2, with wildcard TLS and `*.erpcore.tech` DNS via
Cloudflare. The stack definition lives in [`deploy/`](./deploy). Operational
runbook and secrets are kept **outside this repository**.

## Documentation

| Doc | Purpose |
|-----|---------|
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Dev setup, env vars, branch & PR conventions |
| [`SECURITY.md`](./SECURITY.md) | Vulnerability reporting & the security model |
| [`CHANGELOG.md`](./CHANGELOG.md) | Notable changes by release |
| [`LICENSE`](./LICENSE) | Proprietary license terms |

---

<div align="center">
<sub>© 2026 ERPCore · Kartik Bhardwaj. All rights reserved.</sub>
</div>

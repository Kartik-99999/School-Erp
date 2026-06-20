# School ERP — Multi-Tenant SaaS

A multi-tenant School ERP. One deployment serves many schools ("tenants"), each
on its own subdomain (e.g. `springfield.erpcore.tech`); a platform Super-Admin /
Core Team onboards schools from the base domain.

> A deeper architecture/status snapshot lives in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md).

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | FastAPI (async) · SQLAlchemy 2.0 + asyncpg · PostgreSQL · Pydantic v2 · JWT (python-jose) + bcrypt |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · TailwindCSS · NextAuth v4 |
| Integrations | Razorpay · Twilio (WhatsApp) · Cloudinary · WeasyPrint (PDF) · pandas (CSV import) |

## Layout

```
backend/         FastAPI app
  app/
    api/v1/endpoints/   route handlers (~23 routers)
    models/             SQLAlchemy ORM
    schemas/            Pydantic models (APIResponse[T] envelope)
    crud/               data-access layer
    core/ utils/        config, security, jwt, integrations
  tests/                pytest suite (see backend/tests/README.md)
  create_*.py migrate_*.py   idempotent DB scripts (no Alembic)
frontend/        Next.js app (App Router route tree per role)
db/schema.sql    full database DDL (fresh install)
sample_data/     example CSVs for bulk import
archive/         retired dev scratch (safe to delete)
```

## Prerequisites

- Python 3.9+, Node 18+, PostgreSQL 14+
- Backend config in `backend/.env` (`SECRET_KEY`, `POSTGRES_*`, `BACKEND_CORS_ORIGINS`)
- Frontend config in `frontend/.env.local` (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`)

## Database

Fresh install — apply the schema, then the additive scripts:

```bash
psql -U postgres -d school_erp -f db/schema.sql
cd backend
PYTHONPATH=. ./venv/bin/python create_academics_tables.py
PYTHONPATH=. ./venv/bin/python create_student_portal_tables.py
PYTHONPATH=. ./venv/bin/python create_messaging_tables.py
PYTHONPATH=. ./venv/bin/python create_feature_tables.py        # audit_logs + password_reset_tokens
PYTHONPATH=. ./venv/bin/python migrate_db_hardening.py         # indexes + uniqueness guard
```

## Run

```bash
# Backend (port 8000)
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --port 8000

# Frontend (port 3001)
cd frontend && npm install && npm run dev
```

Login routing: the base domain (`localhost:3001`) → Core-Team / Super-Admin
login; a subdomain (`school.localhost:3001`) → that school's portal.

## Test & lint

```bash
# Backend tests
cd backend && PYTHONPATH=. ./venv/bin/python -m pytest

# Backend format + lint (config in backend/pyproject.toml)
cd backend && ./venv/bin/isort app tests && ./venv/bin/black app tests && ./venv/bin/ruff check app

# Frontend
cd frontend && npx tsc --noEmit && npx next build
```

Dev tooling: `pip install -r backend/requirements-dev.txt` (pytest, black, isort, ruff).

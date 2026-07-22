# Contributing to ERPCore

> This is a **proprietary** repository (see [`LICENSE`](./LICENSE)). These
> guidelines are for authorized contributors with write access. External
> contributions are not accepted.

Thanks for working on ERPCore. This guide gets you from a clean checkout to a
merged change.

## 1. Prerequisites

- **Python 3.9+** (CI runs 3.9 — don't use syntax newer than that)
- **Node 18+**
- **PostgreSQL 14+** (production runs 15)

## 2. Local setup

### Backend

```bash
cd backend
python -m venv venv
./venv/bin/pip install -r requirements.txt -r requirements-dev.txt
```

Create `backend/.env`:

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT / crypto secret (generate a random one) |
| `POSTGRES_SERVER` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database connection (defaults: `localhost` / `postgres` / `postgres` / `school_erp`) |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed origins |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments (optional locally) |
| `TWILIO_*` | WhatsApp (optional locally) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image uploads (optional locally) |

### Database

Apply the schema, then the idempotent additive scripts (safe to re-run):

```bash
psql -U postgres -d school_erp -f db/schema.sql
cd backend
PYTHONPATH=. ./venv/bin/python create_academics_tables.py
PYTHONPATH=. ./venv/bin/python create_student_portal_tables.py
PYTHONPATH=. ./venv/bin/python create_messaging_tables.py
PYTHONPATH=. ./venv/bin/python create_feature_tables.py
PYTHONPATH=. ./venv/bin/python migrate_db_hardening.py
PYTHONPATH=. ./venv/bin/python enable_rls.py
```

> There is **no Alembic**. Schema changes are hand-written DDL in `db/schema.sql`
> plus an idempotent `create_*`/`migrate_*` script so existing databases can
> catch up. If you add tables/columns, do both.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | NextAuth session signing |
| `NEXT_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_BASE_DOMAIN` | Root domain for subdomain routing (e.g. `localhost:3001`) |

### Run

```bash
# Backend — port 8000
cd backend && PYTHONPATH=. ./venv/bin/python -m uvicorn app.main:app --reload --port 8000

# Frontend — port 3001
cd frontend && npm run dev
```

The base domain routes to Super-Admin login; a `<school>.` subdomain routes to
that school's portal.

## 3. Before you push — quality gates

CI will reject anything that fails these, so run them locally first.

```bash
# Backend: format, lint, test
cd backend
./venv/bin/isort app tests
./venv/bin/black app tests
./venv/bin/ruff check app
PYTHONPATH=. ./venv/bin/python -m pytest

# Frontend: type-check + build
cd frontend
npx tsc --noEmit
npx next build
```

## 4. Branches & pull requests

- Branch off `main`. Use a descriptive prefix:
  - `feat/<slug>` — new functionality
  - `fix/<slug>` — bug fix
  - `hardening/<slug>` — security / infra / reliability
  - `docs/<slug>` — documentation only
- Keep PRs focused — one concern per branch.
- Open PRs against `main`. CI (backend suite on a real Postgres + frontend
  type-check) must be green before merge.
- Never commit secrets. `.env`, keys, and the deployment runbook stay **out of
  git**. If you add a new secret, document the *variable name* here, not the value.

## 5. Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(students): add profile photo upload
fix(auth): trust X-Forwarded-Proto behind the proxy
docs: add SECURITY policy
```

Prefix with the touched module (`students`, `fees`, `auth`, `landing`, …) where
it helps.

## 6. Tenant-isolation rule of thumb

Any new tenant-scoped table **must** have a `school_id` column and an RLS policy
(add it to `enable_rls.py`). Never filter by tenant in application code alone —
RLS is the source of truth. When in doubt, verify a second tenant cannot read
the rows.

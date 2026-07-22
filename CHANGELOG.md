# Changelog

All notable changes to ERPCore are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This is an internally-versioned product; dates use `YYYY-MM-DD`.

## [Unreleased]

### Added
- Student and staff **profile photo upload** (Cloudinary-backed) on their profile pages.
- Repository documentation: README, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, this changelog.

### Changed
- Production deployment moved to **AWS EC2** (Docker Compose: Caddy · Next.js ·
  FastAPI · PostgreSQL · PgBouncer · Redis) with wildcard TLS and `*.erpcore.tech`
  DNS via Cloudflare.

### Fixed
- Login behind the reverse proxy (secure session cookie + `X-Forwarded-Proto`
  trust), class creation 307-redirect downgrade, and Cloudinary upload configuration.

## [2026-06-23] — Public landing & portal polish

### Added
- Animated marketing landing page (floating hero, spotlight modules, live-activity
  feed, integrations marquee, student-journey section).
- Student & parent portals: unified timeline feed, notifications, photo galleries,
  polls (vote + live results), report cards, syllabus progress, attendance,
  read-only profiles.
- Teacher self-service: homework assignment, own-leave application, publishable
  appointment slots.
- Academic-year switch (per-user active year) and authenticated change-password.

### Security
- Ownership-aware authorization on `GET /students/{id}`, teacher timetable, and
  student activities.
- Role gates added to staff/finance-only endpoints (`/fees/dues`,
  `/fees/receipts`, `/payroll/*`).
- Role × endpoint integration audit across all six roles.

## [2026-06-19] — Tenant isolation hardening

### Security
- **PostgreSQL Row-Level Security** enforced on all tenant-scoped tables via a
  fail-closed `tenant_isolation` policy (`enable_rls.py`), with a non-owner
  database role.
- JWT signing moved to **RS256** (asymmetric).
- DB hardening: indexes, uniqueness guards, audit log, password-reset tokens.

## [2026-06-17] — Initial platform

### Added
- Multi-tenant School ERP core: 30 API routers / 200+ routes, six roles.
- Modules: Students, Staff/HR, Admissions, Academics (timetable/syllabus/homework),
  Attendance, Exams & Results, Fees, Payroll, Hostel, Library, Transport,
  Communication (WhatsApp), Messaging, Notifications, Activities, Reports,
  Settings, Super-Admin platform, Audit Log, Two-Factor Auth.
- Integrations: Razorpay, Twilio, Cloudinary, WeasyPrint (PDF), pandas (CSV import).
- CI: backend suite against a real `postgres:15` service + frontend type-check.

[Unreleased]: https://github.com/Kartik-99999/School-Erp/compare/main...HEAD

# Security Policy

ERPCore stores student and staff **personally identifiable information (PII)** —
including minors' data — and processes school fee payments. We take security
seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Email **security@erpcore.tech** (or hello@erpcore.tech) with:

- a description of the issue and its impact,
- steps to reproduce (proof-of-concept if possible),
- affected URL / endpoint / component,
- your name for acknowledgement (optional).

We aim to acknowledge reports within **72 hours** and to provide a remediation
timeline after triage. Please give us a reasonable window to fix an issue before
any public disclosure. We will credit reporters who wish to be named once a fix
ships.

### Please do not

- Access, modify, or exfiltrate data that is not yours (use only test tenants /
  accounts you own).
- Run automated scanners against production that degrade service for real schools.
- Perform denial-of-service, spam, or social-engineering attacks.

Testing that stays within your own tenant and does not harm others' data or
availability is welcome.

## Security model (overview)

- **Tenant isolation** — every tenant-scoped table is protected by PostgreSQL
  **Row-Level Security** with a fail-closed `tenant_isolation` policy. The tenant
  id is set per session from the JWT; queries cannot cross the boundary even if
  application code is wrong.
- **Authentication** — JWT (RS256, asymmetric) issued on login; passwords hashed
  with bcrypt. Optional **two-factor authentication**.
- **Authorization** — role-based access control across six roles (Super Admin,
  School Admin, Teacher, Student, Parent, Accountant), enforced per endpoint.
- **Transport** — HTTPS everywhere; wildcard TLS terminated at Caddy; secure,
  proxy-aware session cookies.
- **Secrets** — never committed. Production secrets live outside the repository;
  payment/webhook secrets are stored write-only and encrypted at rest.
- **Audit** — sensitive actions are recorded in an append-only audit log.

## Supported versions

Only the currently deployed production release (`main`) receives security fixes.

## Scope

In scope: the ERPCore application (frontend, backend API, deployment
configuration in this repository).

Out of scope: third-party services we integrate with (Razorpay, Twilio,
Cloudinary, Cloudflare, AWS) — report those to the respective vendor.

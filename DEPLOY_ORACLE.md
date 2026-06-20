# Deploying School ERP on Oracle Cloud Always Free (ARM A1)

Self-hosted, **$0/month** production deploy for the multi-tenant School ERP on an Oracle Cloud
**Always Free Ampere A1** VM (ARM64), with Docker Compose + Caddy (automatic wildcard TLS).
Base domain: **erpcore.tech**. Builds on the host-agnostic Dockerfiles, Redis limiter, and
PgBouncer engine flag from commit `9591b8a`.

> Replace placeholders: your domain (`erpcore.tech`), the VM public IP, the Cloudflare token.
> This runbook does not provision anything for you — follow the steps on your own VM.

---

## 0. Topology

```
                Cloudflare DNS (A records: @, *, api -> VM public IP; "DNS only"/grey cloud)
                                   │
                          ┌────────▼─────────┐  :80/:443 (only ports published)
   Browser ───────────▶   │      Caddy        │  custom image w/ caddy-dns/cloudflare
   *.erpcore.tech /        │  wildcard TLS via │  (DNS-01 wildcard cert)
   api.erpcore.tech        │   ACME DNS-01     │
                          └───┬───────────┬────┘
              api.erpcore.tech│           │ *.erpcore.tech + apex (Host preserved)
                       ┌──────▼───┐   ┌───▼────────┐
                       │ backend  │   │  frontend  │   (internal network only)
                       │ FastAPI  │   │  Next.js   │
                       │ gunicorn │   │ standalone │
                       └──┬────┬──┘   └────────────┘
                   :6432  │    │ redis://redis:6379
                   ┌──────▼┐  ┌▼────────┐
                   │pgbounc│  │  redis   │ (shared rate-limit store -> multi-replica safe)
                   │er(txn)│  └──────────┘
                   └───┬───┘
              :5432    │
              ┌────────▼───┐
              │ postgres:15│ (RLS; volume pgdata)  ── nightly pg_dump -> Object Storage
              └────────────┘
```

The browser calls the backend **directly** at `https://api.erpcore.tech/api/v1` (baked into the
frontend bundle at build time), so the backend is public via Caddy. The frontend Host header is
preserved end-to-end, so the Next.js middleware routes each tenant by its subdomain; NextAuth's
cookie domain is `.erpcore.tech` in production (shared across subdomains).

Artifacts (`deploy/`): `docker-compose.yml`, `Dockerfile.caddy`, `Caddyfile`,
`pgbouncer/pgbouncer.ini` + `userlist.txt.example`, `.env.example`, `backup/pg_backup.sh`.
CD: `.github/workflows/deploy-oracle.yml`.

---

## 1. Prerequisites

- **Oracle Cloud Always Free** account. Create an **Ampere A1 Flex** VM — Always-Free-eligible
  shapes only: up to **4 OCPU / 24 GB RAM** total (one VM can take all of it). Image: Ubuntu 22.04
  (ARM). **Capacity tip:** A1 often returns *"Out of host capacity"* — retry in another Availability
  Domain, try off-peak, or script the create-instance call on a loop until it succeeds.
- **Domain** `erpcore.tech` with DNS you control.
- A **DNS provider with an API** for the wildcard cert's DNS-01 challenge. Easiest: move
  `erpcore.tech` DNS to **Cloudflare (free)** and create an API token with **Zone → DNS → Edit**
  on the zone. (HTTP-01 cannot issue `*.erpcore.tech`, so a DNS API is mandatory.)
- An **SSH keypair** for the VM, and (for CD) the private key stored as a GitHub secret.
- The crypto material (generate once, in `backend/`):
  ```bash
  python generate_jwt_keys.py --env          # JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
  python -c "from cryptography.fernet import Fernet; print('PII_ENCRYPTION_KEY='+Fernet.generate_key().decode())"
  python -c "import secrets; print('SECRET_KEY='+secrets.token_urlsafe(48))"
  python -c "import secrets; print('NEXTAUTH_SECRET='+secrets.token_urlsafe(48))"
  ```

---

## 2. Harden the VM (one time)

SSH in as the default user (`ubuntu`), then:
```bash
sudo apt-get update && sudo apt-get -y upgrade
# A non-root deploy user already exists (ubuntu); ensure key-only SSH:
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
# Firewall — only SSH + HTTP + HTTPS. (Also open 80/443 in the OCI Security List / NSG.)
sudo apt-get install -y ufw fail2ban
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable
sudo systemctl enable --now fail2ban
```
> Oracle VMs also have a cloud-level firewall: in the VCN **Security List / NSG**, add ingress for
> TCP 80 and 443 (22 is open by default). Ubuntu images also use iptables — `ufw` manages it, but
> if needed: `sudo netfilter-persistent save`.

---

## 3. Install Docker (ARM64) + clone

```bash
curl -fsSL https://get.docker.com | sudo sh           # installs Docker + compose plugin (arm64)
sudo usermod -aG docker $USER && newgrp docker
sudo mkdir -p /opt/school-erp && sudo chown $USER /opt/school-erp
git clone https://github.com/Kartik-99999/School-Erp.git /opt/school-erp
cd /opt/school-erp/deploy
```

---

## 4. Configure secrets (`deploy/.env`)

```bash
cp .env.example .env
nano .env   # fill in: Cloudflare token, POSTGRES_PASSWORD, APP_DB_PASSWORD, JWT_*, SECRET_KEY,
            # PII_ENCRYPTION_KEY, NEXTAUTH_SECRET, Cloudinary/SMTP/Twilio, backup passphrase
```
`deploy/.env` is gitignored. DB topology (PgBouncer host/port, Redis URL, SSL) is pinned in
`docker-compose.yml`, not `.env`.

---

## 5. DNS records

In Cloudflare (DNS for `erpcore.tech`), add **A records** pointing at the VM's public IP, set to
**DNS only (grey cloud)** so Caddy terminates TLS on the VM:

| Type | Name | Value         | Proxy     |
|------|------|---------------|-----------|
| A    | `@`  | `<VM_IP>`     | DNS only  |
| A    | `*`  | `<VM_IP>`     | DNS only  |
| A    | `api`| `<VM_IP>`     | DNS only  |

The Cloudflare API token is used by Caddy only to write the `_acme-challenge` TXT records for the
DNS-01 wildcard cert — independent of proxy status.

---

## 6. First database bring-up

Build images and bring up the data tier, then run the ordered, idempotent bring-up
(`schema.sql → create_* → migrate_* → enable_rls.py LAST`) as the Postgres **owner**, direct to
`:5432` (not PgBouncer):
```bash
docker compose build
docker compose up -d postgres
docker compose --profile migrate run --rm migrate     # runs backend/db_bringup.sh
```
Then generate the PgBouncer userlist from the now-created `educore_app` role:
```bash
docker compose exec -T postgres psql -U postgres -Atc \
  "SELECT '\"'||rolname||'\" \"'||rolpassword||'\"' FROM pg_authid WHERE rolname='educore_app';" \
  > pgbouncer/userlist.txt
cat pgbouncer/userlist.txt    # sanity-check: "educore_app" "SCRAM-SHA-256$..."
```
Seed the platform Super Admin (optional, first deploy only):
```bash
docker compose run --rm -e POSTGRES_SERVER=postgres -e POSTGRES_PORT=5432 -e DB_PGBOUNCER=false \
  backend python seed_admin.py
```

---

## 7. Bring up the full stack

```bash
docker compose up -d
docker compose ps          # all healthy?
docker compose logs -f caddy   # watch the DNS-01 challenge + cert issuance
```
Caddy builds the custom image (with the Cloudflare plugin) and obtains the wildcard +
apex + api certs via DNS-01 on first start.

---

## 8. Verify (TLS + smoke)

```bash
curl -fsS https://api.erpcore.tech/health                 # {"status":"ok",...}
curl -fsSI https://erpcore.tech | grep -i strict-transport # TLS served by Caddy
```
Browser: open `https://<school>.erpcore.tech/login`, log in, and confirm API calls go to
`https://api.erpcore.tech` (200) and the session cookie is set on `.erpcore.tech` (works across
subdomains).

---

## 9. Scale & connection math

- **Vertical:** the backend uses `WEB_CONCURRENCY` uvicorn workers (default 4). Bump it for more
  CPU (A1 has up to 4 OCPU).
- **Horizontal:** run more backend replicas behind Caddy —
  `docker compose up -d --scale backend=3`. This is **safe** because the rate limiter is
  Redis-backed (shared counter across replicas) and Caddy load-balances to `backend:8000` via
  Docker DNS. Only Caddy publishes ports, so replicas don't collide.
- **Connections:** each backend replica opens up to `DB_POOL_SIZE`(20)+`DB_MAX_OVERFLOW`(10) = **30**
  connections to **PgBouncer** (`:6432`). PgBouncer (transaction mode) multiplexes them onto
  `default_pool_size`(25) **server** connections to Postgres — well under Postgres `max_connections`
  (100 default). So even 3 replicas (90 client conns) map to ~25 server conns. Raise
  `default_pool_size` **and** Postgres `max_connections` together if you scale further. RLS
  `SET LOCAL app.current_tenant` is set per transaction and is fully compatible with transaction
  pooling (one server backend per transaction).

---

## 10. Backups & DR (Object Storage)

Self-hosted Postgres on Always Free has **no PITR**, so nightly logical dumps **are** the DR plan.
`deploy/backup/pg_backup.sh` runs `pg_dump -Fc` → AES-256 encrypt → upload via **rclone** to
**Oracle Object Storage** (Always Free 10 GB, same tenancy, $0).

Setup:
```bash
sudo apt-get install -y rclone
# Configure an rclone remote against Oracle Object Storage's S3-compatible endpoint
# (Customer Secret Key from the OCI console) OR an AWS S3 bucket (your $135 credits):
rclone config    # name it e.g. "oos", type "s3", provider "Other", endpoint = OCI S3 endpoint
# Create the bucket "erp-backups" (OCI console or `rclone mkdir oos:erp-backups`).
```
Cron (nightly 02:00 UTC):
```bash
crontab -e
# 0 2 * * *  cd /opt/school-erp/deploy && set -a && . ./.env && set +a && ./backup/pg_backup.sh >> /var/log/erp-backup.log 2>&1
```
**Restore** is documented at the top of `pg_backup.sh` (rclone copy → openssl decrypt → `pg_restore`).
Test a restore into a throwaway DB quarterly. **Alternative:** point `BACKUP_RCLONE_REMOTE` at an
AWS S3 rclone remote to use your AWS credits instead.

---

## 11. Continuous deployment

Push to `main`; after **CI** passes, `.github/workflows/deploy-oracle.yml` SSHes to the VM, pulls,
`docker compose build`, runs the migrate Job **only when** `db/schema.sql`/`migrate_*`/`create_*`/
`enable_rls.py`/`db_bringup.sh` changed, then `docker compose up -d`. Set repo secrets
`ORACLE_HOST`, `ORACLE_SSH_USER`, `ORACLE_SSH_KEY`. App secrets stay only in `deploy/.env` on the VM.

---

## 12. Secret rotation

- `PII_ENCRYPTION_KEY` (also encrypts each school's Razorpay secrets) and the **JWT keys** are
  back-up-or-bust — store them off-box. Rotating JWT keys invalidates in-flight access/MFA tokens
  (DB refresh tokens still mint new ones, so users aren't logged out); rotate in a low-traffic
  window and `docker compose up -d --force-recreate backend`.
- `educore_app` password: update the role in Postgres, update `APP_DB_PASSWORD` in `.env`,
  **regenerate `pgbouncer/userlist.txt`** (step 6), then `docker compose up -d --force-recreate
  backend pgbouncer`.
- Cloudflare token: rotate in Cloudflare, update `.env`, recreate `caddy`.

---

## 13. Rollback

- **App:** redeploy a previous commit — `git reset --hard <sha> && docker compose build &&
  docker compose up -d` (or `git revert` and push to let CD redeploy). Images rebuild from that
  source; the previous image also stays until `docker image prune`.
- **Data:** restore the latest dump (step 10). Migrations are additive/idempotent; a schema
  rollback is a manual forward-fix, with the encrypted dump as the safety net.

---

## 14. What was verified locally (no cloud)

Docker and the OCI CLI were **not** used to provision anything. Verified on the dev machine:
`docker compose config` (compose v2) parses the stack; `caddy validate` passes against the
Caddyfile (custom build incl. the Cloudflare DNS module); backend `pytest` (103) + the Redis-limiter
test pass; `ruff`/`black`/`isort` clean; frontend `tsc --noEmit` clean; `git grep "educore.com"` is
clean. The image `docker build`, DNS-01 issuance, and live A1 provisioning happen on the VM.

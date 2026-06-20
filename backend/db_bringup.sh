#!/usr/bin/env bash
# Ordered, idempotent database bring-up — run as the Postgres OWNER/ADMIN.
#
# Run it as a one-shot against the backend image (e.g.
#   docker run --rm --env-file db.env <backend-image> bash db_bringup.sh
# ) or from CI/CD. The order is load-bearing and mirrors CI exactly:
#   schema.sql  ->  table creators (create_all)  ->  idempotent migrations  ->  enable_rls.py LAST.
# enable_rls.py installs the fail-closed tenant_isolation RLS policy on every school_id table
# and provisions the non-owner application role (educore_app) the app connects as. It MUST run
# last, after every table exists.
#
# Required env (inject from your secret store / --env-file):
#   POSTGRES_SERVER / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / POSTGRES_PORT
#       -> the ADMIN (owner) connection; owner runs all DDL/migrations.
#   APP_DB_USER / APP_DB_PASSWORD   -> the non-owner role enable_rls.py creates/grants.
#   DB_SSL_REQUIRE=true             -> require TLS to the Postgres server (managed PG).
set -euo pipefail

echo "==> [1/4] schema.sql (first run only; skipped once 'schools' exists)"
python apply_schema.py db/schema.sql

echo "==> [2/4] table creators (idempotent — create_all checkfirst)"
python create_academics_tables.py
python create_student_portal_tables.py
python create_messaging_tables.py
python create_activities_tables.py
python create_feature_tables.py

echo "==> [3/4] migrations (idempotent)"
python migrate_student_fields.py
python migrate_db_hardening.py
python migrate_class.py
python migrate_fee_schedule.py
python migrate_admissions_enquiry.py
python migrate_razorpay_per_tenant.py
python migrate_whatsapp_optional.py
python migrate_fee_options.py
python migrate_resources.py

echo "==> [4/4] enable_rls.py (LAST — RLS policies + non-owner app role)"
python enable_rls.py

echo "==> bring-up complete."

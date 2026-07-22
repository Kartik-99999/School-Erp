#!/usr/bin/env bash
# Nightly logical backup: pg_dump (custom format) -> AES-256 encrypt -> Object Storage (rclone).
#
# Oracle Always Free self-hosted Postgres has NO point-in-time recovery, so THESE NIGHTLY DUMPS
# ARE THE DISASTER-RECOVERY PLAN. Restore (see the deployment runbook, kept outside this repo):
#   rclone copy "$BACKUP_RCLONE_REMOTE/<file>.enc" /tmp/ && \
#   openssl enc -d -aes-256-cbc -pbkdf2 -in /tmp/<file>.enc -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE" \
#     | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean
#
# Run from deploy/ with the stack env loaded, e.g. via cron:
#   0 2 * * *  cd /opt/school-erp/deploy && set -a && . ./.env && set +a && ./backup/pg_backup.sh >> /var/log/erp-backup.log 2>&1
#
# Default backend = Oracle Object Storage (Always Free 10 GB, same tenancy, $0) via an rclone
# S3-compatible remote. AWS S3 is an alternative — just point BACKUP_RCLONE_REMOTE at an s3 remote.
set -euo pipefail

: "${POSTGRES_USER:?set POSTGRES_USER}"
: "${POSTGRES_DB:?set POSTGRES_DB}"
: "${BACKUP_RCLONE_REMOTE:?set BACKUP_RCLONE_REMOTE}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?set BACKUP_ENCRYPTION_PASSPHRASE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="school_erp_${TS}.dump"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[$(date -u +%FT%TZ)] dumping $POSTGRES_DB ..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$TMP/$FILE"

echo "[$(date -u +%FT%TZ)] encrypting ..."
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$TMP/$FILE" -out "$TMP/$FILE.enc" -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE"

echo "[$(date -u +%FT%TZ)] uploading to $BACKUP_RCLONE_REMOTE ..."
rclone copy "$TMP/$FILE.enc" "$BACKUP_RCLONE_REMOTE/"

echo "[$(date -u +%FT%TZ)] pruning backups older than ${RETENTION_DAYS}d ..."
rclone delete --min-age "${RETENTION_DAYS}d" "$BACKUP_RCLONE_REMOTE/" || true

echo "[$(date -u +%FT%TZ)] done: ${FILE}.enc"

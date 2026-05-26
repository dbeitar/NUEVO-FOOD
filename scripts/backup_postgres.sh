#!/usr/bin/env bash
# Backup PostgreSQL MVPFOOD (Docker o local).
# Uso: ./scripts/backup_postgres.sh [directorio_salida]
set -euo pipefail
OUT_DIR="${1:-$(dirname "$0")/../backups/pg}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$OUT_DIR/mvpfood_${STAMP}.dump"

PGUSER="${POSTGRES_USER:-mvpfood}"
PGDB="${POSTGRES_DB:-mvpfood}"
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5434}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^mvpfood-postgres$'; then
  docker exec mvpfood-postgres pg_dump -U "$PGUSER" -d "$PGDB" -Fc -f "/tmp/mvpfood.dump"
  docker cp "mvpfood-postgres:/tmp/mvpfood.dump" "$FILE"
  docker exec mvpfood-postgres rm -f /tmp/mvpfood.dump
else
  PGPASSWORD="${POSTGRES_PASSWORD:-mvpfood_dev_secret}" pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -Fc -f "$FILE"
fi

echo "Backup: $FILE"
find "$OUT_DIR" -name 'mvpfood_*.dump' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "Retención: ${RETENTION_DAYS} días"

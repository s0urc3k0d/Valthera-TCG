#!/usr/bin/env bash
set -euo pipefail

# Exporte la base Supabase PostgreSQL au format custom pg_dump (.dump)
# Prérequis: pg_dump
# Usage:
#   SUPABASE_DB_URL='postgresql://user:pass@host:5432/postgres' ./scripts/migration/export_supabase_db.sh

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${OUT_DIR:-./backups/supabase/${TIMESTAMP}}"
DUMP_FILE="${OUT_DIR}/supabase.dump"
SCHEMA_FILE="${OUT_DIR}/schema_only.sql"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "❌ SUPABASE_DB_URL manquant"
  echo "Exemple: export SUPABASE_DB_URL='postgresql://...'"
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "📦 Export DB Supabase -> ${DUMP_FILE}"
pg_dump "${SUPABASE_DB_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "${DUMP_FILE}"

echo "🧱 Export schéma seul -> ${SCHEMA_FILE}"
pg_dump "${SUPABASE_DB_URL}" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file "${SCHEMA_FILE}"

echo "✅ Export terminé"
ls -lh "${OUT_DIR}"

#!/usr/bin/env bash
set -euo pipefail

# Importe un dump Supabase vers PostgreSQL cible
# Prérequis: pg_restore, psql
# Usage:
#   TARGET_DB_URL='postgresql://user:pass@host:5432/valthera' DUMP_FILE=./backups/supabase/xxx/supabase.dump ./scripts/migration/import_to_postgres.sh

if [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "❌ TARGET_DB_URL manquant"
  exit 1
fi

if [[ -z "${DUMP_FILE:-}" ]]; then
  echo "❌ DUMP_FILE manquant"
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "❌ Fichier introuvable: ${DUMP_FILE}"
  exit 1
fi

echo "⚠️  Cette opération peut écraser des données sur la base cible"

echo "🧹 Nettoyage schéma public (optionnel)"
if [[ "${RESET_PUBLIC_SCHEMA:-false}" == "true" ]]; then
  psql "${TARGET_DB_URL}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
fi

echo "📥 Import dump ${DUMP_FILE}"
pg_restore \
  --dbname="${TARGET_DB_URL}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "${DUMP_FILE}"

echo "✅ Import terminé"

#!/usr/bin/env bash
set -euo pipefail

# Migre un bucket Supabase Storage vers un bucket S3-compatible (MinIO, AWS S3, etc.)
# Prérequis: aws cli
#
# Variables requises:
#   SOURCE_BUCKET
#   TARGET_BUCKET
#   SOURCE_ENDPOINT (ex: https://<project-ref>.supabase.co/storage/v1/s3)
#   TARGET_ENDPOINT (ex: https://minio.mondomaine.tld)
#   SOURCE_ACCESS_KEY / SOURCE_SECRET_KEY
#   TARGET_ACCESS_KEY / TARGET_SECRET_KEY
#
# Usage:
#   SOURCE_BUCKET=card-images TARGET_BUCKET=valthera-card-images ... ./scripts/migration/migrate_supabase_bucket.sh

for var in SOURCE_BUCKET TARGET_BUCKET SOURCE_ENDPOINT TARGET_ENDPOINT SOURCE_ACCESS_KEY SOURCE_SECRET_KEY TARGET_ACCESS_KEY TARGET_SECRET_KEY; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ ${var} manquant"
    exit 1
  fi
done

WORK_DIR="${WORK_DIR:-./backups/storage/${SOURCE_BUCKET}}"
mkdir -p "${WORK_DIR}"

echo "📥 Sync source bucket (${SOURCE_BUCKET}) -> ${WORK_DIR}"
AWS_ACCESS_KEY_ID="${SOURCE_ACCESS_KEY}" \
AWS_SECRET_ACCESS_KEY="${SOURCE_SECRET_KEY}" \
aws --endpoint-url "${SOURCE_ENDPOINT}" s3 sync "s3://${SOURCE_BUCKET}" "${WORK_DIR}"

echo "📤 Sync ${WORK_DIR} -> target bucket (${TARGET_BUCKET})"
AWS_ACCESS_KEY_ID="${TARGET_ACCESS_KEY}" \
AWS_SECRET_ACCESS_KEY="${TARGET_SECRET_KEY}" \
aws --endpoint-url "${TARGET_ENDPOINT}" s3 sync "${WORK_DIR}" "s3://${TARGET_BUCKET}"

echo "✅ Migration bucket terminée"

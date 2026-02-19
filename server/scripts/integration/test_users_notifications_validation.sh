#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROOT_DIR="$(cd "$SERVER_DIR/.." && pwd)"

CONTAINER_NAME="valthera-users-notifs-it-pg"
PG_PORT="55433"
PG_DB="valthera_it"
PG_USER="valthera"
PG_PASSWORD="valthera_pwd"
API_PORT="4011"
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${PG_PORT}/${PG_DB}"

API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
  fi
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[1/8] Build API"
cd "$SERVER_DIR"
npm run build >/dev/null

echo "[2/8] Start temporary PostgreSQL"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_DB="$PG_DB" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASSWORD" \
  -p "${PG_PORT}:5432" \
  postgres:16-alpine >/dev/null

echo "[3/8] Wait for PostgreSQL readiness"
for _ in {1..50}; do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null

for _ in {1..50}; do
  DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -tA -c "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" 2>/dev/null || true)
  if [[ "$DB_EXISTS" == "1" ]]; then
    break
  fi
  sleep 1
done

DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$PG_USER" -d postgres -tA -c "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" 2>/dev/null || true)
if [[ "$DB_EXISTS" != "1" ]]; then
  echo "PostgreSQL database ${PG_DB} not ready"
  exit 1
fi

echo "[4/8] Initialize schema"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" < "$ROOT_DIR/database/postgresql-init.sql" >/dev/null

echo "[5/8] Start API server"
AUTH_ENABLED=false DATABASE_URL="$DATABASE_URL" PORT="$API_PORT" node "$SERVER_DIR/dist/index.js" >/tmp/valthera-api-users-notifs-it.log 2>&1 &
API_PID=$!

for _ in {1..30}; do
  if curl -sS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -sS "http://127.0.0.1:${API_PORT}/health" >/dev/null

echo "[6/8] Validate users payload rules"
HTTP_CODE=$(curl -sS -o /tmp/valthera-users-invalid.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/users" \
  -H 'Content-Type: application/json' \
  -d '{"username":"ab","email":"not-an-email"}')
if [[ "$HTTP_CODE" != "400" ]]; then
  echo "Expected HTTP 400 on invalid user payload, got $HTTP_CODE"
  cat /tmp/valthera-users-invalid.json
  exit 1
fi

HTTP_CODE=$(curl -sS -o /tmp/valthera-users-created.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/users" \
  -H 'Content-Type: application/json' \
  -d '{"username":"player_one","email":"player.one@example.com","availableBoosters":1,"isPublicProfile":true}')
if [[ "$HTTP_CODE" != "201" ]]; then
  echo "Expected HTTP 201 on valid user creation, got $HTTP_CODE"
  cat /tmp/valthera-users-created.json
  exit 1
fi

USER_ID=$(python3 - <<'PY'
import json
with open('/tmp/valthera-users-created.json', 'r', encoding='utf-8') as f:
    print(json.load(f)['id'])
PY
)

HTTP_CODE=$(curl -sS -o /tmp/valthera-users-patch-invalid.json -w "%{http_code}" \
  -X PATCH "http://127.0.0.1:${API_PORT}/users/${USER_ID}" \
  -H 'Content-Type: application/json' \
  -d '{"availableBoosters":-1}')
if [[ "$HTTP_CODE" != "400" ]]; then
  echo "Expected HTTP 400 on invalid user update payload, got $HTTP_CODE"
  cat /tmp/valthera-users-patch-invalid.json
  exit 1
fi

echo "[7/8] Validate notifications payload rules"
HTTP_CODE=$(curl -sS -o /tmp/valthera-notifs-invalid.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/notifications" \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"${USER_ID}\",\"type\":\"\",\"title\":\"\"}")
if [[ "$HTTP_CODE" != "400" ]]; then
  echo "Expected HTTP 400 on invalid notification payload, got $HTTP_CODE"
  cat /tmp/valthera-notifs-invalid.json
  exit 1
fi

HTTP_CODE=$(curl -sS -o /tmp/valthera-notifs-created.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/notifications" \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"${USER_ID}\",\"type\":\"trade_received\",\"title\":\"Trade received\",\"message\":\"You received an offer\",\"data\":{\"tradeId\":\"abc\"}}")
if [[ "$HTTP_CODE" != "201" ]]; then
  echo "Expected HTTP 201 on valid notification payload, got $HTTP_CODE"
  cat /tmp/valthera-notifs-created.json
  exit 1
fi

NOTIFICATION_ID=$(python3 - <<'PY'
import json
with open('/tmp/valthera-notifs-created.json', 'r', encoding='utf-8') as f:
    print(json.load(f)['id'])
PY
)

HTTP_CODE=$(curl -sS -o /tmp/valthera-notifs-read.json -w "%{http_code}" \
  -X PATCH "http://127.0.0.1:${API_PORT}/notifications/${NOTIFICATION_ID}/read")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Expected HTTP 200 on mark notification as read, got $HTTP_CODE"
  cat /tmp/valthera-notifs-read.json
  exit 1
fi

IS_READ=$(python3 - <<'PY'
import json
with open('/tmp/valthera-notifs-read.json', 'r', encoding='utf-8') as f:
    print('true' if json.load(f).get('isRead') else 'false')
PY
)
if [[ "$IS_READ" != "true" ]]; then
  echo "Notification should be marked as read"
  cat /tmp/valthera-notifs-read.json
  exit 1
fi

echo "[8/8] Integration test passed"
echo "Users/notifications payload validation and core flow are validated."
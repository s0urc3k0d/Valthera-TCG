#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROOT_DIR="$(cd "$SERVER_DIR/.." && pwd)"

CONTAINER_NAME="valthera-trade-it-pg"
PG_PORT="55432"
PG_DB="valthera_it"
PG_USER="valthera"
PG_PASSWORD="valthera_pwd"
API_PORT="4010"
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
for _ in {1..40}; do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null

echo "[4/8] Initialize schema"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" < "$ROOT_DIR/database/postgresql-init.sql" >/dev/null

echo "[5/8] Start API server"
AUTH_ENABLED=false DATABASE_URL="$DATABASE_URL" PORT="$API_PORT" node "$SERVER_DIR/dist/index.js" >/tmp/valthera-api-it.log 2>&1 &
API_PID=$!

for _ in {1..30}; do
  if curl -sS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -sS "http://127.0.0.1:${API_PORT}/health" >/dev/null

echo "[6/8] Scenario A - successful atomic accept"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" <<'SQL' >/dev/null
TRUNCATE TABLE trades, user_collections, cards, users RESTART IDENTITY CASCADE;

INSERT INTO users (id, username, email, cards_for_trade)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'sender', 'sender@example.com', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::text[]),
  ('22222222-2222-2222-2222-222222222222', 'recipient', 'recipient@example.com', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::text[]);

INSERT INTO cards (id, name, card_type, rarity)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Offered Card', 'monster', 'common'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Requested Card', 'monster', 'common');

INSERT INTO user_collections (user_id, card_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

INSERT INTO trades (
  id,
  from_user_id,
  to_user_id,
  from_username,
  to_username,
  status,
  offered_cards,
  requested_cards
)
VALUES (
  '99999999-9999-9999-9999-999999999991',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'sender',
  'recipient',
  'pending',
  '[{"cardId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","quantity":1}]'::jsonb,
  '[{"cardId":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","quantity":1}]'::jsonb
);
SQL

HTTP_CODE=$(curl -sS -o /tmp/valthera-it-success.json -w "%{http_code}" -X POST "http://127.0.0.1:${API_PORT}/trades/99999999-9999-9999-9999-999999999991/accept")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Expected HTTP 200, got $HTTP_CODE"
  cat /tmp/valthera-it-success.json
  exit 1
fi

TRADE_STATUS=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT status FROM trades WHERE id = '99999999-9999-9999-9999-999999999991';")
if [[ "$TRADE_STATUS" != "accepted" ]]; then
  echo "Trade status should be accepted, got: $TRADE_STATUS"
  exit 1
fi

SENDER_HAS_REQUESTED=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT COUNT(*) FROM user_collections WHERE user_id='11111111-1111-1111-1111-111111111111' AND card_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';")
RECIPIENT_HAS_OFFERED=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT COUNT(*) FROM user_collections WHERE user_id='22222222-2222-2222-2222-222222222222' AND card_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';")
if [[ "$SENDER_HAS_REQUESTED" != "1" || "$RECIPIENT_HAS_OFFERED" != "1" ]]; then
  echo "Collections were not swapped correctly"
  exit 1
fi

echo "[7/8] Scenario B - reject when requested card is missing"
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" <<'SQL' >/dev/null
TRUNCATE TABLE trades, user_collections, cards, users RESTART IDENTITY CASCADE;

INSERT INTO users (id, username, email, cards_for_trade)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'sender', 'sender@example.com', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::text[]),
  ('22222222-2222-2222-2222-222222222222', 'recipient', 'recipient@example.com', ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::text[]);

INSERT INTO cards (id, name, card_type, rarity)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Offered Card', 'monster', 'common'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Requested Card', 'monster', 'common'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Missing Requested Card', 'monster', 'common');

INSERT INTO user_collections (user_id, card_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

INSERT INTO trades (
  id,
  from_user_id,
  to_user_id,
  from_username,
  to_username,
  status,
  offered_cards,
  requested_cards
)
VALUES (
  '99999999-9999-9999-9999-999999999992',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'sender',
  'recipient',
  'pending',
  '[{"cardId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","quantity":1}]'::jsonb,
  '[{"cardId":"cccccccc-cccc-cccc-cccc-cccccccccccc","quantity":1}]'::jsonb
);
SQL

HTTP_CODE=$(curl -sS -o /tmp/valthera-it-failure.json -w "%{http_code}" -X POST "http://127.0.0.1:${API_PORT}/trades/99999999-9999-9999-9999-999999999992/accept")
if [[ "$HTTP_CODE" != "409" ]]; then
  echo "Expected HTTP 409, got $HTTP_CODE"
  cat /tmp/valthera-it-failure.json
  exit 1
fi

TRADE_STATUS=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT status FROM trades WHERE id = '99999999-9999-9999-9999-999999999992';")
if [[ "$TRADE_STATUS" != "pending" ]]; then
  echo "Trade status should remain pending, got: $TRADE_STATUS"
  exit 1
fi

RECIPIENT_STILL_HAS_ORIGINAL=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT COUNT(*) FROM user_collections WHERE user_id='22222222-2222-2222-2222-222222222222' AND card_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';")
RECIPIENT_HAS_MISSING=$(docker exec "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$PG_DB" -c "SELECT COUNT(*) FROM user_collections WHERE user_id='22222222-2222-2222-2222-222222222222' AND card_id='cccccccc-cccc-cccc-cccc-cccccccccccc';")
if [[ "$RECIPIENT_STILL_HAS_ORIGINAL" != "1" || "$RECIPIENT_HAS_MISSING" != "0" ]]; then
  echo "Collections should remain unchanged in failing scenario"
  exit 1
fi

echo "[8/8] Integration test passed"
echo "Atomic trade acceptance is validated for success and rollback scenarios."
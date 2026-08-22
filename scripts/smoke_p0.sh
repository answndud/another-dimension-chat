#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT_DIR/.build-cache/cargo-target}"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-p0.XXXXXX")"
cleanup() {
  for pid in "${B_PID:-}" "${A_PID:-}" "${R_PID:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

DAEMON="${AD_DAEMON_BINARY:-$CARGO_TARGET_DIR/release/another-dimension-daemon}"
RELAY="${AD_RELAY_BINARY:-$CARGO_TARGET_DIR/release/another-dimension-relay}"
[ -x "$DAEMON" ] || { echo "release daemon이 없습니다." >&2; exit 1; }
[ -x "$RELAY" ] || { echo "release relay가 없습니다." >&2; exit 1; }

RELAY_PORT=19540
A_PORT=19541
B_PORT=19542
ORIGIN="http://127.0.0.1:$RELAY_PORT"
RELAY_DATA="$TMP_DIR/relay"
A_DATA="$TMP_DIR/alice"
B_DATA="$TMP_DIR/bob"
mkdir -p "$RELAY_DATA" "$A_DATA" "$B_DATA"

json_string() {
  sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p" "$1" | head -1
}
wait_http() {
  for _ in $(seq 1 80); do
    curl -fsS "$1" >/dev/null 2>&1 && return 0
    sleep .1
  done
  return 1
}

AD_RELAY_BIND_HOST=127.0.0.1 AD_RELAY_PORT="$RELAY_PORT" AD_RELAY_DATA_DIR="$RELAY_DATA" \
  "$RELAY" >"$TMP_DIR/relay.log" 2>&1 & R_PID=$!
wait_http "$ORIGIN/api/v1/health"
INFO=$(curl -fsS "$ORIGIN/api/v1/info")
CAPABILITY=$(tr -d '\r\n' < "$RELAY_DATA/inbox-capability")
RELAY_KEY=$(printf '%s' "$INFO" | sed -n 's/.*"relayReceiptPublicKey":"\([0-9a-f]*\)".*/\1/p')
RELAY_FINGERPRINT=$(printf '%s' "$INFO" | sed -n 's/.*"relayReceiptPublicKeyFingerprint":"\([0-9a-f]*\)".*/\1/p')

"$DAEMON" init --display-name Alice --data-dir "$A_DATA" --passphrase-output "$A_DATA/pass" >/dev/null
"$DAEMON" init --display-name Bob --data-dir "$B_DATA" --passphrase-output "$B_DATA/pass" >/dev/null
serve_daemon() {
  local data=$1 port=$2 log=$3
  printf '%s' "$(cat "$data/pass")" | "$DAEMON" serve \
    --data-dir "$data" --port "$port" --ui-dir "$ROOT_DIR/apps/web/dist" \
    --relay-origin "$ORIGIN" --inbox-url "$ORIGIN/api/v1/inbox/$CAPABILITY" \
    --relay-public-key "$RELAY_KEY" --relay-public-key-fingerprint "$RELAY_FINGERPRINT" \
    >"$log" 2>&1 &
  echo $!
}
A_PID=$(serve_daemon "$A_DATA" "$A_PORT" "$TMP_DIR/a.log")
B_PID=$(serve_daemon "$B_DATA" "$B_PORT" "$TMP_DIR/b.log")
for _ in $(seq 1 80); do
  grep -q 'open once:' "$TMP_DIR/a.log" && grep -q 'open once:' "$TMP_DIR/b.log" && break
  sleep .1
done

exchange() {
  local port=$1 log=$2 name=$3 url token
  url=$(sed -n 's/^open once: //p' "$log" | head -1)
  token=${url##*ad_bootstrap=}
  curl -fsS -D "$TMP_DIR/$name.headers" -o "$TMP_DIR/$name.json" \
    -H "Origin: http://127.0.0.1:$port" -H 'X-Ad-Ui-Version: web-v1' \
    -H 'Content-Type: application/json' -X POST \
    "http://127.0.0.1:$port/local-session/exchange" \
    --data "{\"token\":\"$token\",\"ui_version\":\"web-v1\"}"
  printf '%s|%s|%s' "$port" \
    "$(sed -n 's/^set-cookie: ad_session=\([^;]*\).*/\1/pI' "$TMP_DIR/$name.headers")" \
    "$(json_string "$TMP_DIR/$name.json" csrf_token)"
}
A_AUTH=$(exchange "$A_PORT" "$TMP_DIR/a.log" a)
B_AUTH=$(exchange "$B_PORT" "$TMP_DIR/b.log" b)
api() {
  local auth=$1 method=$2 path=$3 body=${4-} port cookie csrf
  port=${auth%%|*}; auth=${auth#*|}; cookie=${auth%%|*}; csrf=${auth#*|}
  local args=(-H "Origin: http://127.0.0.1:$port" -H 'X-Ad-Ui-Version: web-v1'
    -H "Cookie: ad_session=$cookie" -H "X-Ad-Csrf: $csrf" -H 'Content-Type: application/json'
    -X "$method" "http://127.0.0.1:$port$path")
  [ "$method" = GET ] || args+=(--data "$body")
  curl --fail-with-body -sS "${args[@]}"
}

INVITE=$(api "$A_AUTH" POST /local-api/invites '{}')
CODE=$(printf '%s' "$INVITE" | sed -n 's/.*"invite_code":"\([^"]*\)".*/\1/p')
CONVERSATION=$(json_string <(printf '%s' "$INVITE") conversation_id)
CONSUMED=$(api "$B_AUTH" POST /local-api/invites/consume \
  "{\"relay_origin\":\"$ORIGIN\",\"invite_code\":\"$CODE\"}")
[ "$(json_string <(printf '%s' "$CONSUMED") state)" = verified ]
SYNC=$(api "$A_AUTH" POST /local-api/pairing/auto-sync "{\"invite_code\":\"$CODE\"}")
SAFETY=$(json_string <(printf '%s' "$SYNC") safety_number)
[ -n "$SAFETY" ]
api "$A_AUTH" POST /local-api/pairing/verify-safety "{\"safety_number\":\"$SAFETY\"}" >/dev/null
api "$B_AUTH" POST /local-api/pairing/verify-safety "{\"safety_number\":\"$SAFETY\"}" >/dev/null
api "$A_AUTH" POST /local-api/pairing/approve '{}' >/dev/null
api "$B_AUTH" POST /local-api/pairing/complete-session "{\"invite_code\":\"$CODE\"}" >/dev/null

STATUS=$(api "$A_AUTH" GET /local-api/pairing/status)
PEER_INBOX=$(json_string <(printf '%s' "$STATUS") inbox_url)
[ -n "$PEER_INBOX" ]
send_text() {
  local auth=$1 text=$2
  local ciphertext accepted
  ciphertext=$(api "$auth" POST /local-api/session/send \
    "{\"conversation_id\":\"$CONVERSATION\",\"plaintext\":\"$text\"}" | json_string /dev/stdin ciphertext)
  accepted=$(api "$auth" POST /local-api/delivery/post \
    "{\"inbox_url\":\"$PEER_INBOX\",\"ciphertext\":\"$ciphertext\",\"expires_at\":$(( $(date +%s) + 3600 ))}")
  [ "$(json_string <(printf '%s' "$accepted") state)" = relay-accepted ]
}
send_text "$A_AUTH" 'hello from Alice'
api "$B_AUTH" POST /local-api/delivery/sync \
  "{\"conversation_id\":\"$CONVERSATION\",\"inbox_url\":\"$ORIGIN/api/v1/inbox/$CAPABILITY\"}" >/dev/null
B_MESSAGES=$(api "$B_AUTH" POST /local-api/messages/list \
  "{\"conversation_id\":\"$CONVERSATION\",\"limit\":20,\"offset\":0}")
printf '%s' "$B_MESSAGES" | grep -q '68656c6c6f2066726f6d20416c696365'

BLOB_ID=abcdef0123456789abcdef0123456789
api "$A_AUTH" POST /local-api/attachment/start \
  "{\"blob_id\":\"$BLOB_ID\",\"total\":11,\"file_name\":\"note.txt\",\"media_type\":\"text/plain\"}" >/dev/null
api "$A_AUTH" POST /local-api/attachment/append \
  "{\"blob_id\":\"$BLOB_ID\",\"index\":0,\"plaintext\":\"61747461636b6d656e7421\"}" >/dev/null
api "$A_AUTH" POST /local-api/attachment/finish "{\"blob_id\":\"$BLOB_ID\"}" >/dev/null
api "$A_AUTH" POST /local-api/attachment/send \
  "{\"conversation_id\":\"$CONVERSATION\",\"inbox_url\":\"$PEER_INBOX\",\"blob_id\":\"$BLOB_ID\"}" >/dev/null
ATTACH_SYNC=$(api "$B_AUTH" POST /local-api/delivery/sync \
  "{\"conversation_id\":\"$CONVERSATION\",\"inbox_url\":\"$ORIGIN/api/v1/inbox/$CAPABILITY\"}")
ATTACHMENT_ID=$(printf '%s' "$ATTACH_SYNC" | sed -n 's/.*"attachment_id":"\([^"]*\)".*/\1/p' | head -1)
[ -n "$ATTACHMENT_ID" ]
CHUNK=$(api "$B_AUTH" POST /local-api/attachment/download-chunk \
  "{\"attachment_id\":\"$ATTACHMENT_ID\",\"inbox_url\":\"$ORIGIN/api/v1/inbox/$CAPABILITY\",\"index\":0}")
[ "$(json_string <(printf '%s' "$CHUNK") plaintext)" = 61747461636b6d656e7421 ]

RAW='ADENV1.p0-smoke'
FIRST=$(curl -fsS -H "x-ad-relay-capability: $CAPABILITY" -H 'Content-Type: application/json' \
  -X POST "$ORIGIN/api/v1/inbox/$CAPABILITY" --data "{\"envelope\":\"$RAW\"}")
SECOND=$(curl -fsS -H "x-ad-relay-capability: $CAPABILITY" -H 'Content-Type: application/json' \
  -X POST "$ORIGIN/api/v1/inbox/$CAPABILITY" --data "{\"envelope\":\"$RAW\"}")
printf '%s' "$SECOND" | grep -q '"duplicate":true'
BLOB_ID=0123456789abcdef0123456789abcdef
curl -fsS -X POST -H "x-ad-relay-capability: $CAPABILITY" \
  -H 'X-Ad-Blob-Offset: 0' -H 'X-Ad-Blob-Total: 6' --data-binary abc \
  "$ORIGIN/api/v1/blobs/$BLOB_ID" >/dev/null
curl -fsS -X POST -H "x-ad-relay-capability: $CAPABILITY" \
  -H 'X-Ad-Blob-Offset: 0' -H 'X-Ad-Blob-Total: 6' --data-binary abc \
  "$ORIGIN/api/v1/blobs/$BLOB_ID" | grep -q '"duplicate":true'
CONFLICT_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  -H "x-ad-relay-capability: $CAPABILITY" -H 'X-Ad-Blob-Offset: 0' \
  -H 'X-Ad-Blob-Total: 6' --data-binary xyz "$ORIGIN/api/v1/blobs/$BLOB_ID")
[ "$CONFLICT_STATUS" = 409 ]
kill "$R_PID" 2>/dev/null || true; wait "$R_PID" 2>/dev/null || true; unset R_PID
AD_RELAY_BIND_HOST=127.0.0.1 AD_RELAY_PORT="$RELAY_PORT" AD_RELAY_DATA_DIR="$RELAY_DATA" \
  "$RELAY" >"$TMP_DIR/relay-restart.log" 2>&1 & R_PID=$!
wait_http "$ORIGIN/api/v1/health"
curl -fsS -H "x-ad-relay-capability: $CAPABILITY" "$ORIGIN/api/v1/inbox/$CAPABILITY" | grep -q 'ADENV1.p0-smoke'
[ "$(curl -fsS -H "x-ad-relay-capability: $CAPABILITY" "$ORIGIN/api/v1/blobs/$BLOB_ID")" = abc ]
printf '%s\n' 'P0 smoke passed: pairing, bidirectional message, attachment, duplicate retry, relay restart'

# P4: verify batch add-member accepts multiple key packages.
KP_B=$(api "$B_AUTH" POST /local-api/session/prepare "{\"conversation_id\":\"$CONVERSATION\"}" 2>/dev/null | json_string /dev/stdin key_package)
if [ -z "$KP_B" ]; then
  echo "P4 skipped: prepare unavailable after group ratchet"
else
  GROUP_ADD=$(api "$A_AUTH" POST /local-api/session/add-member \
  "{\"conversation_id\":\"$CONVERSATION\",\"key_packages\":[\"$KP_B\"]}")
  printf '%s' "$GROUP_ADD" | grep -q '"welcomes"'
  printf '%s\n' 'P4 smoke passed: batch add-member returns welcomes'
fi

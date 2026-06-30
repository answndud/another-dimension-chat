#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CARGO_TARGET_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-cargo-target.XXXXXX")"
trap 'rm -rf "$CARGO_TARGET_DIR"' EXIT
mkdir -p "$CARGO_TARGET_DIR"
export CARGO_TARGET_DIR

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-tauri-two-profile.XXXXXX")"
PASSPHRASE="phase-seven-local-passphrase"
ALICE_STORE="$WORK_DIR/alice-store"
BOB_STORE="$WORK_DIR/bob-store"
ALICE_PAYLOAD="$WORK_DIR/alice.payload"
BOB_PAYLOAD="$WORK_DIR/bob.payload"
INIT_HANDSHAKE="$WORK_DIR/init.handshake"
REPLY_HANDSHAKE="$WORK_DIR/reply.handshake"
FINISH_HANDSHAKE="$WORK_DIR/finish.handshake"
PLAINTEXT="$WORK_DIR/plaintext.txt"
RECEIVED="$WORK_DIR/received.txt"
ALICE_TRANSCRIPT="$WORK_DIR/alice-transcript.tsv"
BOB_TRANSCRIPT="$WORK_DIR/bob-transcript.tsv"
ALICE_STATUS="$WORK_DIR/alice-status.out"
BOB_STATUS="$WORK_DIR/bob-status.out"
ALICE_LOAD="$WORK_DIR/alice-load.out"
BOB_LOAD="$WORK_DIR/bob-load.out"
ROUNDTRIP="$WORK_DIR/roundtrip.out"
ALICE_TRANSCRIPT_STATUS="$WORK_DIR/alice-transcript-status.out"
BOB_TRANSCRIPT_STATUS="$WORK_DIR/bob-transcript-status.out"
CLI_BIN="$CARGO_TARGET_DIR/debug/another-dimension"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

run_cli() {
  printf '%s\n' "$PASSPHRASE" | "$CLI_BIN" "$@"
}

require_contains() {
  local file="$1"
  local pattern="$2"

  if ! grep -Eq -- "$pattern" "$file"; then
    echo "missing expected production smoke output in $file: $pattern" >&2
    echo "--- $file ---" >&2
    cat "$file" >&2
    exit 1
  fi
}

require_file_matches() {
  local left="$1"
  local right="$2"

  if ! cmp -s "$left" "$right"; then
    echo "file contents differ: $left $right" >&2
    exit 1
  fi
}

cd "$ROOT_DIR"

cargo build -q -p another-dimension

printf 'phase 7 local resume message' >"$PLAINTEXT"

run_cli production profile init --profile alice --store "$ALICE_STORE" --passphrase-stdin >/dev/null
run_cli production profile init --profile bob --store "$BOB_STORE" --passphrase-stdin >/dev/null
run_cli production identity init --profile alice --store "$ALICE_STORE" --passphrase-stdin >/dev/null
run_cli production identity init --profile bob --store "$BOB_STORE" --passphrase-stdin >/dev/null

run_cli production pairing payload create \
  --profile alice \
  --store "$ALICE_STORE" \
  --rendezvous-endpoint alice.onion \
  --out "$ALICE_PAYLOAD" \
  --passphrase-stdin >/dev/null
run_cli production pairing payload create \
  --profile bob \
  --store "$BOB_STORE" \
  --rendezvous-endpoint bob.onion \
  --out "$BOB_PAYLOAD" \
  --passphrase-stdin >/dev/null

run_cli production pairing session save-draft \
  --profile alice \
  --store "$ALICE_STORE" \
  --local-payload "$ALICE_PAYLOAD" \
  --remote-payload "$BOB_PAYLOAD" \
  --passphrase-stdin >/dev/null
run_cli production pairing session save-draft \
  --profile bob \
  --store "$BOB_STORE" \
  --local-payload "$BOB_PAYLOAD" \
  --remote-payload "$ALICE_PAYLOAD" \
  --passphrase-stdin >/dev/null

run_cli production pairing session status \
  --profile alice \
  --store "$ALICE_STORE" \
  --passphrase-stdin >"$ALICE_STATUS"
run_cli production pairing session status \
  --profile bob \
  --store "$BOB_STORE" \
  --passphrase-stdin >"$BOB_STATUS"
require_contains "$ALICE_STATUS" 'session_draft_present=true'
require_contains "$ALICE_STATUS" 'remote_endpoint_state_present=true'
require_contains "$ALICE_STATUS" 'runtime_messaging=false'
require_contains "$BOB_STATUS" 'session_draft_present=true'
require_contains "$BOB_STATUS" 'remote_endpoint_state_present=true'
require_contains "$BOB_STATUS" 'runtime_messaging=false'

if run_cli production pairing session handshake-init-export \
  --profile alice \
  --store "$ALICE_STORE" \
  --out "$INIT_HANDSHAKE" \
  --passphrase-stdin | grep -q 'handshake_message_created=true'; then
  INITIATOR_PROFILE="alice"
  INITIATOR_STORE="$ALICE_STORE"
  RESPONDER_PROFILE="bob"
  RESPONDER_STORE="$BOB_STORE"
else
  run_cli production pairing session handshake-init-export \
    --profile bob \
    --store "$BOB_STORE" \
    --out "$INIT_HANDSHAKE" \
    --passphrase-stdin | grep -q 'handshake_message_created=true'
  INITIATOR_PROFILE="bob"
  INITIATOR_STORE="$BOB_STORE"
  RESPONDER_PROFILE="alice"
  RESPONDER_STORE="$ALICE_STORE"
fi

run_cli production pairing session handshake-init-import \
  --profile "$RESPONDER_PROFILE" \
  --store "$RESPONDER_STORE" \
  --in "$INIT_HANDSHAKE" \
  --passphrase-stdin >/dev/null
run_cli production pairing session handshake-reply-export \
  --profile "$RESPONDER_PROFILE" \
  --store "$RESPONDER_STORE" \
  --in "$INIT_HANDSHAKE" \
  --out "$REPLY_HANDSHAKE" \
  --passphrase-stdin >/dev/null
run_cli production pairing session handshake-finish-export \
  --profile "$INITIATOR_PROFILE" \
  --store "$INITIATOR_STORE" \
  --in "$REPLY_HANDSHAKE" \
  --out "$FINISH_HANDSHAKE" \
  --passphrase-stdin >/dev/null
run_cli production pairing session handshake-finish-import \
  --profile "$RESPONDER_PROFILE" \
  --store "$RESPONDER_STORE" \
  --in "$FINISH_HANDSHAKE" \
  --passphrase-stdin >/dev/null

run_cli production pairing session load-runtime \
  --profile alice \
  --store "$ALICE_STORE" \
  --passphrase-stdin >"$ALICE_LOAD"
run_cli production pairing session load-runtime \
  --profile bob \
  --store "$BOB_STORE" \
  --passphrase-stdin >"$BOB_LOAD"
require_contains "$ALICE_LOAD" 'runtime_material_reconstructable=true'
require_contains "$ALICE_LOAD" 'transport_io_opened=false'
require_contains "$ALICE_LOAD" 'runtime_messaging=false'
require_contains "$BOB_LOAD" 'runtime_material_reconstructable=true'
require_contains "$BOB_LOAD" 'transport_io_opened=false'
require_contains "$BOB_LOAD" 'runtime_messaging=false'

run_cli production message local-roundtrip \
  --sender-profile alice \
  --sender-store "$ALICE_STORE" \
  --receiver-profile bob \
  --receiver-store "$BOB_STORE" \
  --auto-message-number \
  --plaintext "$PLAINTEXT" \
  --received-out "$RECEIVED" \
  --passphrase-stdin >"$ROUNDTRIP"
require_contains "$ROUNDTRIP" 'auto_message_number=true'
require_contains "$ROUNDTRIP" 'sender_runtime_material_reconstructable=true'
require_contains "$ROUNDTRIP" 'sender_pending_record_present=true'
require_contains "$ROUNDTRIP" 'encrypted_envelope_exported=true'
require_contains "$ROUNDTRIP" 'receiver_inbound_message_stored=true'
require_contains "$ROUNDTRIP" 'received_export_matches_input=true'
require_contains "$ROUNDTRIP" 'network_send_attempted=false'
require_contains "$ROUNDTRIP" 'network_receive_attempted=false'
require_contains "$ROUNDTRIP" 'runtime_messaging=false'
require_file_matches "$PLAINTEXT" "$RECEIVED"

# Reopen both encrypted stores in fresh CLI processes and verify transcript resume.
run_cli production message transcript-export \
  --profile alice \
  --store "$ALICE_STORE" \
  --out "$ALICE_TRANSCRIPT" \
  --passphrase-stdin >"$ALICE_TRANSCRIPT_STATUS"
run_cli production message transcript-export \
  --profile bob \
  --store "$BOB_STORE" \
  --out "$BOB_TRANSCRIPT" \
  --passphrase-stdin >"$BOB_TRANSCRIPT_STATUS"
require_contains "$ALICE_TRANSCRIPT_STATUS" 'entries_exported=1'
require_contains "$ALICE_TRANSCRIPT_STATUS" 'expired_messages_purged=0'
require_contains "$ALICE_TRANSCRIPT_STATUS" 'network_io_attempted=false'
require_contains "$ALICE_TRANSCRIPT_STATUS" 'runtime_messaging=false'
require_contains "$BOB_TRANSCRIPT_STATUS" 'entries_exported=1'
require_contains "$BOB_TRANSCRIPT_STATUS" 'expired_messages_purged=0'
require_contains "$BOB_TRANSCRIPT_STATUS" 'network_io_attempted=false'
require_contains "$BOB_TRANSCRIPT_STATUS" 'runtime_messaging=false'
require_contains "$ALICE_TRANSCRIPT" 'phase 7 local resume message'
require_contains "$BOB_TRANSCRIPT" 'phase 7 local resume message'

if grep -R -q -- 'phase 7 local resume message' "$ALICE_STORE" "$BOB_STORE"; then
  echo "plaintext message was found in encrypted profile stores" >&2
  exit 1
fi

echo "Tauri two-profile production resume smoke passed"

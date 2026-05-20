#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-demo.XXXXXX")"
AD_HOME="$WORK_DIR/home"
ALICE_PAIR="$WORK_DIR/alice.pair"
BOB_PAIR="$WORK_DIR/bob.pair"
BOB_SCAN_ERR="$WORK_DIR/bob-scan.err"
ALICE_SCAN_ERR="$WORK_DIR/alice-scan.err"
RECEIVE_ONE="$WORK_DIR/receive-one.out"
RECEIVE_TWO="$WORK_DIR/receive-two.out"
MESSAGE="hello from the dev-insecure local demo"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

run_cli() {
  AD_DEV_HOME="$AD_HOME" cargo run -q --features dev-insecure -- "$@"
}

extract_field() {
  local label="$1"
  local file="$2"

  sed -n "s/^${label}: //p" "$file"
}

show_step() {
  printf '\n== %s ==\n' "$1"
}

cd "$ROOT_DIR"

cat <<'BANNER'
Another Dimension Chat dev-insecure local demo

This demonstrates the local prototype flow only. It is not a secure messenger
release, does not use real transport, and does not prove production security.
BANNER

show_step "Create local profiles"
run_cli profile init alice
run_cli profile init bob

show_step "Exchange pairing payloads"
run_cli pairing start --profile alice >"$ALICE_PAIR"
run_cli pairing scan --profile bob "$ALICE_PAIR" >"$BOB_PAIR" 2>"$BOB_SCAN_ERR"
run_cli pairing scan --profile alice "$BOB_PAIR" >/dev/null 2>"$ALICE_SCAN_ERR"

BOB_SAFETY_NUMBER="$(extract_field "safety number" "$BOB_SCAN_ERR")"
ALICE_SAFETY_NUMBER="$(extract_field "safety number" "$ALICE_SCAN_ERR")"
BOB_SAFETY_PHRASE="$(extract_field "safety phrase" "$BOB_SCAN_ERR")"
ALICE_SAFETY_PHRASE="$(extract_field "safety phrase" "$ALICE_SCAN_ERR")"

if [[ "$BOB_SAFETY_NUMBER" != "$ALICE_SAFETY_NUMBER" ]]; then
  echo "safety numbers do not match" >&2
  exit 1
fi

if [[ "$BOB_SAFETY_PHRASE" != "$ALICE_SAFETY_PHRASE" ]]; then
  echo "safety phrases do not match" >&2
  exit 1
fi

printf 'safety number: %s\n' "$BOB_SAFETY_NUMBER"
printf 'safety phrase: %s\n' "$BOB_SAFETY_PHRASE"

show_step "Confirm pairing"
run_cli pairing confirm --profile alice --contact bob
run_cli pairing confirm --profile bob --contact alice

show_step "Send message"
run_cli message send --from alice --to bob "$MESSAGE"

show_step "Receive as Bob"
run_cli message receive --profile bob >"$RECEIVE_ONE"
cat "$RECEIVE_ONE"

if [[ "$(cat "$RECEIVE_ONE")" != "$MESSAGE" ]]; then
  echo "received message did not match demo message" >&2
  exit 1
fi

show_step "Replay check"
run_cli message receive --profile bob >"$RECEIVE_TWO"
if [[ -s "$RECEIVE_TWO" ]]; then
  echo "second receive returned a replayed message" >&2
  cat "$RECEIVE_TWO" >&2
  exit 1
fi
echo "second receive returned no replayed messages"

show_step "Demo complete"
echo "dev-insecure local CLI flow completed"

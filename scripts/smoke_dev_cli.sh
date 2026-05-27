#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=build_cache_env.sh
source "$ROOT_DIR/scripts/build_cache_env.sh"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/another-dimension-smoke.XXXXXX")"
AD_HOME="$WORK_DIR/home"
ALICE_PAIR="$WORK_DIR/alice.pair"
BOB_PAIR="$WORK_DIR/bob.pair"
BOB_SCAN_ERR="$WORK_DIR/bob-scan.err"
ALICE_SCAN_ERR="$WORK_DIR/alice-scan.err"
DUPLICATE_ERR="$WORK_DIR/duplicate.err"
RECEIVE_ONE="$WORK_DIR/receive-one.out"
RECEIVE_TWO="$WORK_DIR/receive-two.out"
MESSAGE="smoke secret message"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

run_cli() {
  AD_DEV_HOME="$AD_HOME" cargo run -q --features dev-insecure -- "$@"
}

extract_safety_number() {
  sed -n 's/^safety number: //p' "$1"
}

extract_safety_phrase() {
  sed -n 's/^safety phrase: //p' "$1"
}

cd "$ROOT_DIR"

run_cli profile init alice >/dev/null
run_cli profile init bob >/dev/null

run_cli pairing start --profile alice >"$ALICE_PAIR"
run_cli pairing scan --profile bob "$ALICE_PAIR" >"$BOB_PAIR" 2>"$BOB_SCAN_ERR"
run_cli pairing scan --profile alice "$BOB_PAIR" >/dev/null 2>"$ALICE_SCAN_ERR"

if [[ "$(extract_safety_number "$BOB_SCAN_ERR")" != "$(extract_safety_number "$ALICE_SCAN_ERR")" ]]; then
  echo "safety numbers do not match" >&2
  exit 1
fi

if [[ "$(extract_safety_phrase "$BOB_SCAN_ERR")" != "$(extract_safety_phrase "$ALICE_SCAN_ERR")" ]]; then
  echo "safety phrases do not match" >&2
  exit 1
fi

if run_cli pairing scan --profile alice "$BOB_PAIR" >/dev/null 2>"$DUPLICATE_ERR"; then
  echo "duplicate pairing scan unexpectedly succeeded" >&2
  exit 1
fi

if ! grep -q "pending pairing already exists: bob" "$DUPLICATE_ERR"; then
  echo "duplicate pairing scan did not print the expected error" >&2
  exit 1
fi

run_cli pairing confirm --profile alice --contact bob >/dev/null
run_cli pairing confirm --profile bob --contact alice >/dev/null

run_cli message send --from alice --to bob "$MESSAGE" >/dev/null
run_cli message receive --profile bob >"$RECEIVE_ONE"
run_cli message receive --profile bob >"$RECEIVE_TWO"

if [[ "$(cat "$RECEIVE_ONE")" != "$MESSAGE" ]]; then
  echo "first receive did not return the expected message" >&2
  exit 1
fi

if [[ -s "$RECEIVE_TWO" ]]; then
  echo "second receive returned a replayed message" >&2
  exit 1
fi

if grep -R -q -- "$MESSAGE" "$AD_HOME"; then
  echo "plaintext message was found in dev store" >&2
  exit 1
fi

if find "$AD_HOME/profiles/alice/own_pairings" "$AD_HOME/profiles/alice/own_pairing_keys" -type f | grep -q .; then
  echo "alice own pairing material was not consumed" >&2
  exit 1
fi

if [[ ! -f "$AD_HOME/profiles/alice/contact_keys/bob.key" ]]; then
  echo "alice contact key was not created" >&2
  exit 1
fi

run_cli pairing expire --profile alice | grep -q "expired pending pairings: 0"
run_cli message expire --profile bob | grep -q "expired envelopes: 1"

echo "dev CLI smoke test passed"

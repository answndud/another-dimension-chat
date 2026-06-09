#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${1:-$ROOT_DIR/docs/peer-field-test-intake}"
RESULTS_FILE="${2:-$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md}"
PEER_A="$REPORT_DIR/peer-a.md"
PEER_B="$REPORT_DIR/peer-b.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing required peer report: $1" >&2
    exit 1
  fi
}

require_file "$PEER_A"
require_file "$PEER_B"

summary_file="$(mktemp)"
trap 'rm -f "$summary_file"' EXIT

node "$ROOT_DIR/docs/peer-field-test-intake/validate-peer-reports.mjs" "$REPORT_DIR"
node "$ROOT_DIR/docs/peer-field-test-intake/summarize-peer-reports.mjs" "$REPORT_DIR" > "$summary_file"

{
  if [ -f "$RESULTS_FILE" ]; then
    printf '\n'
  else
    printf '# Beta Field-Test Results\n\n'
  fi
  printf '## External Peer Summary - %s\n\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  cat "$summary_file"
  printf '\n'
} >> "$RESULTS_FILE"

echo "results_file=$RESULTS_FILE"
echo "status=peer-field-test-summary-appended"

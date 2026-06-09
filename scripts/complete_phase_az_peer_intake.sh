#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${1:-$ROOT_DIR/docs/peer-field-test-intake}"
RESULTS_FILE="${2:-$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md}"
BLOCKER_FILE="${3:-$ROOT_DIR/docs/PEER_FIELD_TEST_BLOCKER.md}"

"$ROOT_DIR/scripts/intake_peer_field_test_results.sh" "$REPORT_DIR" "$RESULTS_FILE"
node "$ROOT_DIR/scripts/promote_peer_field_test_blocker.mjs" "$RESULTS_FILE" "$BLOCKER_FILE"

echo "results_file=$RESULTS_FILE"
echo "blocker_file=$BLOCKER_FILE"
echo "status=phase-az-peer-intake-evidence-ready"
echo "next=scripts/phase_az_status.sh"

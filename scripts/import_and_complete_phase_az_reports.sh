#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$#" -ne 2 ]; then
  echo "usage: scripts/import_and_complete_phase_az_reports.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT" >&2
  exit 2
fi

SOURCE_A="$1"
SOURCE_B="$2"
REPORT_DIR="$ROOT_DIR/docs/peer-field-test-intake"
TARGET_A="$REPORT_DIR/peer-a.md"
TARGET_B="$REPORT_DIR/peer-b.md"
RESULTS_FILE="$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md"
BLOCKER_FILE="$ROOT_DIR/docs/PEER_FIELD_TEST_BLOCKER.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing report file: $1" >&2
    exit 1
  fi
}

require_file "$SOURCE_A"
require_file "$SOURCE_B"

"$ROOT_DIR/scripts/phase_az_import_readiness.sh" "$SOURCE_A" "$SOURCE_B" >/dev/null

source_a_real="$(cd "$(dirname "$SOURCE_A")" && pwd -P)/$(basename "$SOURCE_A")"
source_b_real="$(cd "$(dirname "$SOURCE_B")" && pwd -P)/$(basename "$SOURCE_B")"

if [ "$source_a_real" = "$source_b_real" ]; then
  echo "FAIL peer A and peer B report paths must be different" >&2
  exit 1
fi

if [ -e "$TARGET_A" ] || [ -e "$TARGET_B" ]; then
  echo "FAIL installed peer reports already exist; refusing to overwrite" >&2
  echo "existing_a=$TARGET_A" >&2
  echo "existing_b=$TARGET_B" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cp "$SOURCE_A" "$tmp_dir/peer-a.md"
cp "$SOURCE_B" "$tmp_dir/peer-b.md"

TEMP_RESULTS="$tmp_dir/BETA_FIELD_TEST_RESULTS.md"
TEMP_BLOCKER="$tmp_dir/PEER_FIELD_TEST_BLOCKER.md"

"$ROOT_DIR/scripts/complete_phase_az_peer_intake.sh" "$tmp_dir" "$TEMP_RESULTS" "$TEMP_BLOCKER"

cp "$tmp_dir/peer-a.md" "$TARGET_A"
cp "$tmp_dir/peer-b.md" "$TARGET_B"

if [ -f "$RESULTS_FILE" ]; then
  printf '\n' >> "$RESULTS_FILE"
  tail -n +3 "$TEMP_RESULTS" >> "$RESULTS_FILE"
else
  cp "$TEMP_RESULTS" "$RESULTS_FILE"
fi

cp "$TEMP_BLOCKER" "$BLOCKER_FILE"

echo "installed_peer_a=$TARGET_A"
echo "installed_peer_b=$TARGET_B"
echo "results_file=$RESULTS_FILE"
echo "blocker_file=$BLOCKER_FILE"
echo "status=phase-az-reports-imported-and-intake-complete"
echo "next=scripts/phase_az_status.sh"

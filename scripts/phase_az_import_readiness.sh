#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/peer-field-test-intake"
TARGET_A="$REPORT_DIR/peer-a.md"
TARGET_B="$REPORT_DIR/peer-b.md"
RESULTS_FILE="$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md"
BLOCKER_FILE="$ROOT_DIR/docs/PEER_FIELD_TEST_BLOCKER.md"

present_or_missing() {
  [ -f "$1" ] && echo present || echo missing
}

echo "phase=AZ"
echo "installed_peer_a=$(present_or_missing "$TARGET_A")"
echo "installed_peer_b=$(present_or_missing "$TARGET_B")"
echo "results_file=$(present_or_missing "$RESULTS_FILE")"
echo "blocker_file=$(present_or_missing "$BLOCKER_FILE")"

if [ "$#" -eq 0 ]; then
  if [ -e "$TARGET_A" ] || [ -e "$TARGET_B" ]; then
    echo "status=installed-report-state-present"
    echo "next=scripts/phase_az_status.sh"
  else
    echo "status=waiting-for-returned-report-paths"
    echo "next=scripts/import_and_complete_phase_az_reports.sh PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT"
  fi
  exit 0
fi

if [ "$#" -ne 2 ]; then
  echo "usage: scripts/phase_az_import_readiness.sh [PATH_TO_PEER_A_REPORT PATH_TO_PEER_B_REPORT]" >&2
  exit 2
fi

SOURCE_A="$1"
SOURCE_B="$2"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing returned peer report file: $1" >&2
    exit 1
  fi
}

require_file "$SOURCE_A"
require_file "$SOURCE_B"

source_a_real="$(cd "$(dirname "$SOURCE_A")" && pwd -P)/$(basename "$SOURCE_A")"
source_b_real="$(cd "$(dirname "$SOURCE_B")" && pwd -P)/$(basename "$SOURCE_B")"

if [ "$source_a_real" = "$source_b_real" ]; then
  echo "FAIL peer A and peer B report paths must be different" >&2
  exit 1
fi

if [ -e "$TARGET_A" ] || [ -e "$TARGET_B" ]; then
  echo "FAIL installed peer reports already exist; refusing import readiness" >&2
  echo "target_peer_a=$TARGET_A" >&2
  echo "target_peer_b=$TARGET_B" >&2
  exit 1
fi

echo "source_peer_a=$source_a_real"
echo "source_peer_b=$source_b_real"
echo "target_peer_a=$TARGET_A"
echo "target_peer_b=$TARGET_B"
echo "status=phase-az-ready-to-import-returned-reports"
echo "next=scripts/import_and_complete_phase_az_reports.sh \"$source_a_real\" \"$source_b_real\""

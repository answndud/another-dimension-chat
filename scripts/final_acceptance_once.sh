#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKLIST="$ROOT_DIR/docs/FINAL_ACCEPTANCE_CHECKLIST.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing final acceptance input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq "$text" "$file"; then
    echo "FAIL missing required public claim text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CHECKLIST"

REPORT_DIR="$ROOT_DIR/docs/peer-field-test-intake"
PEER_A="$REPORT_DIR/peer-a.md"
PEER_B="$REPORT_DIR/peer-b.md"
RESULTS_FILE="$ROOT_DIR/docs/BETA_FIELD_TEST_RESULTS.md"
BLOCKER_FILE="$ROOT_DIR/docs/PEER_FIELD_TEST_BLOCKER.md"

if [ ! -f "$PEER_A" ] || [ ! -f "$PEER_B" ] || [ ! -f "$RESULTS_FILE" ] || [ ! -f "$BLOCKER_FILE" ]; then
  echo "FAIL final security-ready acceptance requires real external peer evidence" >&2
  echo "status=final-acceptance-waiting-for-external-peer-evidence" >&2
  echo "next=for single-machine public beta, run scripts/public_beta_gap_acceptance_once.sh instead" >&2
  exit 1
fi

if grep -Eq '\.onion\b|\bADPAIR[0-9A-Z]*\b|\bADENV[0-9A-Z]*\b|\bADENDPOINT[A-Z0-9]*\b|\bpassphrase\b|-----BEGIN [^-]+PRIVATE KEY-----|/Users/[^/[:space:]]+/(Library|project|Downloads|Desktop)/|\bobfs4[[:space:]]+[0-9a-f:.]+|\bbridge[[:space:]]+[0-9a-f:.]+' "$RESULTS_FILE" "$BLOCKER_FILE"; then
  echo "FAIL generated external peer evidence contains forbidden sensitive pattern" >&2
  exit 1
fi

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

echo "checklist=$CHECKLIST"
echo "status=final-acceptance-ready-for-single-human-check"
echo "next=check docs/FINAL_ACCEPTANCE_CHECKLIST.md once, then decide whether the active goal is complete"

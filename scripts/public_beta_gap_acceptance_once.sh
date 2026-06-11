#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAN_FILE="$ROOT_DIR/docs/PLAN.md"
REPORT_DIR="$ROOT_DIR/docs/peer-field-test-intake"
PEER_A="$REPORT_DIR/peer-a.md"
PEER_B="$REPORT_DIR/peer-b.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public beta acceptance input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq "$text" "$file"; then
    echo "FAIL missing required public beta text in $file: $text" >&2
    exit 1
  fi
}

require_file "$PLAN_FILE"

if [ -e "$PEER_A" ] || [ -e "$PEER_B" ]; then
  echo "FAIL peer report files exist; public beta gap mode must not use fabricated peer reports" >&2
  echo "peer_a=$PEER_A" >&2
  echo "peer_b=$PEER_B" >&2
  exit 1
fi

require_text "$PLAN_FILE" "single-machine blocked external evidence gap"
require_text "$PLAN_FILE" "not completed as real external evidence"
require_text "$PLAN_FILE" "accepted for unsigned public beta release gating only"
require_text "$PLAN_FILE" "Codex가 이 파일들을 직접 만들면 fabricated evidence가 되므로 금지한다"

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/apps/desktop-tauri/README.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "External two-machine onion delivery has not been independently verified"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "External two-machine onion delivery has not been independently verified"
require_text "$ROOT_DIR/SECURITY.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "External two-machine onion delivery has not yet been independently verified"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "accepted for unsigned public beta release gating only"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "independently verified external two-machine onion delivery"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "accepted for unsigned public beta release gating only"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Release body"

echo "status=public-beta-release-gate-accepted-with-external-evidence-gap"
echo "peer_a_report=absent"
echo "peer_b_report=absent"
echo "final_security_ready_acceptance=blocked_until_real_external_peer_reports"
echo "next=prepare or upload unsigned public beta artifacts without claiming external onion delivery"

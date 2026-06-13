#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
FINAL_REPORT="$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
RELEASE_POLICY="$ROOT_DIR/reference/RELEASE_PAGE_UPDATE_POLICY.json"
FRESH_INSTALL="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
FRESH_RESULT="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
SCREENSHOT_GALLERY="$ROOT_DIR/reference/screenshots/README.md"
SUPPORT_TRIAGE="$ROOT_DIR/reference/PUBLIC_SUPPORT_TRIAGE.md"
PUBLIC_PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
RELEASE_GATE="$ROOT_DIR/scripts/macos_release_page_update_gate_once.sh"
FRESH_GATE="$ROOT_DIR/scripts/macos_fresh_install_rehearsal_once.sh"
SCREENSHOT_GATE="$ROOT_DIR/scripts/desktop_screenshot_safety_once.sh"
SUPPORT_GATE="$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing macOS final source preflight input: $1" >&2
    exit 1
  fi
}

require_executable() {
  if [ ! -x "$1" ]; then
    echo "FAIL macOS final source preflight script is not executable: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing macOS final source preflight text in $file: $text" >&2
    exit 1
  fi
}

for file in "$README" "$SECURITY" "$FINAL_REPORT" "$RELEASE_POLICY" "$FRESH_INSTALL" "$FRESH_RESULT" "$SCREENSHOT_GALLERY" "$SUPPORT_TRIAGE" "$PUBLIC_PREFLIGHT"; do
  require_file "$file"
done

for script in "$RELEASE_GATE" "$FRESH_GATE" "$SCREENSHOT_GATE" "$SUPPORT_GATE"; do
  require_file "$script"
  require_executable "$script"
done

for file in "$README" "$SECURITY" "$FINAL_REPORT"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
done

require_text "$README" "reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
require_text "$README" "reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
require_text "$README" "reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
require_text "$README" "reference/RELEASE_PAGE_UPDATE_POLICY.json"
require_text "$README" "reference/screenshots/README.md"
require_text "$README" "reference/PUBLIC_SUPPORT_TRIAGE.md"
require_text "$README" "macOS unsigned public beta source closure"
require_text "$README" "readiness target is 100%"
require_text "$README" "production readiness definition and claim gate"
require_text "$FINAL_REPORT" "already public macOS unsigned beta"
require_text "$FINAL_REPORT" "still not production-ready"
require_text "$FINAL_REPORT" "source-side macOS unsigned public"
require_text "$FINAL_REPORT" "100%"
require_text "$FINAL_REPORT" "Known Release Drift"
require_text "$FINAL_REPORT" "COMPONENT_BOUNDARIES.md"
require_text "$FINAL_REPORT" "OPERATOR_FINAL_HANDOFF.md"
require_text "$FINAL_REPORT" "reference/screenshots/README.md"
require_text "$FINAL_REPORT" "reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
require_text "$FINAL_REPORT" "reference/PUBLIC_SUPPORT_TRIAGE.md"
require_text "$FINAL_REPORT" "macOS Unsigned Public Beta Closure"
require_text "$FINAL_REPORT" "No live release upload"
require_text "$FINAL_REPORT" "Remaining Non-Beta Product Blockers"
require_text "$FINAL_REPORT" "Phase OPS-1 - Production Readiness Definition And Claim Gate"
require_text "$RELEASE_POLICY" "no live release update needed while source upload-set extras remain held"
require_text "$FRESH_INSTALL" "Redacted Diagnostics Copy"
require_text "$FRESH_RESULT" "Status: hold for manual GUI follow-through; source install authority passed."
require_text "$SCREENSHOT_GALLERY" "Reviewed files"
require_text "$SUPPORT_TRIAGE" "Triage Routing Matrix"
require_text "$PUBLIC_PREFLIGHT" "check_macos_public_beta_final_sources"
require_text "$PUBLIC_PREFLIGHT" "macos_public_beta_final_report=ready"
require_text "$PUBLIC_PREFLIGHT" "macos_release_page_update_gate=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_fresh_install_rehearsal=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_public_screenshots=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_public_support_triage=source-linked"

bash -n "$PUBLIC_PREFLIGHT"

if git -C "$ROOT_DIR" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  echo "FAIL generated public-release or beta-artifacts path is tracked" >&2
  exit 1
fi

if git -C "$ROOT_DIR" diff --cached --name-only | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  echo "FAIL generated public-release or beta-artifacts path is staged" >&2
  exit 1
fi

printf 'status=macos-public-beta-final-source-preflight-ready\n'
printf 'already_public_macos_unsigned_beta=true\n'
printf 'still_not_production_ready=true\n'
printf 'release_upload_performed=false\n'
printf 'release_body_edit_performed=false\n'
printf 'dmg_rebuild_performed=false\n'
printf 'generated_public_release_or_beta_artifact_staged=false\n'
printf 'macos_unsigned_public_beta_source_completion=100\n'
printf 'next_choices=production-readiness-claim-gate#production-e2ee-hardening#production-distribution\n'

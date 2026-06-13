#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
FINAL_REPORT="$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
RELEASE_POLICY="$ROOT_DIR/reference/RELEASE_PAGE_UPDATE_POLICY.json"
FRESH_INSTALL="$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL.md"
PUBLIC_PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
RELEASE_GATE="$ROOT_DIR/scripts/macos_release_page_update_gate_once.sh"
FRESH_GATE="$ROOT_DIR/scripts/macos_fresh_install_rehearsal_once.sh"

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

for file in "$README" "$SECURITY" "$FINAL_REPORT" "$RELEASE_POLICY" "$FRESH_INSTALL" "$PUBLIC_PREFLIGHT"; do
  require_file "$file"
done

for script in "$RELEASE_GATE" "$FRESH_GATE"; do
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
require_text "$README" "reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
require_text "$README" "reference/RELEASE_PAGE_UPDATE_POLICY.json"
require_text "$FINAL_REPORT" "already public macOS unsigned beta"
require_text "$FINAL_REPORT" "still not production-ready"
require_text "$FINAL_REPORT" "Known Release Drift"
require_text "$FINAL_REPORT" "COMPONENT_BOUNDARIES.md"
require_text "$FINAL_REPORT" "OPERATOR_FINAL_HANDOFF.md"
require_text "$FINAL_REPORT" "release page edit"
require_text "$FINAL_REPORT" "screenshot publication"
require_text "$FINAL_REPORT" "Windows parity"
require_text "$FINAL_REPORT" "Android scope"
require_text "$RELEASE_POLICY" "hold body-only edit until proposed live body matches actual live assets"
require_text "$FRESH_INSTALL" "Redacted Diagnostics Copy"
require_text "$PUBLIC_PREFLIGHT" "check_macos_public_beta_final_sources"
require_text "$PUBLIC_PREFLIGHT" "macos_public_beta_final_report=ready"
require_text "$PUBLIC_PREFLIGHT" "macos_release_page_update_gate=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_fresh_install_rehearsal=source-linked"

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
printf 'next_choices=release-page-edit#screenshot-publication#windows-parity#android-scope\n'

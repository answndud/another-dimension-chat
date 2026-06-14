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
INSTALL_GUIDE="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
RELEASE_NOTES="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
RELEASE_BODY="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
BETA_CHECKLIST="$ROOT_DIR/reference/BETA_RELEASE_CHECKLIST.md"
PACKET_REFERENCE="$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md"
PUBLIC_PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
RELEASE_GATE="$ROOT_DIR/scripts/macos_release_page_update_gate_once.sh"
FRESH_GATE="$ROOT_DIR/scripts/macos_fresh_install_rehearsal_once.sh"
SCREENSHOT_GATE="$ROOT_DIR/scripts/desktop_screenshot_safety_once.sh"
SUPPORT_GATE="$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"
RELEASE_DIR="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
RELEASE_DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
RELEASE_PROVENANCE="$RELEASE_DMG.provenance.json"
EXPECTED_DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"
RELEASE_TAG="v0.1.0-beta-onion-unsigned"
ARTIFACT_IDENTITY_FIELDS="artifact#artifact_sha256#build_channel#build_commit#release_tag#platform"
PUBLIC_ARTIFACT_STALE_ACTION="rebuild-or-republish-unsigned-public-beta-packet"

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

json_string_value() {
  local file="$1"
  local key="$2"
  sed -nE "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]*)\"[,[:space:]]*$/\1/p" "$file" | head -n 1
}

emit_artifact_identity_status() {
  local provenance="$RELEASE_DIR/$RELEASE_PROVENANCE"
  local current_head
  current_head="$(git -C "$ROOT_DIR" rev-parse --short=8 HEAD)"

  if [ ! -f "$provenance" ]; then
    cat <<STATUS
artifact_packet_present=false
artifact_identity=absent
artifact_identity_fields=$ARTIFACT_IDENTITY_FIELDS
artifact_build_commit=absent
artifact_release_tag=absent
current_head_short=$current_head
artifact_current_head_aligned=false
public_artifact_stale=false
public_artifact_state=absent
stale_public_artifact_promoted_to_current=false
next_owner_action=generate-unsigned-public-beta-packet-before-public-use
STATUS
    return
  fi

  local artifact artifact_sha build_channel build_commit release_tag platform
  artifact="$(json_string_value "$provenance" "artifact")"
  artifact_sha="$(json_string_value "$provenance" "artifact_sha256")"
  build_channel="$(json_string_value "$provenance" "build_channel")"
  build_commit="$(json_string_value "$provenance" "build_commit")"
  release_tag="$(json_string_value "$provenance" "release_tag")"
  platform="$(json_string_value "$provenance" "platform")"

  [ -n "$artifact" ] || {
    echo "FAIL missing provenance artifact" >&2
    exit 1
  }
  [ -n "$artifact_sha" ] || {
    echo "FAIL missing provenance artifact_sha256" >&2
    exit 1
  }
  [ -n "$build_channel" ] || {
    echo "FAIL missing provenance build_channel" >&2
    exit 1
  }
  [ -n "$build_commit" ] || {
    echo "FAIL missing provenance build_commit" >&2
    exit 1
  }
  [ -n "$release_tag" ] || {
    echo "FAIL missing provenance release_tag" >&2
    exit 1
  }
  [ -n "$platform" ] || {
    echo "FAIL missing provenance platform" >&2
    exit 1
  }

  if [ "$artifact" != "$RELEASE_DMG" ]; then
    echo "FAIL provenance artifact mismatch: $artifact" >&2
    exit 1
  fi
  if [ "$artifact_sha" != "$EXPECTED_DMG_SHA" ]; then
    echo "FAIL provenance artifact_sha256 mismatch: $artifact_sha" >&2
    exit 1
  fi
  if [ "$release_tag" != "$RELEASE_TAG" ]; then
    echo "FAIL provenance release_tag mismatch: $release_tag" >&2
    exit 1
  fi

  local artifact_identity aligned stale state next_action
  artifact_identity="$artifact#$artifact_sha#$build_channel#$build_commit#$release_tag#$platform"
  if [ "$build_commit" = "$current_head" ]; then
    aligned=true
    stale=false
    state=current
    next_action=none
  else
    aligned=false
    stale=true
    state=stale
    next_action="$PUBLIC_ARTIFACT_STALE_ACTION"
  fi

  cat <<STATUS
artifact_packet_present=true
artifact_identity=$artifact_identity
artifact_identity_fields=$ARTIFACT_IDENTITY_FIELDS
artifact_filename=$artifact
artifact_sha256=$artifact_sha
artifact_build_channel=$build_channel
artifact_build_commit=$build_commit
artifact_release_tag=$release_tag
artifact_platform=$platform
current_head_short=$current_head
artifact_current_head_aligned=$aligned
public_artifact_stale=$stale
public_artifact_state=$state
stale_public_artifact_promoted_to_current=false
next_owner_action=$next_action
STATUS
}

for file in "$README" "$SECURITY" "$FINAL_REPORT" "$RELEASE_POLICY" "$FRESH_INSTALL" "$FRESH_RESULT" "$SCREENSHOT_GALLERY" "$SUPPORT_TRIAGE" "$INSTALL_GUIDE" "$RELEASE_NOTES" "$RELEASE_BODY" "$BETA_CHECKLIST" "$PACKET_REFERENCE" "$PUBLIC_PREFLIGHT"; do
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
require_text "$PACKET_REFERENCE" "artifact_identity="
require_text "$PACKET_REFERENCE" "artifact_identity_fields=$ARTIFACT_IDENTITY_FIELDS"
require_text "$PACKET_REFERENCE" "artifact_current_head_aligned=false"
require_text "$PACKET_REFERENCE" "public_artifact_stale=true"
require_text "$PACKET_REFERENCE" "next_owner_action=$PUBLIC_ARTIFACT_STALE_ACTION"
require_text "$PUBLIC_PREFLIGHT" "check_macos_public_beta_final_sources"
require_text "$PUBLIC_PREFLIGHT" "macos_public_beta_final_report=ready"
require_text "$PUBLIC_PREFLIGHT" "macos_release_page_update_gate=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_fresh_install_rehearsal=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_public_screenshots=source-linked"
require_text "$PUBLIC_PREFLIGHT" "macos_public_support_triage=source-linked"

for file in "$INSTALL_GUIDE" "$RELEASE_NOTES" "$RELEASE_BODY" "$BETA_CHECKLIST"; do
  require_text "$file" "Shared Packet Boundary"
  require_text "$file" "artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a#beta-onion#e8954df9#v0.1.0-beta-onion-unsigned#macos-aarch64"
  require_text "$file" "artifact_identity_fields=$ARTIFACT_IDENTITY_FIELDS"
  require_text "$file" "artifact_current_head_aligned=false"
  require_text "$file" "public_artifact_stale=true"
  require_text "$file" "public_artifact_state=stale"
  require_text "$file" "next_owner_action=$PUBLIC_ARTIFACT_STALE_ACTION"
  require_text "$file" "trust_model=same-github-release-assets#same-release-sha256#manual-privacy-security-allow-after-checksum#no-auto-update"
  require_text "$file" "support_intake=redacted-diagnostics-only#no-raw-logs#no-crash-dumps#no-private-room-data#no-payloads#no-key-material"
  require_text "$file" "generated_artifact_boundary=do-not-commit-public-release-or-beta-artifacts#no-dmg-rebuild#no-release-upload-or-edit"
done

bash -n "$PUBLIC_PREFLIGHT"

if git -C "$ROOT_DIR" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  echo "FAIL generated public-release or beta-artifacts path is tracked" >&2
  exit 1
fi

if git -C "$ROOT_DIR" diff --cached --name-only | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  echo "FAIL generated public-release or beta-artifacts path is staged" >&2
  exit 1
fi

emit_artifact_identity_status
printf 'status=macos-public-beta-final-source-preflight-ready\n'
printf 'already_public_macos_unsigned_beta=true\n'
printf 'still_not_production_ready=true\n'
printf 'release_upload_performed=false\n'
printf 'release_body_edit_performed=false\n'
printf 'dmg_rebuild_performed=false\n'
printf 'generated_public_release_or_beta_artifact_staged=false\n'
printf 'macos_unsigned_public_beta_source_completion=100\n'
printf 'next_choices=production-readiness-claim-gate#production-e2ee-hardening#production-distribution\n'

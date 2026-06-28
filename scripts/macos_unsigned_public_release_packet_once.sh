#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/apps/desktop-tauri/public-release/unsigned-public-beta"
RELEASE_DMG="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
RELEASE_PROVENANCE="$RELEASE_DMG.provenance.json"
EXPECTED_DMG_SHA="7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a"
RELEASE_TAG="v0.1.0-beta-onion-unsigned"
ARTIFACT_IDENTITY_FIELDS="artifact#artifact_sha256#build_channel#build_commit#release_tag#platform"
PUBLIC_ARTIFACT_STALE_ACTION="rebuild-or-republish-unsigned-public-beta-packet"

fail() {
  echo "FAIL macos unsigned public release packet: $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_text() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$file" || fail "missing text in $file: $expected"
}

reject_text() {
  local file="$1"
  local forbidden="$2"
  if grep -Fq -- "$forbidden" "$file"; then
    fail "forbidden text in $file: $forbidden"
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

  [ -n "$artifact" ] || fail "missing provenance artifact"
  [ -n "$artifact_sha" ] || fail "missing provenance artifact_sha256"
  [ -n "$build_channel" ] || fail "missing provenance build_channel"
  [ -n "$build_commit" ] || fail "missing provenance build_commit"
  [ -n "$release_tag" ] || fail "missing provenance release_tag"
  [ -n "$platform" ] || fail "missing provenance platform"

  [ "$artifact" = "$RELEASE_DMG" ] || fail "provenance artifact mismatch: $artifact"
  [ "$artifact_sha" = "$EXPECTED_DMG_SHA" ] || fail "provenance artifact_sha256 mismatch: $artifact_sha"
  [ "$release_tag" = "$RELEASE_TAG" ] || fail "provenance release_tag mismatch: $release_tag"

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

require_ignored_path() {
  git -C "$ROOT_DIR" check-ignore -q "$1" || fail "path is not ignored: $1"
}

require_release_policy_sources() {
  local files=(
    "$ROOT_DIR/README.md"
    "$ROOT_DIR/SECURITY.md"
    "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md"
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
    "$ROOT_DIR/reference/UPDATE_INTEGRITY.md"
    "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md"
    "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
    "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md"
    "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh"
    "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"
    "$ROOT_DIR/scripts/upload_macos_release_assets_approved.sh"
  )
  for file in "${files[@]}"; do
    require_file "$file"
  done

  require_text "$ROOT_DIR/README.md" "unsigned"
  require_text "$ROOT_DIR/README.md" "not production-ready"
  require_text "$ROOT_DIR/README.md" "Do not use"
  require_text "$ROOT_DIR/README.md" "Privacy"
  require_text "$ROOT_DIR/README.md" "Security"
  require_text "$ROOT_DIR/README.md" "GitHub Release"

  require_text "$ROOT_DIR/SECURITY.md" "Unsigned OSS Public Beta Boundary"
  require_text "$ROOT_DIR/SECURITY.md" "not signed, not notarized, not audited"
  require_text "$ROOT_DIR/SECURITY.md" "Apple Developer Program, Developer ID, notarization, App Store, and TestFlight"
  require_text "$ROOT_DIR/SECURITY.md" "credentials are not used or required"
  require_text "$ROOT_DIR/SECURITY.md" "does not ask users to disable"
  require_text "$ROOT_DIR/SECURITY.md" "terminal quarantine-removal commands"

  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "unsigned OSS public beta"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "not signed, not notarized, not audited"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "Do not disable Gatekeeper globally"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "explicit owner action only"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "Forbidden public claims"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "artifact_identity="
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "artifact_identity_fields=$ARTIFACT_IDENTITY_FIELDS"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "artifact_current_head_aligned=false"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "public_artifact_stale=true"
  require_text "$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md" "next_owner_action=$PUBLIC_ARTIFACT_STALE_ACTION"

  for file in \
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" \
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" \
    "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
    require_text "$file" "unsigned experimental public beta"
    require_text "$file" "not signed, not notarized, not audited, not production-ready"
    require_text "$file" "sensitive communication prohibited"
    require_text "$file" "credentials are not used or required for this OSS public beta"
    require_text "$file" "Privacy & Security"
    require_text "$file" "Do not disable Gatekeeper"
    require_text "$file" "terminal quarantine-removal commands"
  done

  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "same GitHub Release"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "Branch files can move after a release"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "source archives"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "release authority"
  require_text "$ROOT_DIR/reference/UPDATE_INTEGRITY.md" "not a trusted security boundary"
  require_text "$ROOT_DIR/reference/SUPPLY_CHAIN_BASELINE.md" "not a supply-chain audit"
  require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
  require_text "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md" "high_risk_public_claim_allowed=false"
  require_text "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md" "high_risk_ready_claim_allowed=false"
  require_text "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh" "high_risk_public_claim_allowed=false"
  require_text "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh" "high_risk_ready_claim_allowed=false"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "High-Risk runtime evidence validator is a redacted evidence-format gate"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "high_risk_public_claim_allowed=false"
  require_text "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" "high_risk_ready_claim_allowed=false"

  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"distribution\": \"unsigned-github-public-beta\""
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"same_release_asset_set_authority_required\": true"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"terminal_quarantine_removal_install_step\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"gatekeeper_global_disable_install_step\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"apple_developer_program_used\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"developer_id_required\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"notary_credential_required\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"app_store_or_testflight_required\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"signed\": false"
  require_text "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" "\"notarized\": false"

  require_text "$ROOT_DIR/scripts/upload_macos_release_assets_approved.sh" "release_upload_authorized=false"
  require_text "$ROOT_DIR/scripts/upload_macos_release_assets_approved.sh" "release_upload_performed=false"

  for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md"; do
    reject_text "$file" "production-ready secure messenger"
    reject_text "$file" "audited secure messenger"
    reject_text "$file" "safe for sensitive communication"
    reject_text "$file" "high-risk ready"
    reject_text "$file" "Signal/Briar/Cwtch equivalent"
  done
}

require_upload_hold() {
  local output
  output="$("$ROOT_DIR/scripts/upload_macos_release_assets_approved.sh")"
  printf '%s\n' "$output" | grep -Fq "status=macos-release-upload-held" ||
    fail "upload script did not hold by default"
  printf '%s\n' "$output" | grep -Fq "release_upload_authorized=false" ||
    fail "upload script did not report authorization false"
  printf '%s\n' "$output" | grep -Fq "release_upload_performed=false" ||
    fail "upload script did not report upload false"
}

require_generator_policy() {
  "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh" --check-policy >/dev/null
}

require_generated_packet_if_present() {
  require_ignored_path "$ROOT_DIR/apps/desktop-tauri/public-release/"
  require_ignored_path "$ROOT_DIR/apps/desktop-tauri/beta-artifacts/"
  if git -C "$ROOT_DIR" ls-files apps/desktop-tauri/public-release apps/desktop-tauri/beta-artifacts | grep -q .; then
    fail "generated public-release or beta-artifacts file is tracked"
  fi

  [ -d "$RELEASE_DIR" ] || {
    echo "generated_release_packet=absent"
    return
  }

  require_ignored_path "$RELEASE_DIR"
  require_file "$RELEASE_DIR/$RELEASE_DMG"
  require_file "$RELEASE_DIR/$RELEASE_DMG.sha256"
  require_file "$RELEASE_DIR/$RELEASE_PROVENANCE"
  require_file "$RELEASE_DIR/MANIFEST.md"
  require_file "$RELEASE_DIR/GITHUB_RELEASE_BODY.md"
  require_file "$RELEASE_DIR/INSTALL_UNSIGNED_MACOS.md"
  require_file "$RELEASE_DIR/RELEASE_NOTES.md"
  require_file "$RELEASE_DIR/UPDATE_INTEGRITY.md"

  require_text "$RELEASE_DIR/$RELEASE_DMG.sha256" "$EXPECTED_DMG_SHA"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact\": \"$RELEASE_DMG\""
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"artifact_sha256\": \"$EXPECTED_DMG_SHA\""
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"same_release_asset_set_authority_required\": true"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"terminal_quarantine_removal_install_step\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"gatekeeper_global_disable_install_step\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"apple_developer_program_used\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"developer_id_required\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notary_credential_required\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"app_store_or_testflight_required\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"signed\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"notarized\": false"
  require_text "$RELEASE_DIR/$RELEASE_PROVENANCE" "\"windows_public_artifact_ready\": false"

  require_text "$RELEASE_DIR/MANIFEST.md" "Apple Developer Program used: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "Developer ID required: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "Notary credential required: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "App Store or TestFlight required: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "Gatekeeper global disable install step: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "Terminal quarantine-removal install step: false"
  require_text "$RELEASE_DIR/MANIFEST.md" "Release authority: same-github-release-assets"
  require_text "$RELEASE_DIR/MANIFEST.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the \`public-release/\` folder itself"
  require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Do not disable Gatekeeper globally"
  require_text "$RELEASE_DIR/GITHUB_RELEASE_BODY.md" "Do not upload \`docs/\`, \`beta-artifacts/\`, the"

  echo "generated_release_packet=present"
}

require_release_policy_sources
require_upload_hold
require_generator_policy
require_generated_packet_if_present
emit_artifact_identity_status

cat <<'STATUS'
macos_unsigned_public_release_packet=ready
release_class=unsigned-oss-public-beta
apple_developer_program_required=false
developer_id_required=false
notarization_required=false
app_store_or_testflight_required=false
gatekeeper_global_disable_install_step=false
terminal_quarantine_removal_install_step=false
same_release_asset_authority_required=true
release_upload_authorized=false
production_ready_claim_allowed=false
high_risk_runtime_evidence_validator_ready=true
high_risk_runtime_evidence_claim_separated=true
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
STATUS

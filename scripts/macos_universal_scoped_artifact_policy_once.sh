#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden macOS artifact scope pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

POLICY="reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md"
TAURI_CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
PACKAGE_JSON="apps/desktop-tauri/package.json"
TAURI_CARGO="apps/desktop-tauri/src-tauri/Cargo.toml"
RELEASE_SCRIPT="scripts/prepare_unsigned_public_beta_release.sh"

for file in "$POLICY" "$TAURI_CONFIG" "$PACKAGE_JSON" "$TAURI_CARGO" "$RELEASE_SCRIPT" \
  "README.md" "SECURITY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" \
  "reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" \
  "reference/UPDATE_INTEGRITY.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md"; do
  [ -f "$file" ] || fail "missing required macOS artifact scope input: $file"
done

must_contain "$POLICY" "m100_2_macos_universal_scoped_artifact_policy_reviewed=true"
must_contain "$POLICY" "macos_current_public_artifact_file=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
must_contain "$POLICY" "macos_current_public_artifact_platform=macos-aarch64"
must_contain "$POLICY" "macos_current_public_support_scope=apple-silicon-aarch64-only"
must_contain "$POLICY" "macos_support_scope_explicit=true"
must_contain "$POLICY" "macos_universal_artifact_available=false"
must_contain "$POLICY" "macos_universal_artifact_claim_allowed=false"
must_contain "$POLICY" "macos_intel_artifact_available=false"
must_contain "$POLICY" "macos_intel_support_claim_allowed=false"
must_contain "$POLICY" "macos_minimum_version_claimed=false"
must_contain "$POLICY" "macos_minimum_version_policy_recorded=true"
must_contain "$POLICY" "tauri_bundle_active=true"
must_contain "$POLICY" "artifact_naming_platform_consistent=true"
must_contain "$POLICY" "checksum_provenance_platform_consistent=true"
must_contain "$POLICY" "next_required_phase=Phase A100-2 - External Review Execution And Finding Closure"

must_contain "$TAURI_CONFIG" '"productName": "Another Dimension Chat"'
must_contain "$TAURI_CONFIG" '"version": "0.1.0"'
must_contain "$TAURI_CONFIG" '"identifier": "chat.anotherdimension.prototype"'
must_contain "$TAURI_CONFIG" '"active": true'
must_contain "$TAURI_CONFIG" '"targets": "all"'
must_contain "$PACKAGE_JSON" '"version": "0.1.0"'
must_contain "$PACKAGE_JSON" '"tauri:build:beta-onion"'
must_contain "$TAURI_CARGO" 'version = "0.1.0"'

must_contain "$RELEASE_SCRIPT" 'PLATFORM="macos-aarch64"'
must_contain "$RELEASE_SCRIPT" 'RELEASE_DMG="another-dimension-chat-${APP_VERSION}-${BUILD_CHANNEL}-${PLATFORM}-unsigned.dmg"'
must_contain "$RELEASE_SCRIPT" 'MACOS_PUBLIC_SUPPORT_SCOPE="apple-silicon-aarch64-only"'
must_contain "$RELEASE_SCRIPT" 'MACOS_UNIVERSAL_ARTIFACT_READY=false'
must_contain "$RELEASE_SCRIPT" 'MACOS_INTEL_ARTIFACT_READY=false'
must_contain "$RELEASE_SCRIPT" '"macos_public_support_scope": "$MACOS_PUBLIC_SUPPORT_SCOPE"'
must_contain "$RELEASE_SCRIPT" '"macos_universal_artifact_ready": $MACOS_UNIVERSAL_ARTIFACT_READY'
must_contain "$RELEASE_SCRIPT" '"macos_intel_artifact_ready": $MACOS_INTEL_ARTIFACT_READY'
must_contain "$RELEASE_SCRIPT" "macOS support scope: \$MACOS_PUBLIC_SUPPORT_SCOPE"

for file in "README.md" "SECURITY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" \
  "reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"; do
  must_contain "$file" "Apple Silicon"
  must_contain "$file" "aarch64"
done

must_contain "README.md" "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md"
must_contain "SECURITY.md" "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md"

for file in "$POLICY" "$RELEASE_SCRIPT" "README.md" "SECURITY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" \
  "reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md" \
  "reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"; do
  must_not_match "$file" "macos_universal_artifact_available=true"
  must_not_match "$file" "macos_universal_artifact_claim_allowed=true"
  must_not_match "$file" "macos_intel_artifact_available=true"
  must_not_match "$file" "macos_intel_support_claim_allowed=true"
  must_not_match "$file" "macos_minimum_version_claimed=true"
  must_not_match "$file" "signed_notarized_release_ready=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

for file in README.md SECURITY.md reference/*.md; do
  must_not_match "$file" "universal macOS (DMG|artifact|app) (is )?(available|ready|supported)"
  must_not_match "$file" "Intel Mac support (is )?(available|ready|supported)"
done

if git -C "$ROOT" ls-files | grep -Eq '^apps/desktop-tauri/(public-release|beta-artifacts)/'; then
  fail "generated public-release or beta-artifacts path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/)'; then
  fail "private docs, AGENTS.md, or generated release artifact path is staged"
fi

cat <<'STATUS'
status=macos-universal-scoped-artifact-policy-ready
m100_2_macos_universal_scoped_artifact_policy_reviewed=true
macos_current_public_artifact_platform=macos-aarch64
macos_current_public_support_scope=apple-silicon-aarch64-only
macos_support_scope_explicit=true
macos_universal_artifact_available=false
macos_universal_artifact_claim_allowed=false
macos_intel_artifact_available=false
macos_intel_support_claim_allowed=false
macos_minimum_version_claimed=false
artifact_naming_platform_consistent=true
checksum_provenance_platform_consistent=true
next_required_phase=Phase-A100-2-External-Review-Execution-And-Finding-Closure
STATUS

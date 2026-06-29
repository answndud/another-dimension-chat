#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_BUILD="${AD_VERIFY_SOURCE_BUILD_SKIP_BUILD:-0}"

fail() {
  printf 'verify_source_build_path failed: %s\n' "$1" >&2
  exit 1
}

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

require_file() {
  local path="$1"
  [ -f "$ROOT_DIR/$path" ] || fail "missing file: $path"
}

require_text() {
  local path="$1"
  local text="$2"
  grep -Fq "$text" "$ROOT_DIR/$path" || fail "missing text in $path: $text"
}

forbidden_text() {
  local path="$1"
  local text="$2"
  if grep -Fq "$text" "$ROOT_DIR/$path"; then
    fail "forbidden text in $path: $text"
  fi
}

require_file README.md
require_file README.ko.md
require_file INSTALL_FROM_SOURCE_MACOS.md
require_file REPRODUCIBLE_BUILD_MACOS.md
require_file apps/desktop-tauri/package.json
require_file apps/desktop-tauri/README.md
require_file SECURITY.md

require_text README.md "Source Build for macOS"
require_text README.md "npm --prefix apps/desktop-tauri run tauri:build:beta-onion"
require_text README.md "Install from source on macOS"
require_text README.md "Reproducible build notes for macOS"
require_text README.ko.md "macOS 소스 빌드"
require_text README.ko.md "npm --prefix apps/desktop-tauri run tauri:build:beta-onion"
require_text README.ko.md "macOS에서 소스 빌드로 설치"
require_text README.ko.md "macOS 재현성 빌드 노트"
require_text README.ko.md "공개 릴리스 체크리스트"
require_text README.ko.md "source-build-primary"
require_text README.ko.md "public diagnostics"
require_text INSTALL_FROM_SOURCE_MACOS.md "npm --prefix apps/desktop-tauri run tauri:build:beta-onion"
require_text INSTALL_FROM_SOURCE_MACOS.md "Xcode Command Line Tools"
require_text INSTALL_FROM_SOURCE_MACOS.md "Reproducible build notes for macOS"
require_text SUPPORT.md "Source Build First"
require_text SUPPORT.md "Legacy DMG Fallback"
require_text SUPPORT.md "room-scoped"
require_text SUPPORT.md "public diagnostics only"
require_text SUPPORT.md "allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status"
require_text SUPPORT.md "forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
require_text .github/ISSUE_TEMPLATE/public_beta_support.yml "Source-build primary public beta support"
require_text .github/ISSUE_TEMPLATE/public_beta_support.yml "allowed_public_intake_fields=app-status#app-version#build-channel#build-commit#platform#public-diagnostics#checksum-result#failure-class#recovery-next-action#desktop-acceptance-status#desktop-acceptance-blockers#app-launch-network#release-class-readiness#high-risk-runtime-evidence-source#high-risk-runtime-evidence-accepted#high-risk-runtime-primary-blocker#high-risk-runtime-failure-class#engine-sidecar-status-failure-class#engine-sidecar-manual-self-test-failure-class#engine-sidecar-redacted-runtime-status"
require_text .github/ISSUE_TEMPLATE/public_beta_support.yml "forbidden_public_intake_fields=raw-logs#crash-dumps#screenshots#onion-endpoints#endpoints#invite-codes#pairing-payloads#envelope-payloads#endpoint-payloads#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#private-keys#key-material#private-planning-notes#support-bundles"
require_text apps/desktop-tauri/README.md "source-build-primary"
require_text apps/desktop-tauri/README.md "source build primary"
require_text apps/desktop-tauri/README.md "legacy unsigned DMG fallback"
require_text REPRODUCIBLE_BUILD_MACOS.md "Keep Fixed"
require_text REPRODUCIBLE_BUILD_MACOS.md "byte-for-byte identical artifacts"
require_text REPRODUCIBLE_BUILD_MACOS.md "Cargo.lock"
require_text apps/desktop-tauri/package.json '"tauri:build:beta-onion"'

forbidden_text README.md "xattr -dr com.apple.quarantine"
forbidden_text README.ko.md "xattr -dr com.apple.quarantine"
forbidden_text INSTALL_FROM_SOURCE_MACOS.md "xattr -dr com.apple.quarantine"

forbidden_text README.md "signed, not notarized"
forbidden_text README.md "not signed, not notarized"
forbidden_text INSTALL_FROM_SOURCE_MACOS.md "signed, not notarized"
forbidden_text INSTALL_FROM_SOURCE_MACOS.md "not signed, not notarized"
forbidden_text SECURITY.md "public desktop packet is currently the unsigned macOS DMG path"
forbidden_text SECURITY.md "The public desktop packet is currently the unsigned macOS DMG path"
forbidden_text SUPPORT.md "Release Downloads"

run_step "desktop build-storage contract" npm --prefix apps/desktop-tauri run test:build-storage-contract
run_step "checkout storage budget" npm --prefix apps/desktop-tauri run check:storage-budget

if [ "$SKIP_BUILD" != "1" ]; then
  run_step "desktop source build" npm --prefix apps/desktop-tauri run tauri:build:beta-onion
  run_step "post-build storage budget" npm --prefix apps/desktop-tauri run check:storage-budget
fi

printf 'verify_source_build_path passed\n'

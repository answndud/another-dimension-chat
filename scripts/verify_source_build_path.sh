#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf 'verify_source_build_path failed: %s\n' "$1" >&2
  exit 1
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

printf 'verify_source_build_path passed\n'

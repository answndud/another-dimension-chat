#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

require_file() {
  local path="$1"
  if [[ ! -f "$ROOT_DIR/$path" ]]; then
    echo "missing required mobile skeleton file: $path" >&2
    exit 1
  fi
}

require_text() {
  local path="$1"
  local text="$2"
  if ! grep -F -q "$text" "$ROOT_DIR/$path"; then
    echo "missing required mobile skeleton text in $path: $text" >&2
    exit 1
  fi
}

reject_find() {
  local description="$1"
  shift
  if find "$MOBILE_DIR" "$@" -print -quit | grep -q .; then
    echo "mobile skeleton must not contain $description" >&2
    exit 1
  fi
}

require_file "apps/mobile/README.md"
require_file "apps/mobile/android/README.md"
require_file "apps/mobile/ios/README.md"
require_file "apps/mobile/ffi/README.md"

require_text "apps/mobile/README.md" "documentation-only boundary"
require_text "apps/mobile/README.md" "Mobile clients are not part of the current"
require_text "apps/mobile/README.md" "unsigned experimental public beta"
require_text "apps/mobile/README.md" "sensitive"
require_text "apps/mobile/README.md" "not audited"
require_text "apps/mobile/README.md" "not production-ready"
require_text "apps/mobile/README.md" "external onion delivery not"

require_text "apps/mobile/android/README.md" "documentation-only skeleton"
require_text "apps/mobile/android/README.md" "not a Gradle project"
require_text "apps/mobile/android/README.md" "not an APK or AAB artifact"
require_text "apps/mobile/android/README.md" "not Android app readiness"
require_text "apps/mobile/android/README.md" "thin Kotlin shell over UniFFI or another"
require_text "apps/mobile/android/README.md" "must not define independent protocol, storage, transport"

require_text "apps/mobile/ios/README.md" "documentation-only skeleton"
require_text "apps/mobile/ios/README.md" "not an Xcode project"
require_text "apps/mobile/ios/README.md" "not an IPA artifact"
require_text "apps/mobile/ios/README.md" "not TestFlight distribution"
require_text "apps/mobile/ios/README.md" "not iOS app readiness"
require_text "apps/mobile/ios/README.md" "thin Swift shell over UniFFI or another"
require_text "apps/mobile/ios/README.md" "must not define independent protocol, storage, transport"

require_text "apps/mobile/ffi/README.md" "documentation-only naming and API inventory"
require_text "apps/mobile/ffi/README.md" "not a UniFFI definition"
require_text "apps/mobile/ffi/README.md" "not generated bindings"
require_text "apps/mobile/ffi/README.md" "not Kotlin or Swift"
require_text "apps/mobile/ffi/README.md" "runtime source"
require_text "apps/mobile/ffi/README.md" "Allowed API groups mirror the shared core wrapper boundary"
require_text "apps/mobile/ffi/README.md" "shared_core_status_surface"
require_text "apps/mobile/ffi/README.md" "redacted_support_diagnostics"
require_text "apps/mobile/ffi/README.md" "must not export raw storage open calls"
require_text "apps/mobile/ffi/README.md" "security-ready claims"
require_text "apps/mobile/ffi/README.md" "Signature Placeholder Boundary"
require_text "apps/mobile/ffi/README.md" "documentation-only until a"
require_text "apps/mobile/ffi/README.md" "narrow handle-and-bytes shape"
require_text "apps/mobile/ffi/README.md" "opaque"
require_text "apps/mobile/ffi/README.md" "ProfileHandle"
require_text "apps/mobile/ffi/README.md" "canonical byte buffers"
require_text "apps/mobile/ffi/README.md" "redacted structured result objects"
require_text "apps/mobile/ffi/README.md" "explicit error codes"
require_text "apps/mobile/ffi/README.md" "caller-owned input buffers"
require_text "apps/mobile/ffi/README.md" "core-owned returned buffers"
require_text "apps/mobile/ffi/README.md" "explicit release"
require_text "apps/mobile/ffi/README.md" "explicit user action tokens"
require_text "apps/mobile/ffi/README.md" "does not define a"
require_text "apps/mobile/ffi/README.md" "callable mobile FFI"
require_text "apps/mobile/ffi/README.md" "stable ABI"
require_text "apps/mobile/ffi/README.md" "memory ownership contract"
require_text "apps/mobile/ffi/README.md" "serialization"
require_text "apps/mobile/ffi/README.md" "binding generation"
require_text "apps/mobile/ffi/README.md" "mobile app readiness"

reject_find "Android build project files" \
  \( -name build.gradle -o -name settings.gradle -o -name AndroidManifest.xml \)
reject_find "iOS build project files" \
  \( -name Package.swift -o -name Info.plist -o -name '*.xcodeproj' -o -name '*.xcworkspace' \)
reject_find "mobile runtime or generated binding source" \
  \( -name '*.kt' -o -name '*.swift' -o -name '*.udl' \)
reject_find "mobile app artifacts" \
  \( -name '*.apk' -o -name '*.aab' -o -name '*.ipa' \)
reject_find "mobile build output directories" \
  \( -type d -name build -o -type d -name DerivedData \)

printf 'status=mobile-skeleton-boundary-verified\n'

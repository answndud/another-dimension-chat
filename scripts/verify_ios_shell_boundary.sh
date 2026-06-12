#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/apps/mobile/ios"

require_file() {
  local path="$1"
  if [ ! -f "$ROOT_DIR/$path" ]; then
    echo "missing iOS shell boundary file: $path" >&2
    exit 1
  fi
}

require_text() {
  local path="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$ROOT_DIR/$path"; then
    echo "missing iOS shell boundary text in $path: $text" >&2
    exit 1
  fi
}

reject_text() {
  local path="$1"
  local text="$2"
  if grep -Fq -- "$text" "$ROOT_DIR/$path"; then
    echo "forbidden iOS shell boundary text in $path: $text" >&2
    exit 1
  fi
}

reject_find() {
  local description="$1"
  shift
  if find "$IOS_DIR" "$@" -print -quit | grep -q .; then
    echo "iOS shell boundary must not contain $description" >&2
    exit 1
  fi
}

require_file "apps/mobile/ios/AnotherDimension.xcodeproj/project.pbxproj"
require_file "apps/mobile/ios/AnotherDimension/AnotherDimensionApp.swift"
require_file "apps/mobile/ios/AnotherDimension/ContentView.swift"
require_file "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift"
require_file "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift"
require_file "apps/mobile/ios/AnotherDimension/Info.plist"
require_file "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements"
require_file "apps/mobile/ios/README.md"
require_file "apps/mobile/ffi/README.md"
require_file "apps/mobile/ffi/shared_core_mobile_api_contract.json"
require_file "crates/core/src/lib.rs"

require_text "apps/mobile/ios/README.md" "iOS Shell Scaffold Boundary"
require_text "apps/mobile/ios/README.md" "thin Swift shell over the shared Rust core boundary"
require_text "apps/mobile/ios/README.md" "not an IPA artifact"
require_text "apps/mobile/ios/README.md" "not TestFlight distribution"
require_text "apps/mobile/ios/README.md" "App Store"
require_text "apps/mobile/ios/README.md" "readiness, not production-ready"
require_text "apps/mobile/ios/README.md" "sensitive"
require_text "apps/mobile/ios/README.md" "Phase HQ records explicit implementation authorization"
require_text "apps/mobile/ios/README.md" "does not authorize release packaging"
require_text "apps/mobile/ios/README.md" "SharedCoreMobileApi"
require_text "apps/mobile/ios/README.md" "IOSSharedCoreBoundary"
require_text "apps/mobile/ios/README.md" "iCloud backup not claimed"
require_text "apps/mobile/ios/README.md" "must not define independent protocol, storage, transport"
require_text "apps/mobile/ios/README.md" "external onion delivery success"
require_text "apps/mobile/ios/README.md" "security-ready behavior"

require_text "apps/mobile/ios/AnotherDimension.xcodeproj/project.pbxproj" "objectVersion"
require_text "apps/mobile/ios/AnotherDimension/Info.plist" "chat.anotherdimension.ios"
require_text "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements" "icloud-container-identifiers"
require_text "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements" "<array/>"

require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "protocol SharedCoreMobileApi"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "readOnlyStatusAdapter.sharedCoreStatusSurface()"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "readOnlyStatusAdapter.redactedSupportDiagnostics()"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func sharedCoreStatusSurface"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func profileUnlockLockStatus"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func inviteCodeCreateJoin"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func pairingPayloadExportImport"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func safetyTranscriptConfirm"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func manualEnvelopeExportImport"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func messageTranscriptView"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func localDataLifecycle"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "func redactedSupportDiagnostics"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "ffi_unavailable"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "explicit user action required"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "sensitive communication prohibited"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "not audited"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "not production-ready"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "external onion delivery not claimed"
require_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "mobile readiness not claimed"
require_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "SourceBoundaryReadOnlyNativeStatusAdapter"
require_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "shared_core_status_surface"
require_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "redacted_support_diagnostics"
require_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "not production-ready"

require_text "apps/mobile/ios/AnotherDimension/ContentView.swift" "SecureField"
require_text "apps/mobile/ios/AnotherDimension/ContentView.swift" "sharedCore.profileUnlockLockStatus"
require_text "apps/mobile/ios/AnotherDimension/ContentView.swift" "sharedCore.inviteCodeCreateJoin"
require_text "apps/mobile/ios/AnotherDimension/ContentView.swift" "sharedCore.manualEnvelopeExportImport"
require_text "apps/mobile/ios/AnotherDimension/ContentView.swift" "sharedCore.redactedSupportDiagnostics"

require_text "apps/mobile/ffi/README.md" "production_mobile_shared_core_api_freeze_boundary_summary"
require_text "apps/mobile/ffi/shared_core_mobile_api_contract.json" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
require_text "crates/core/src/lib.rs" "production_mobile_shared_core_api_freeze_boundary_summary"

reject_text "apps/mobile/ios/AnotherDimension/Info.plist" "NSContactsUsageDescription"
reject_text "apps/mobile/ios/AnotherDimension/Info.plist" "UIBackgroundModes"
reject_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "URLSession"
reject_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "NWConnection"
reject_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "CloudKit"
reject_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "Contacts"
reject_text "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift" "UserNotifications"
reject_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "URLSession"
reject_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "NWConnection"
reject_text "apps/mobile/ios/AnotherDimension/ReadOnlyNativeStatusAdapter.swift" "CloudKit"
reject_find "iOS build outputs or app artifacts" \
  \( -type d -name DerivedData -o -name '*.ipa' \)

printf 'status=ios-shell-boundary-verified\n'
printf 'ios_source_scaffold_created=true\n'
printf 'ios_xcode_scaffold_created=true\n'
printf 'ios_runtime_messaging_created=false\n'
printf 'wrapper_specific_protocol_storage_transport=false\n'
printf 'external_delivery_claim=false\n'
printf 'mobile_readiness_claim=false\n'

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/apps/mobile/android"

require_file() {
  local path="$1"
  if [ ! -f "$ROOT_DIR/$path" ]; then
    echo "missing Android shell boundary file: $path" >&2
    exit 1
  fi
}

require_text() {
  local path="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$ROOT_DIR/$path"; then
    echo "missing Android shell boundary text in $path: $text" >&2
    exit 1
  fi
}

reject_text() {
  local path="$1"
  local text="$2"
  if grep -Fq -- "$text" "$ROOT_DIR/$path"; then
    echo "forbidden Android shell boundary text in $path: $text" >&2
    exit 1
  fi
}

reject_find() {
  local description="$1"
  shift
  if find "$ANDROID_DIR" "$@" -print -quit | grep -q .; then
    echo "Android shell boundary must not contain $description" >&2
    exit 1
  fi
}

require_file "apps/mobile/android/settings.gradle.kts"
require_file "apps/mobile/android/build.gradle.kts"
require_file "apps/mobile/android/gradle.properties"
require_file "apps/mobile/android/app/build.gradle.kts"
require_file "apps/mobile/android/app/src/main/AndroidManifest.xml"
require_file "apps/mobile/android/app/src/main/res/xml/data_extraction_rules.xml"
require_file "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
require_file "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt"
require_file "apps/mobile/android/README.md"
require_file "apps/mobile/ffi/README.md"
require_file "apps/mobile/ffi/shared_core_mobile_api_contract.json"
require_file "crates/core/src/lib.rs"

require_text "apps/mobile/android/README.md" "Android Shell Scaffold Boundary"
require_text "apps/mobile/android/README.md" "thin Kotlin shell over the shared Rust core boundary"
require_text "apps/mobile/android/README.md" "not an APK or AAB artifact"
require_text "apps/mobile/android/README.md" "not Play Store distribution"
require_text "apps/mobile/android/README.md" "readiness, not production-ready"
require_text "apps/mobile/android/README.md" "not production-ready"
require_text "apps/mobile/android/README.md" "sensitive"
require_text "apps/mobile/android/README.md" "Phase HP records explicit implementation authorization"
require_text "apps/mobile/android/README.md" "does not authorize release packaging"
require_text "apps/mobile/android/README.md" "SharedCoreMobileApi"
require_text "apps/mobile/android/README.md" "AndroidSharedCoreBoundary"
require_text "apps/mobile/android/README.md" "backup exclusion"
require_text "apps/mobile/android/README.md" "must not define independent protocol, storage, transport"
require_text "apps/mobile/android/README.md" "external onion delivery success"
require_text "apps/mobile/android/README.md" "security-ready behavior"

require_text "apps/mobile/android/settings.gradle.kts" "include(\":app\")"
require_text "apps/mobile/android/build.gradle.kts" "com.android.application"
require_text "apps/mobile/android/build.gradle.kts" "org.jetbrains.kotlin.android"
require_text "apps/mobile/android/app/build.gradle.kts" "namespace = \"chat.anotherdimension.android\""
require_text "apps/mobile/android/app/build.gradle.kts" "minSdk = 26"
require_text "apps/mobile/android/app/src/main/AndroidManifest.xml" "android:allowBackup=\"false\""
require_text "apps/mobile/android/app/src/main/AndroidManifest.xml" "data_extraction_rules"
require_text "apps/mobile/android/app/src/main/res/xml/data_extraction_rules.xml" "<exclude domain=\"database\" path=\".\""
require_text "apps/mobile/android/app/src/main/res/xml/data_extraction_rules.xml" "<exclude domain=\"sharedpref\" path=\".\""

require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "interface SharedCoreMobileApi"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun sharedCoreStatusSurface"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun profileUnlockLockStatus"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun inviteCodeCreateJoin"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun pairingPayloadExportImport"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun safetyTranscriptConfirm"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun manualEnvelopeExportImport"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun messageTranscriptView"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun localDataLifecycle"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "fun redactedSupportDiagnostics"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "ffi_unavailable"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "explicit user action required"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "sensitive communication prohibited"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "not audited"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "not production-ready"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "external onion delivery not claimed"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "mobile readiness not claimed"

require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt" "InputType.TYPE_TEXT_VARIATION_PASSWORD"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt" "sharedCore.profileUnlockLockStatus"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt" "sharedCore.inviteCodeCreateJoin"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt" "sharedCore.manualEnvelopeExportImport"
require_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt" "sharedCore.redactedSupportDiagnostics"

require_text "apps/mobile/ffi/README.md" "production_mobile_shared_core_api_freeze_boundary_summary"
require_text "apps/mobile/ffi/shared_core_mobile_api_contract.json" '"first_binding_unit": "status_and_redacted_diagnostics_read_only_adapter"'
require_text "crates/core/src/lib.rs" "production_mobile_shared_core_api_freeze_boundary_summary"

reject_text "apps/mobile/android/app/src/main/AndroidManifest.xml" "android.permission.INTERNET"
reject_text "apps/mobile/android/app/src/main/AndroidManifest.xml" "com.google.firebase"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "Firebase"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "GoogleSignIn"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "ContactsContract"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "Telephony"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "HttpURLConnection"
reject_text "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt" "Socket"
reject_find "Android build outputs or app artifacts" \
  \( -type d -name build -o -name '*.apk' -o -name '*.aab' \)

printf 'status=android-shell-boundary-verified\n'
printf 'android_source_scaffold_created=true\n'
printf 'android_build_scaffold_created=true\n'
printf 'android_runtime_messaging_created=false\n'
printf 'wrapper_specific_protocol_storage_transport=false\n'
printf 'external_delivery_claim=false\n'
printf 'mobile_readiness_claim=false\n'

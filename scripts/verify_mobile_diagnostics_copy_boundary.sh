#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile diagnostics copy boundary file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile diagnostics copy boundary text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile diagnostics copy boundary text in $file: $text" >&2
    exit 1
  fi
}

require_file "$ANDROID_VIEW"
require_file "$IOS_VIEW"

require_text "$ANDROID_VIEW" "Copy Diagnostics"
require_text "$ANDROID_VIEW" "copyRedactedDiagnosticsPayload(sharedCore.redactedSupportDiagnostics())"
require_text "$ANDROID_VIEW" "renderRedactedDiagnosticsPayload(status)"
require_text "$ANDROID_VIEW" "another-dimension-redacted-diagnostics"
require_text "$ANDROID_VIEW" "ClipData.newPlainText"
require_text "$ANDROID_VIEW" "Context.CLIPBOARD_SERVICE"

require_text "$IOS_VIEW" "Copy Diagnostics"
require_text "$IOS_VIEW" "copyRedactedDiagnosticsPayload(sharedCore.redactedSupportDiagnostics())"
require_text "$IOS_VIEW" "renderRedactedDiagnosticsPayload(status)"
require_text "$IOS_VIEW" "redactedDiagnosticsCopyBuffer"

for view in "$ANDROID_VIEW" "$IOS_VIEW"; do
  require_text "$view" "diagnostics_copy_boundary=user_initiated_local_clipboard_only"
  require_text "$view" "diagnostics_payload=redacted_status_support_only"
  require_text "$view" "redacted diagnostics copied by explicit user action"
  require_text "$view" "public_non_claims="
  require_text "$view" "failure_class=policy_blocked"
  require_text "$view" "recovery_next_action="
  require_text "$view" "schema_version="
  require_text "$view" "diagnostics_redaction_state="

  reject_text "$view" "logcat"
  reject_text "$view" "sysdiagnose"
  reject_text "$view" "crash upload"
  reject_text "$view" "support bundle"
  reject_text "$view" "share sheet"
  reject_text "$view" "invite_code="
  reject_text "$view" "pairing_payload="
  reject_text "$view" "manual_envelope="
  reject_text "$view" "message_text="
  reject_text "$view" "local_path="
  reject_text "$view" "passphrase="
  reject_text "$view" "private_key="
  reject_text "$view" "raw_log="
  reject_text "$view" "URLSession"
  reject_text "$view" "NWConnection"
  reject_text "$view" "HttpURLConnection"
  reject_text "$view" "Socket"
done

printf 'status=mobile-diagnostics-copy-boundary-verified\n'
printf 'diagnostics_payload=redacted_status_support_only\n'
printf 'copy_boundary=user_initiated_local_clipboard_only\n'
printf 'private_payload_prefill=false\n'
printf 'mobile_readiness_claim=false\n'

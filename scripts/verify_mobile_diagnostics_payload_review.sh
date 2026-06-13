#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT_DIR/apps/mobile/ffi/shared_core_mobile_api_contract.json"
REVIEW="$ROOT_DIR/apps/mobile/ffi/diagnostics_payload_review.json"
FFI_README="$ROOT_DIR/apps/mobile/ffi/README.md"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile diagnostics payload review file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile diagnostics payload review text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile diagnostics payload review text in $file: $text" >&2
    exit 1
  fi
}

require_file "$CONTRACT"
require_file "$REVIEW"
require_file "$FFI_README"
require_file "$ANDROID_VIEW"
require_file "$IOS_VIEW"

node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" "$CONTRACT" "$REVIEW"

require_text "$CONTRACT" '"redacted_diagnostics_payload_reviewed": true'
require_text "$CONTRACT" '"diagnostics_payload_review_file": "apps/mobile/ffi/diagnostics_payload_review.json"'
require_text "$REVIEW" '"redacted_diagnostics_payload_reviewed": true'
require_text "$REVIEW" '"callable_ffi_implemented": false'
require_text "$REVIEW" '"generated_bindings_claimed": false'

for field in \
  status \
  build \
  failure_class \
  recovery_next_action \
  app_launch_network_boundary \
  diagnostics_redaction_state \
  schema_version \
  platform \
  public_non_claims; do
  require_text "$REVIEW" "\"$field\""
  require_text "$FFI_README" "$field"
done

for boundary in \
  'diagnostics_copy_boundary=user_initiated_local_clipboard_only' \
  'diagnostics_payload=redacted_status_support_only' \
  'private_payload_prefill=false' \
  'native_network_upload=false' \
  'crash_upload=false' \
  'background_diagnostics_upload=false'; do
  require_text "$CONTRACT" "$boundary"
  require_text "$REVIEW" "$boundary"
  require_text "$FFI_README" "$boundary"
done

for channel in \
  in_app_redacted_text_view \
  explicit_user_initiated_copy \
  minimal_private_security_contact_request; do
  require_text "$REVIEW" "\"$channel\""
  require_text "$FFI_README" "$channel"
done

for forbidden in \
  bridge_lines \
  onion_endpoints \
  invite_codes \
  pairing_payloads \
  envelope_payloads \
  safety_phrases \
  profile_names \
  message_text \
  local_paths \
  raw_logs \
  crash_dumps \
  screenshots_with_private_room_data \
  passphrases \
  private_keys \
  key_material \
  support_bundles \
  android_logcat \
  ios_sysdiagnose \
  telemetry_uploads \
  share_sheet_private_data_prefill; do
  require_text "$REVIEW" "\"$forbidden\""
done

for view in "$ANDROID_VIEW" "$IOS_VIEW"; do
  require_text "$view" "copyRedactedDiagnosticsPayload"
  require_text "$view" "diagnostics_copy_boundary=user_initiated_local_clipboard_only"
  require_text "$view" "diagnostics_payload=redacted_status_support_only"
  require_text "$view" "public_non_claims="
  require_text "$view" "diagnostics_redaction_state="
  reject_text "$view" "invite_code="
  reject_text "$view" "pairing_payload="
  reject_text "$view" "manual_envelope="
  reject_text "$view" "message_text="
  reject_text "$view" "local_path="
  reject_text "$view" "raw_log="
  reject_text "$view" "passphrase="
  reject_text "$view" "private_key="
done

require_text "$FFI_README" "Redacted Diagnostics Payload Review Boundary"
require_text "$FFI_README" 'The review file is `diagnostics_payload_review.json`.'
require_text "$FFI_README" "does not create callable FFI"

reject_text "$REVIEW" '"callable_ffi_implemented": true'
reject_text "$REVIEW" '"generated_bindings_claimed": true'

printf 'status=mobile-diagnostics-payload-review-verified\n'
printf 'redacted_diagnostics_payload_reviewed=true\n'
printf 'private_payload_prefill=false\n'
printf 'native_network_upload=false\n'
printf 'crash_upload=false\n'
printf 'callable_ffi_implemented=false\n'

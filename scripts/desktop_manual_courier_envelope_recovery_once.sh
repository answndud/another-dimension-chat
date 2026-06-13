#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required manual courier recovery text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden manual courier recovery pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MANUAL_COURIER_ENVELOPE_RECOVERY.md"
SLOTS="apps/desktop-tauri/src/message-envelope-slots.js"
MAIN="apps/desktop-tauri/src/main.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"

for file in "$DOC" "$SLOTS" "$MAIN" "$UI_SMOKE" \
  "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" \
  "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"; do
  [ -f "$file" ] || fail "missing manual courier envelope recovery input: $file"
done

for flag in \
  "manual_courier_envelope_recovery_available=true" \
  "manual_envelope_active_pending_row_required=true" \
  "manual_envelope_explicit_user_export_required=true" \
  "manual_envelope_slot_network_io=false" \
  "manual_envelope_slot_automatic_delivery=false" \
  "manual_envelope_sender_receiver_match_required=true" \
  "manual_envelope_room_fingerprint_match_required=true" \
  "manual_envelope_message_number_match_required=true" \
  "manual_envelope_message_body_match_required=true" \
  "legacy_unscoped_envelope_import_ready=false" \
  "implicit_envelope_import_ready=false" \
  "wrong_room_envelope_import_ready=false" \
  "stale_envelope_import_ready=false" \
  "canceled_envelope_import_ready=false" \
  "duplicate_received_envelope_import_ready=false" \
  "canceled_envelope_recovery_hint_ready=true" \
  "duplicate_received_envelope_recovery_hint_ready=true" \
  "stale_envelope_recovery_hint_ready=true" \
  "default_transport_network_io=false" \
  "default_transport_automatic_delivery=false" \
  "automatic_network_on_launch_allowed=false" \
  "reliable_external_delivery_claim_allowed=false" \
  "production_transport_ready=false" \
  "security_ready_claimed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$SLOTS" "export function messageEnvelopeSlotMismatchReason"
must_contain "$SLOTS" "export function messageEnvelopeSlotCreatedByExplicitUserAction"
must_contain "$SLOTS" "createdByExplicitUserAction === true"
must_contain "$SLOTS" "manualAction === MANUAL_ENVELOPE_EXPORT_ACTION"
must_contain "$SLOTS" "defaultTransportNetworkIo === false"
must_contain "$SLOTS" "defaultTransportAutomaticDelivery === false"
must_contain "$SLOTS" "automaticNetworkOnLaunch === false"
must_contain "$SLOTS" "missing-explicit-user-action"
must_contain "$SLOTS" "canceled-entry"
must_contain "$SLOTS" "already-received-entry"
must_contain "$SLOTS" "legacy-unscoped-slot"
must_contain "$SLOTS" "room-fingerprint-mismatch"
must_contain "$SLOTS" "message-number-mismatch"
must_contain "$SLOTS" "message-mismatch"
must_contain "$SLOTS" "return messageEnvelopeSlotMismatchReason(slot, entry) === \"matched\""
must_not_match "$SLOTS" "typeof slot === \"string\"[[:space:]]*\\{[[:space:]]*return true;"
must_contain "$MAIN" "messageEnvelopeSlotRecoveryHint(slot, entry)"
must_contain "$MAIN" "explicitUserAction: true"
must_contain "$MAIN" "manualAction: \"export-envelope\""
must_not_match "$MAIN" "typeof slot === \"string\"[[:space:]]*\\{[[:space:]]*continue;"
must_contain "$UI_SMOKE" "legacy-unscoped-slot"
must_contain "$UI_SMOKE" "messageEnvelopeSlotCreatedByExplicitUserAction"
must_contain "$UI_SMOKE" "missing-explicit-user-action"
must_contain "$UI_SMOKE" "canceled-entry"
must_contain "$UI_SMOKE" "already-received-entry"
must_contain "$UI_SMOKE" "room-fingerprint-mismatch"
must_contain "$UI_SMOKE" "messageEnvelopeSlotRecoveryHint"
must_contain "$UI_SMOKE" "messageEnvelopeSlotImportReadyForEntry(\"ADENV1LEGACY\", sentEntry), false"
must_contain "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" "reference/MANUAL_COURIER_ENVELOPE_RECOVERY.md"
must_contain "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md" "manual_courier_envelope_recovery_available=true"

for file in "$DOC" "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md" \
  "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"; do
  must_not_match "$file" "legacy_unscoped_envelope_import_ready=true"
  must_not_match "$file" "implicit_envelope_import_ready=true"
  must_not_match "$file" "wrong_room_envelope_import_ready=true"
  must_not_match "$file" "stale_envelope_import_ready=true"
  must_not_match "$file" "default_transport_network_io=true"
  must_not_match "$file" "default_transport_automatic_delivery=true"
  must_not_match "$file" "automatic_network_on_launch_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "production_transport_ready=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

cat <<'STATUS'
status=desktop-manual-courier-envelope-recovery-ready
manual_courier_envelope_recovery_available=true
manual_envelope_active_pending_row_required=true
manual_envelope_explicit_user_export_required=true
manual_envelope_slot_network_io=false
manual_envelope_slot_automatic_delivery=false
legacy_unscoped_envelope_import_ready=false
implicit_envelope_import_ready=false
wrong_room_envelope_import_ready=false
stale_envelope_import_ready=false
canceled_envelope_import_ready=false
duplicate_received_envelope_import_ready=false
canceled_envelope_recovery_hint_ready=true
duplicate_received_envelope_recovery_hint_ready=true
stale_envelope_recovery_hint_ready=true
default_transport_network_io=false
default_transport_automatic_delivery=false
automatic_network_on_launch_allowed=false
reliable_external_delivery_claim_allowed=false
production_transport_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
STATUS

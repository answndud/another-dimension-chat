#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required first-run usability text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden first-run usability pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_FIRST_RUN_RECOVERY_USABILITY_MATRIX.md"
INDEX="apps/desktop-tauri/index.html"
I18N="apps/desktop-tauri/src/i18n.js"
MAIN="apps/desktop-tauri/src/main.js"
PRIVATE_STATE="apps/desktop-tauri/src/private-delivery-state.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"

for file in "$DOC" "$INDEX" "$I18N" "$MAIN" "$PRIVATE_STATE" "$UI_SMOKE"; do
  [ -f "$file" ] || fail "missing first-run usability matrix input: $file"
done

for flag in \
  "macos_first_run_recovery_usability_matrix_available=true" \
  "first_run_release_class_visible=true" \
  "profile_error_recovery_visible=true" \
  "invite_next_action_visible=true" \
  "safety_mismatch_repair_visible=true" \
  "manual_envelope_recovery_visible=true" \
  "pending_retry_cancel_visible=true" \
  "destructive_actions_separated=true" \
  "redacted_support_report_copy_visible=true" \
  "support_report_raw_logs_allowed=false" \
  "support_report_private_payload_allowed=false" \
  "support_report_key_material_allowed=false" \
  "representative_usability_evidence_completed=false" \
  "usability_study_completed=false" \
  "production_wording_ready=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$INDEX" "class=\"public-beta-warning\""
must_contain "$INDEX" "class=\"first-run-checklist\""
must_contain "$INDEX" "data-i18n=\"firstRunProfileStep\""
must_contain "$INDEX" "data-i18n=\"firstRunRoomStep\""
must_contain "$INDEX" "data-i18n=\"firstRunVerifyStep\""
must_contain "$INDEX" "data-i18n=\"firstRunManualMessageStep\""
must_contain "$INDEX" "data-i18n=\"firstRunDiagnosticsStep\""
must_contain "$INDEX" "manual-flow-guide"
must_contain "$INDEX" "public-recovery-guide"
must_contain "$INDEX" "public-diagnostics-panel"
must_contain "$INDEX" "production-profile-delete-confirmation"
must_contain "$INDEX" "production-full-wipe-confirmation"
must_contain "$INDEX" "delete-production-session-lifecycle"
must_contain "$INDEX" "delete-production-conversation"

must_contain "$I18N" "unsigned experimental public beta"
must_contain "$I18N" "not audited"
must_contain "$I18N" "not production-ready"
must_contain "$I18N" "sensitive communication prohibited"
must_contain "$I18N" "Export/import the manual encrypted envelope, then reply, retry, cancel, or delete locally."
must_contain "$I18N" "Lifecycle confirmation required: confirm the local-only delete or wipe scope before continuing."
must_contain "$I18N" "No cloud backup recovery, rollback prevention, or secure deletion from storage media is claimed."

must_contain "$MAIN" "function friendFamilyOnboardingView"
must_contain "$MAIN" "function runProductionTwoProfileComposerPrimaryAction"
must_contain "$MAIN" "function dataLifecycleDestructivePreflightView"
must_contain "$MAIN" "public diagnostics generated failure_class="
must_contain "$MAIN" "recovery_next_action="
must_contain "$MAIN" "support_bundle_export=false"
must_contain "$MAIN" "rollback_prevention=false secure_delete_claim=false"

must_contain "$PRIVATE_STATE" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
must_contain "$PRIVATE_STATE" "allowed_public_intake_fields="
must_contain "$PRIVATE_STATE" "forbidden_public_intake_fields="
must_contain "$PRIVATE_STATE" "\"raw-logs\""
must_contain "$PRIVATE_STATE" "\"endpoints\""
must_contain "$PRIVATE_STATE" "\"invite-codes\""
must_contain "$PRIVATE_STATE" "\"message-text\""
must_contain "$PRIVATE_STATE" "\"local-paths\""
must_contain "$PRIVATE_STATE" "\"payloads\""
must_contain "$PRIVATE_STATE" "\"safety-phrases\""
must_contain "$PRIVATE_STATE" "\"profile-names\""
must_contain "$PRIVATE_STATE" "\"passphrases\""
must_contain "$PRIVATE_STATE" "\"key-material\""
must_contain "$PRIVATE_STATE" "\"private-planning-notes\""
must_contain "apps/desktop-tauri/src/private-delivery-state.test.js" "forbidden_public_intake_fields=raw-logs#endpoints#invite-codes#message-text#local-paths#payloads#safety-phrases#profile-names#passphrases#key-material#private-planning-notes"

must_contain "$UI_SMOKE" "first launch public beta warning keeps release and network boundaries visible"
must_contain "$UI_SMOKE" "public diagnostics recovery guide keeps support-safe next actions visible"
must_contain "$UI_SMOKE" "local data lifecycle actions expose destructive local-only boundaries"
must_contain "$UI_SMOKE" "public diagnostics summary includes desktop completion without production claims"

for file in "$DOC" "$I18N" "$MAIN" "$PRIVATE_STATE" "$UI_SMOKE"; do
  must_not_match "$file" "usability_study_completed=true"
  must_not_match "$file" "representative_usability_evidence_completed=true"
  must_not_match "$file" "production_wording_ready=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "support_report_raw_logs_allowed=true"
  must_not_match "$file" "support_report_private_payload_allowed=true"
  must_not_match "$file" "support_report_key_material_allowed=true"
done

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=macos-first-run-recovery-usability-matrix-ready
macos_first_run_recovery_usability_matrix_available=true
first_run_release_class_visible=true
profile_error_recovery_visible=true
invite_next_action_visible=true
safety_mismatch_repair_visible=true
manual_envelope_recovery_visible=true
pending_retry_cancel_visible=true
destructive_actions_separated=true
redacted_support_report_copy_visible=true
support_report_raw_logs_allowed=false
support_report_private_payload_allowed=false
support_report_key_material_allowed=false
representative_usability_evidence_completed=false
usability_study_completed=false
production_wording_ready=false
sensitive_communication_allowed=false
STATUS

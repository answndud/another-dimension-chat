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
    fail "$file contains forbidden usability/recovery claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"
UX_DOC="reference/MACOS_PRODUCTION_UX_ONBOARDING.md"
PRIVATE_STATE="apps/desktop-tauri/src/private-delivery-state.js"
MAIN_JS="apps/desktop-tauri/src/main.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
USABILITY_PACKET="reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md"
USABILITY_VALIDATOR="scripts/validate_representative_usability_reports.mjs"

for file in "$DOC" "$UX_DOC" "$PRIVATE_STATE" "$MAIN_JS" "$UI_SMOKE" \
  "$PACKET" "$STABLE_GATE" "$USABILITY_PACKET" "$USABILITY_VALIDATOR" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing RB-4 macOS usability/recovery input: $file"
done

must_contain "$DOC" "rb_4_macos_usability_recovery_closure_reviewed=true"
must_contain "$DOC" "d100_4_external_evidence_intake_execution_reviewed=true"
must_contain "$DOC" "supported_owner_observed_usability_rehearsal_ready=true"
must_contain "$DOC" "supported_usability_recovery_scope=owner-observed-critical-desktop-task-script-only"
must_contain "$DOC" "critical_desktop_task_script_ready=true"
must_contain "$DOC" "first_run_local_desktop_flow_visible=true"
must_contain "$DOC" "invite_verify_message_flow_in_app=true"
must_contain "$DOC" "manual_envelope_default_flow_visible=true"
must_contain "$DOC" "friend_family_next_actions_visible=true"
must_contain "$DOC" "recovery_guide_visible=true"
must_contain "$DOC" "recovery_vocabulary_aligned=true"
must_contain "$DOC" "redacted_diagnostics_copy_visible=true"
must_contain "$DOC" "destructive_local_lifecycle_confirmations_visible=true"
must_contain "$DOC" "advanced_transport_explicit_fail_closed=true"
must_contain "$DOC" "representative_usability_report_packet_available=true"
must_contain "$DOC" "representative_usability_report_validator_available=true"
must_contain "$DOC" "usability_report_validator_ready=true"
must_contain "$DOC" "consent_non_sensitive_use_notice_ready=true"
must_contain "$DOC" "representative_usability_sample_threshold=3-5"
must_contain "$DOC" "usability_study_completed=false"
must_contain "$DOC" "representative_usability_evidence_completed=false"
must_contain "$DOC" "production_wording_ready=false"
must_contain "$DOC" "automatic_network_on_launch_allowed=false"
must_contain "$DOC" "external_delivery_claim_allowed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=Phase A100-2 - External Review Execution And Finding Closure"

must_contain "$UX_DOC" "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"
must_contain "$UX_DOC" "supported_owner_observed_usability_rehearsal_ready=true"
must_contain "$UX_DOC" "usability_study_completed=false"
must_contain "$PRIVATE_STATE" "supportedOwnerObservedUsabilityRehearsalReady: true"
must_contain "$PRIVATE_STATE" "supportedUsabilityRecoveryScope: \"owner-observed-critical-desktop-task-script-only\""
must_contain "$PRIVATE_STATE" "criticalDesktopTaskScriptReady: true"
must_contain "$PRIVATE_STATE" "recoveryVocabularyAligned: true"
must_contain "$PRIVATE_STATE" "usabilityStudyCompleted: false"
must_contain "$PRIVATE_STATE" "productionWordingReady: false"
must_contain "$PRIVATE_STATE" "supported_owner_observed_usability_rehearsal_ready=\${desktopCompletion.supportedOwnerObservedUsabilityRehearsalReady === true}"
must_contain "$PRIVATE_STATE" "usability_study_completed=\${desktopCompletion.usabilityStudyCompleted === true}"
must_contain "$MAIN_JS" "supported_owner_observed_usability_rehearsal_ready=\${supportedOwnerObservedUsabilityRehearsalReady}"
must_contain "$MAIN_JS" "usability_study_completed=\${usabilityStudyCompleted}"
must_contain "$MAIN_JS" "production_wording_ready=\${productionWordingReady}"
must_contain "$UI_SMOKE" "supported_owner_observed_usability_rehearsal_ready="
must_contain "$UI_SMOKE" "usability_study_completed="
must_contain "$PACKET" "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"
must_contain "$PACKET" "reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md"
must_contain "$USABILITY_PACKET" "representative_usability_report_packet_available=true"
must_contain "$USABILITY_PACKET" "consent_non_sensitive_use_notice_ready=true"
must_contain "$USABILITY_VALIDATOR" "status=representative-usability-evidence-candidate-requires-review"
must_contain "$STABLE_GATE" "supported_owner_observed_usability_rehearsal_ready=true"
must_contain "$STABLE_GATE" "usability_study_completed=false"
must_contain "README.md" "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"
must_contain "SECURITY.md" "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md"

for file in "$DOC" "$UX_DOC" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "usability_study_completed=true"
  must_not_match "$file" "representative_usability_evidence_completed=true"
  must_not_match "$file" "production_wording_ready=true"
  must_not_match "$file" "automatic_network_on_launch_allowed=true"
  must_not_match "$file" "external_delivery_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
done

scripts/macos_production_ux_onboarding_once.sh >/dev/null
scripts/desktop_manual_flow_usability_once.sh >/dev/null
scripts/desktop_error_recovery_copy_once.sh >/dev/null
scripts/desktop_lifecycle_safety_once.sh >/dev/null

cat <<'STATUS'
status=macos-usability-recovery-closure-ready
rb_4_macos_usability_recovery_closure_reviewed=true
supported_owner_observed_usability_rehearsal_ready=true
supported_usability_recovery_scope=owner-observed-critical-desktop-task-script-only
critical_desktop_task_script_ready=true
first_run_local_desktop_flow_visible=true
invite_verify_message_flow_in_app=true
manual_envelope_default_flow_visible=true
friend_family_next_actions_visible=true
recovery_guide_visible=true
recovery_vocabulary_aligned=true
redacted_diagnostics_copy_visible=true
destructive_local_lifecycle_confirmations_visible=true
advanced_transport_explicit_fail_closed=true
representative_usability_report_packet_available=true
representative_usability_report_validator_available=true
usability_report_validator_ready=true
consent_non_sensitive_use_notice_ready=true
representative_usability_sample_threshold=3-5
usability_study_completed=false
representative_usability_evidence_completed=false
production_wording_ready=false
automatic_network_on_launch_allowed=false
external_delivery_claim_allowed=false
sensitive_communication_allowed=false
security_ready_claimed=false
next_required_phase=Phase-A100-2-External-Review-Execution-And-Finding-Closure
STATUS

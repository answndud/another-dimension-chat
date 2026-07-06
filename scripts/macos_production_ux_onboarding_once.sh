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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_PRODUCTION_UX_ONBOARDING.md"

must_contain "$DOC" "macos_production_ux_onboarding_gate_reviewed=true"
must_contain "$DOC" "rb_4_macos_usability_recovery_closure_reviewed=true"
must_contain "$DOC" "supported_owner_observed_usability_rehearsal_ready=true"
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
must_contain "$DOC" "beta_warning_preserved=true"
must_contain "$DOC" "production_wording_ready=false"
must_contain "$DOC" "usability_study_completed=false"
must_contain "$DOC" "automatic_network_on_launch_allowed=false"
must_contain "$DOC" "external_delivery_claim_allowed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=RB-5 real macOS two-machine field evidence closure"

must_contain "README.md" "reference/MACOS_PRODUCTION_UX_ONBOARDING.md"
must_contain "SECURITY.md" "reference/MACOS_PRODUCTION_UX_ONBOARDING.md"
must_contain "apps/desktop-tauri/README.md" "../../reference/MACOS_PRODUCTION_UX_ONBOARDING.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/MACOS_PRODUCTION_UX_ONBOARDING.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_5_macos_production_ux_onboarding_gate_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "production_wording_ready=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "usability_study_completed=false"

must_contain "apps/desktop-tauri/index.html" "class=\"public-beta-warning\""
must_contain "apps/desktop-tauri/index.html" "class=\"first-run-checklist\""
must_contain "apps/desktop-tauri/index.html" "data-i18n=\"firstRunProfileStep\""
must_contain "apps/desktop-tauri/index.html" "data-i18n=\"firstRunRoomStep\""
must_contain "apps/desktop-tauri/index.html" "data-i18n=\"firstRunVerifyStep\""
must_contain "apps/desktop-tauri/index.html" "data-i18n=\"firstRunManualMessageStep\""
must_contain "apps/desktop-tauri/index.html" "data-i18n=\"firstRunDiagnosticsStep\""
must_contain "apps/desktop-tauri/index.html" "manual-flow-guide"
must_contain "apps/desktop-tauri/index.html" "public-recovery-guide"
must_contain "apps/desktop-tauri/src/i18n.js" "unsigned experimental public beta"
must_contain "apps/desktop-tauri/src/i18n.js" "not audited"
must_contain "apps/desktop-tauri/src/i18n.js" "not production-ready"
must_contain "apps/desktop-tauri/src/i18n.js" "sensitive communication prohibited"
must_contain "apps/desktop-tauri/src/i18n.js" "Default path is local/manual encrypted envelope exchange"
must_contain "apps/desktop-tauri/src/i18n.js" "Install/checksum failure: stop, verify the same-release .sha256"
must_contain "apps/desktop-tauri/src/i18n.js" "No cloud backup recovery, rollback prevention, or secure deletion from storage media is claimed."
must_contain "apps/desktop-tauri/src/main.js" "function friendFamilyOnboardingView"
must_contain "apps/desktop-tauri/src/main.js" "function runProductionTwoProfileComposerPrimaryAction"
must_contain "apps/desktop-tauri/src/main.js" "function dataLifecycleDestructivePreflightView"
must_contain "apps/desktop-tauri/src/private-delivery-state.js" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "first launch public beta warning keeps release and network boundaries visible"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "friend and family onboarding shows room status next actions"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "manual encrypted envelope guide keeps local default flow visible"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "public diagnostics recovery guide keeps support-safe next actions visible"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "local data lifecycle actions expose destructive local-only boundaries"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "composer and delivery-route controls stay on the chat delivery path"

for file in "$DOC" "README.md" "SECURITY.md" "apps/desktop-tauri/README.md" "apps/desktop-tauri/src/i18n.js" "apps/desktop-tauri/src/main.js"; do
  must_not_match "$file" "production_wording_ready=true"
  must_not_match "$file" "usability_study_completed=true"
  must_not_match "$file" "automatic_network_on_launch_allowed=true"
  must_not_match "$file" "external_delivery_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
done

scripts/desktop_manual_flow_usability_once.sh >/dev/null
scripts/desktop_error_recovery_copy_once.sh >/dev/null
scripts/desktop_lifecycle_safety_once.sh >/dev/null

cat <<'STATUS'
status=macos-production-ux-onboarding-ready
macos_production_ux_onboarding_gate_reviewed=true
first_run_local_desktop_flow_visible=true
invite_verify_message_flow_in_app=true
manual_envelope_default_flow_visible=true
friend_family_next_actions_visible=true
recovery_guide_visible=true
redacted_diagnostics_copy_visible=true
destructive_local_lifecycle_confirmations_visible=true
advanced_transport_explicit_fail_closed=true
beta_warning_preserved=true
production_wording_ready=false
usability_study_completed=false
automatic_network_on_launch_allowed=false
external_delivery_claim_allowed=false
sensitive_communication_allowed=false
security_ready_claimed=false
next_required_phase=RB-5-real-macos-two-machine-field-evidence-closure
STATUS

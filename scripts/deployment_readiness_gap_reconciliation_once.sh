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
    fail "$file contains forbidden deployment readiness pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"

for file in "$REGISTER" "$MATRIX" \
  "reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/MACOS_USABILITY_RECOVERY_CLOSURE.md" \
  "reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md" \
  "reference/PRODUCTION_E2EE_SOURCE_GATE.md" \
  "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md" \
  "reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md" \
  "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md" \
  "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md" \
  "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing deployment readiness reconciliation input: $file"
done

must_contain "$REGISTER" "deployment_readiness_gap_register_reviewed=true"
must_contain "$REGISTER" "target_standard_100_deployment_gap_reconciled=true"
must_contain "$REGISTER" "stale_generic_partial_or_hold_reduced=true"
must_contain "$REGISTER" "source_solved_items_promoted_to_named_supported_scope=true"
must_contain "$REGISTER" "external_blockers_still_visible=true"
must_contain "$REGISTER" "false_or_hold_items_hidden=false"
must_contain "$REGISTER" "public_claim_ahead_of_evidence=false"
must_contain "$REGISTER" "macos_current_scope_supported=true"
must_contain "$REGISTER" "macos_universal_intel_scope_still_hold=true"
must_contain "$REGISTER" "onboarding_recovery_source_ready=true"
must_contain "$REGISTER" "pairwise_identity_source_ready=true"
must_contain "$REGISTER" "production_e2ee_source_gate_reviewed=true"
must_contain "$REGISTER" "production_e2ee_source_ready=true"
must_contain "$REGISTER" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$REGISTER" "protocol_session_e2ee_source_ready=true"
must_contain "$REGISTER" "supported_default_transport_ready=true"
must_contain "$REGISTER" "supported_local_key_lifecycle_ready=true"
must_contain "$REGISTER" "supported_local_deletion_scope_ready=true"
must_contain "$REGISTER" "manual_update_integrity_policy_available=true"

must_contain "$MATRIX" "target_standard_100_deployment_gap_reconciled=true"
must_contain "$MATRIX" "macos_current_scope_supported=true"
must_contain "$MATRIX" "macos_universal_intel_scope_still_hold=true"
must_contain "$MATRIX" "onboarding_recovery_source_ready=true"
must_contain "$MATRIX" "production_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "production_e2ee_source_ready=true"
must_contain "$MATRIX" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "protocol_session_e2ee_source_ready=true"
must_contain "$MATRIX" "supported_default_transport_ready=true"
must_contain "$MATRIX" "supported_local_key_lifecycle_ready=true"
must_contain "$MATRIX" "supported_local_deletion_scope_ready=true"
must_contain "$MATRIX" "manual_update_integrity_policy_available=true"

must_contain "$MATRIX" "pass for explicit Apple Silicon current scope; universal/Intel hold"
must_contain "$MATRIX" "source pass; representative usability hold"
must_contain "$MATRIX" "supported-scope pass; external delivery false"
must_contain "$MATRIX" "supported-scope pass; secure media deletion false"
must_contain "$MATRIX" "source pass for manual same-release policy; signed update/rollback-prevention hold"
must_contain "$MATRIX" "source pass; production operations claim false"
must_contain "$MATRIX" "source pass; identity audit false"
must_contain "$MATRIX" "D100-1 source-ready protocol/session pass; production/audit/sensitive-use/external-delivery false"
must_contain "$MATRIX" "supported-scope pass; full production key management false"
must_contain "$MATRIX" "supported-scope pass; production transport false"
must_contain "$MATRIX" "source pass for current manual release class; signed update hold"

must_contain "README.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "README.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "SECURITY.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"

for file in "$REGISTER" "$MATRIX" "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "developer_id_signing_available=true"
  must_not_match "$file" "notarization_available=true"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "macos_two_machine_real_user_flow_repeated=true"
  must_not_match "$file" "representative_usability_evidence_completed=true"
  must_not_match "$file" "windows_public_artifact_available=true"
  must_not_match "$file" "android_public_artifact_available=true"
  must_not_match "$file" "ios_public_artifact_available=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/target_standard_100_evidence_matrix_once.sh >/dev/null
scripts/production_e2ee_source_gate_once.sh >/dev/null
scripts/production_protocol_session_lifecycle_once.sh >/dev/null
scripts/macos_universal_scoped_artifact_policy_once.sh >/dev/null
scripts/macos_production_ux_onboarding_once.sh >/dev/null
scripts/pairwise_identity_safety_product_closure_once.sh >/dev/null
scripts/production_key_rollback_deletion_closure_once.sh >/dev/null
scripts/production_default_practical_transport_closure_once.sh >/dev/null
scripts/macos_update_rollback_safe_release_channel_once.sh >/dev/null
scripts/operational_support_incident_process_once.sh >/dev/null

cat <<'STATUS'
status=deployment-readiness-gap-reconciled
deployment_readiness_gap_register_reviewed=true
target_standard_100_deployment_gap_reconciled=true
stale_generic_partial_or_hold_reduced=true
source_solved_items_promoted_to_named_supported_scope=true
external_blockers_still_visible=true
false_or_hold_items_hidden=false
public_claim_ahead_of_evidence=false
macos_current_scope_supported=true
macos_universal_intel_scope_still_hold=true
onboarding_recovery_source_ready=true
production_e2ee_source_gate_reviewed=true
production_e2ee_source_ready=true
d100_1_e2ee_source_gate_reviewed=true
protocol_session_e2ee_source_ready=true
supported_default_transport_ready=true
supported_local_key_lifecycle_ready=true
supported_local_deletion_scope_ready=true
manual_update_integrity_policy_available=true
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
STATUS

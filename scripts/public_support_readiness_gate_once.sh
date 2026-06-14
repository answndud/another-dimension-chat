#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing public support readiness text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden public support readiness text in $file: $text" >&2
    exit 1
  fi
}

CORE="$ROOT_DIR/crates/core/src/lib.rs"
ACTION_STATE="$ROOT_DIR/apps/desktop-tauri/src/action-state.js"
PRIVATE_DELIVERY_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"
PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
FINAL_CLAIM_GATE="$ROOT_DIR/reference/FINAL_100_CLAIM_GATE.md"

for file in \
  "$CORE" \
  "$ACTION_STATE" \
  "$PRIVATE_DELIVERY_STATE" \
  "$PREFLIGHT" \
  "$FINAL_CLAIM_GATE" \
  "$ROOT_DIR/scripts/public_support_incident_intake_once.sh" \
  "$ROOT_DIR/scripts/public_support_copy_sweep_once.sh" \
  "$ROOT_DIR/scripts/emergency_notice_manual_verification_once.sh"; do
  [ -f "$file" ] || {
    echo "FAIL missing public support readiness input: $file" >&2
    exit 1
  }
done

incident_output="$("$ROOT_DIR/scripts/public_support_incident_intake_once.sh")"
"$ROOT_DIR/scripts/public_support_copy_sweep_once.sh" >/dev/null
"$ROOT_DIR/scripts/emergency_notice_manual_verification_once.sh" >/dev/null

require_output_text() {
  local output="$1"
  local text="$2"
  if ! printf '%s\n' "$output" | grep -Fq -- "$text"; then
    echo "FAIL missing public support readiness output: $text" >&2
    exit 1
  fi
}

for text in \
  "public_issue_dry_run=redacted-support-triage-only" \
  "dry_run_recovery_next_action=stay-on-manual-envelope" \
  "dry_run_desktop_acceptance_status=not-claimed" \
  "dry_run_high_risk_runtime_evidence_accepted=false" \
  "dry_run_high_risk_runtime_failure_class=runtime-evidence-missing" \
  "dry_run_engine_sidecar_status_failure_class=sidecar-unavailable" \
  "dry_run_engine_sidecar_manual_self_test_failure_class=manual-self-test-not-run" \
  "dry_run_engine_sidecar_redacted_runtime_status=redacted" \
  "public_issue_accepted_usability_evidence=false" \
  "public_issue_accepted_field_evidence=false" \
  "public_issue_accepted_high_risk_evidence=false"; do
  require_output_text "$incident_output" "$text"
done

require_text "$CORE" "production_public_support_incident_operations_summary"
require_text "$CORE" "stable_candidate_blocked_when_support_not_ready"
require_text "$CORE" "public_support_ready"
require_text "$CORE" "production_ready_claim_allowed"
require_text "$ACTION_STATE" "support_redaction_verified="
require_text "$ACTION_STATE" "raw_logs_requested=false"
require_text "$ACTION_STATE" "crash_dumps_requested=false"
require_text "$ACTION_STATE" "screenshots_requested=false"
require_text "$ACTION_STATE" "external_delivery_evidence_claim=false"
require_text "$ACTION_STATE" "security_ready_proof_claim=false"
require_text "$PRIVATE_DELIVERY_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_ALLOWED_FIELDS"
require_text "$PRIVATE_DELIVERY_STATE" "PUBLIC_SUPPORT_DIAGNOSTICS_FORBIDDEN_FIELDS"
require_text "$PRIVATE_DELIVERY_STATE" "support_bundle_export=false"
require_text "$PREFLIGHT" "run_step public-support-readiness"
require_text "$PREFLIGHT" "support_redaction_verified=true"
require_text "$PREFLIGHT" "public_support_incident_operations_ready=true"
require_text "$PREFLIGHT" "stable_candidate_blocked_when_support_not_ready=true"
require_text "$FINAL_CLAIM_GATE" "support_redaction_verified=true"
require_text "$FINAL_CLAIM_GATE" "public_support_incident_operations_ready=true"
require_text "$FINAL_CLAIM_GATE" "stable_candidate_blocked_when_support_not_ready=true"
require_text "$FINAL_CLAIM_GATE" "support_readiness_opens_public_claims=false"

for file in "$CORE" "$ACTION_STATE" "$PRIVATE_DELIVERY_STATE" "$PREFLIGHT" "$FINAL_CLAIM_GATE"; do
  reject_text "$file" "raw_logs_requested=true"
  reject_text "$file" "crash_dumps_requested=true"
  reject_text "$file" "screenshots_requested=true"
  reject_text "$file" "support_bundles_requested=true"
  reject_text "$file" "telemetry_upload_claimed=true"
  reject_text "$file" "external_delivery_evidence_claim=true"
  reject_text "$file" "audit_evidence_claim=true"
  reject_text "$file" "security_ready_proof_claim=true"
  reject_text "$file" "auto_update_notice_claimed=true"
  reject_text "$file" "sensitive_use_claim_allowed=true"
done

printf '%s\n' "status=public-support-readiness-gate-ready"
printf '%s\n' "support_redaction_verified=true"
printf '%s\n' "public_support_incident_operations_ready=true"
printf '%s\n' "stable_candidate_blocked_when_support_not_ready=true"
printf '%s\n' "raw_logs_requested=false"
printf '%s\n' "crash_dumps_requested=false"
printf '%s\n' "screenshots_requested=false"
printf '%s\n' "support_bundles_requested=false"
printf '%s\n' "telemetry_upload_claimed=false"
printf '%s\n' "external_delivery_evidence_claim=false"
printf '%s\n' "audit_evidence_claim=false"
printf '%s\n' "security_ready_proof_claim=false"
printf '%s\n' "auto_update_notice_claimed=false"
printf '%s\n' "production_ready_claim_allowed=false"
printf '%s\n' "sensitive_use_claim_allowed=false"
printf '%s\n' "support_readiness_opens_public_claims=false"

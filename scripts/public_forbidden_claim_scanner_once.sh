#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL public forbidden claim scanner: $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_text() {
  local file="$1"
  local text="$2"
  grep -Fq -- "$text" "$file" || fail "missing required public boundary in $file: $text"
}

reject_fixed() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    fail "forbidden positive claim in $file: $text"
  fi
}

PUBLIC_COPY_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/index.html"
  "$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md"
  "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
)

for file in "${PUBLIC_COPY_FILES[@]}"; do
  require_file "$file"
done

require_file "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md"
require_file "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh"
require_file "$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md"
require_file "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"

FORBIDDEN_POSITIVE_CLAIMS=(
  "production_ready_claim_allowed=true"
  "production-ready secure messenger"
  "audited_claim_allowed=true"
  "audited secure messenger"
  "security_ready_claim=true"
  "security-ready claim=true"
  "sensitive_use_claim_allowed=true"
  "safe for all high-risk users"
  "high_risk_public_claim_allowed=true"
  "high_risk_ready_claim_allowed=true"
  "briar_cwtch_signal_equivalence_claim=true"
  "Briar/Cwtch-equivalent privacy or security level achieved"
  "Signal/Briar/Cwtch equivalent"
  "Signal/Briar/Cwtch superior"
  "metadata-proof"
  "anonymous messenger guarantee"
  "anonymous communication guarantee"
  "compromised_device_safe_claim=true"
  "compromised_endpoint_safe=true"
  "coercion_safe_claim=true"
  "coercion_safe=true"
  "full_global_correlation_safe_claim=true"
  "global_correlation_safe=true"
)

for file in "${PUBLIC_COPY_FILES[@]}"; do
  for claim in "${FORBIDDEN_POSITIVE_CLAIMS[@]}"; do
    reject_fixed "$file" "$claim"
  done
done

require_text "$ROOT_DIR/README.md" "no phone number, no email identity, no global"
require_text "$ROOT_DIR/README.md" "account, a pairwise invite, mandatory safety comparison, encrypted"
require_text "$ROOT_DIR/README.md" "user-mediated message exchange, and local data ownership"
require_text "$ROOT_DIR/README.md" "High-Risk Mode is a defined threat-model target"
require_text "$ROOT_DIR/README.md" "It does not protect compromised endpoints, direct coercion, or full global"
require_text "$ROOT_DIR/SECURITY.md" "accountless 1:1 private"
require_text "$ROOT_DIR/SECURITY.md" "pairwise invites, mandatory safety comparison, encrypted"
require_text "$ROOT_DIR/SECURITY.md" "user-mediated exchange, local data ownership"
require_text "$ROOT_DIR/SECURITY.md" "High-Risk Mode copy may mention its defined threat model"
require_text "$ROOT_DIR/SECURITY.md" "| Compromised endpoint | not_protected |"
require_text "$ROOT_DIR/SECURITY.md" "| Direct coercion | not_protected |"
require_text "$ROOT_DIR/SECURITY.md" "| Global traffic correlation | not_protected |"
require_text "$ROOT_DIR/apps/desktop-tauri/index.html" "not_protected=compromised_endpoint,direct_coercion,global_traffic_correlation"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "not_protected=compromised_endpoint,direct_coercion,global_traffic_correlation"
require_text "$ROOT_DIR/apps/desktop-tauri/src/i18n.js" "global_correlation_safe=false"
require_text "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md" "high_risk_public_claim_allowed=false"
require_text "$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md" "high_risk_ready_claim_allowed=false"
require_text "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh" "high_risk_public_claim_allowed=false"
require_text "$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh" "high_risk_ready_claim_allowed=false"
require_text "$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md" "clean_machine_result_accepted=false"
require_text "$ROOT_DIR/reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md" "local_fixture_promoted_to_clean_install_pass=false"
require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "clean_macos_fresh_install_result=hold"
require_text "$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md" "no clean-machine pass claim"

set +e
final_acceptance_output="$("$ROOT_DIR/scripts/final_acceptance_once.sh" 2>&1)"
final_acceptance_status=$?
set -e

[ "$final_acceptance_status" -ne 0 ] || fail "final acceptance unexpectedly opens public release claim"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "stable_candidate_ready=false" ||
  fail "final acceptance missing stable candidate hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "ordinary_use_public_copy_scope=no-phone#no-email#no-global-account#pairwise-invite#mandatory-safety-comparison#user-mediated-encrypted-exchange#local-data-ownership" ||
  fail "final acceptance missing ordinary-use public copy scope"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "defined_high_risk_mode_copy_scope=defined-threat-model#onion-only-explicit-action#local-at-rest-hardening#redacted-support#not-protected-boundary" ||
  fail "final acceptance missing defined High-Risk copy scope"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_not_protected_boundary=compromised-endpoint#direct-coercion#global-traffic-correlation" ||
  fail "final acceptance missing High-Risk not_protected boundary"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "forbidden_positive_public_claims_found=false" ||
  fail "final acceptance missing forbidden positive claim scanner result"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_mode_ready=false" ||
  fail "final acceptance missing high-risk readiness hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_validator_ready=true" ||
  fail "final acceptance missing High-Risk runtime evidence validator ready status"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_claim_separated=true" ||
  fail "final acceptance missing runtime evidence claim separation"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_runtime_evidence_accepted=false" ||
  fail "final acceptance missing runtime evidence accepted hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_public_claim_allowed=false" ||
  fail "final acceptance missing high-risk public claim hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "high_risk_ready_claim_allowed=false" ||
  fail "final acceptance missing high-risk ready claim hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "briar_cwtch_signal_equivalence_claim=false" ||
  fail "final acceptance missing Signal/Briar/Cwtch equivalence hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "compromised_device_safe_claim=false" ||
  fail "final acceptance missing compromised-device-safe hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "coercion_safe_claim=false" ||
  fail "final acceptance missing coercion-safe hold"
printf '%s\n' "$final_acceptance_output" | grep -Fq -- "full_global_correlation_safe_claim=false" ||
  fail "final acceptance missing global-correlation-safe hold"

cat <<'EOF'
public_forbidden_claim_scanner=ready
public_claim_files_scanned=10
forbidden_positive_claims_found=false
allowed_public_claim_boundary_present=true
high_risk_not_protected_boundary_present=true
stable_candidate_claim_allowed=false
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
high_risk_runtime_evidence_validator_ready=true
high_risk_runtime_evidence_claim_separated=true
EOF

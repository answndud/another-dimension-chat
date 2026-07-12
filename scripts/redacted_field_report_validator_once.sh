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
    fail "$file contains forbidden text: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VALIDATOR="scripts/validate_redacted_field_reports.mjs"
PACKET="reference/REDACTED_FIELD_REPORT_PACKET.md"

[ -f "$VALIDATOR" ] || fail "missing validator: $VALIDATOR"
[ -f "$PACKET" ] || fail "missing packet: $PACKET"

must_contain "$VALIDATOR" "status=waiting-for-redacted-field-reports"
must_contain "$VALIDATOR" "status=redacted-field-evidence-candidate-requires-review"
must_contain "$VALIDATOR" "production_field_evidence_ready=false"
must_contain "$VALIDATOR" "manual-review-and-stable-gate-update-required"
must_contain "$VALIDATOR" "REQUIRED_PLATFORM_PAIRS"
must_contain "$VALIDATOR" "status=waiting-for-required-platform-pair-coverage"
must_contain "$VALIDATOR" "high_risk_readiness_condition_set"
must_contain "$VALIDATOR" "field_report_high_risk_condition_coverage"
must_contain "$VALIDATOR" "field_report_high_risk_missing_conditions"
must_contain "$VALIDATOR" "real_external_two_machine_field_evidence_present"
must_contain "$VALIDATOR" "high_risk_ready_claim_allowed=false"
must_contain "$VALIDATOR" "forbidden-content"
must_contain "$VALIDATOR" "non-claims-mismatch"

must_contain "$PACKET" "redacted_field_report_validator_available=true"
must_contain "$PACKET" "f100_1_field_evidence_blocker_closed=true"
must_contain "$PACKET" "field_evidence_policy_waiver_authorized=true"
must_contain "$PACKET" "real_external_two_machine_field_evidence_required_for_claims=true"
must_contain "$PACKET" "required_platform_pair_coverage_required_for_claims=true"
must_contain "$PACKET" "accepted_redacted_field_reports_required_for_claims=true"
must_contain "$PACKET" "field_evidence_execution_claim_allowed=false"
must_contain "$PACKET" "high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity"
must_contain "$PACKET" "field_report_high_risk_condition_coverage=none"
must_contain "$PACKET" "field_report_high_risk_missing_conditions=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity"
must_contain "$PACKET" "real_external_two_machine_field_evidence_present=false"
must_contain "$PACKET" "high_risk_ready_claim_allowed=false"
must_contain "$PACKET" "clean_install_checksum_status=pass|fail|partial|not-run"
must_contain "$PACKET" "manual_envelope_round_trip_status=pass|fail|partial|not-run"
must_contain "$PACKET" "failed_delivery_recovery_status=pass|fail|partial|not-run"
must_contain "$PACKET" "node scripts/validate_redacted_field_reports.mjs"
must_contain "$PACKET" "platform_pair=macos-to-macos|macos-to-windows|windows-to-windows|android-to-ios"
must_contain "$PACKET" "high_risk_readiness_condition_coverage=safety-verification#high-risk-transport-runtime"
must_not_match "$PACKET" "production_field_evidence_ready=true"
must_not_match "$PACKET" "field_evidence_execution_claim_allowed=true"
must_not_match "$PACKET" "external_delivery_success_claim_allowed=true"
must_not_match "$PACKET" "reliable_external_delivery_claim_allowed=true"

empty_output="$(node "$VALIDATOR" "$ROOT/docs/redacted-field-reports")"
printf '%s\n' "$empty_output" | grep -Fq "reports_found=0" || fail "empty validator run did not report zero reports"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-redacted-field-reports" || fail "empty validator run did not wait for reports"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

write_report() {
  local file="$1"
  local platform_pair="$2"
  local scope="$3"
  local network="$4"
  cat >"$file" <<REPORT
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
high_risk_readiness_condition_coverage=safety-verification#high-risk-transport-runtime
platform_pair=$platform_pair
checksum_result=pass
install_path_reached=first-launch
flow_scope=$scope
network_condition_class=$network
run_count=1
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_verify_status=pass
manual_envelope_round_trip_status=pass
retry_cancel_recovery_status=pass
restart_resume_status=pass
offline_online_transition_status=pass
failed_delivery_recovery_status=pass
delete_wipe_lifecycle_status=pass
public_diagnostics_copy_status=pass
required_flow_status=pass
failure_class=unknown-redacted
recovery_next_action=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT
}

write_report "$tmp_dir/peer-a.md" "macos-to-macos" "two-machine-same-network" "same-lan"
write_report "$tmp_dir/peer-b.md" "macos-to-windows" "two-machine-different-network" "different-networks"
write_report "$tmp_dir/peer-c.md" "windows-to-windows" "two-machine-same-network" "same-lan"
write_report "$tmp_dir/peer-d.md" "android-to-ios" "two-machine-different-network" "different-networks"

candidate_output="$(node "$VALIDATOR" "$tmp_dir")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_production_field_reports=4" || fail "candidate validator did not accept four reports"
printf '%s\n' "$candidate_output" | grep -Fq "field_report_high_risk_condition_coverage=safety-verification#high-risk-transport-runtime" ||
  fail "candidate validator did not report High-Risk field report condition coverage"
printf '%s\n' "$candidate_output" | grep -Fq "field_report_high_risk_missing_conditions=emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity" ||
  fail "candidate validator did not preserve High-Risk missing conditions"
printf '%s\n' "$candidate_output" | grep -Fq "real_external_two_machine_field_evidence_present=true" ||
  fail "candidate validator did not report real external field evidence presence"
printf '%s\n' "$candidate_output" | grep -Fq "high_risk_ready_claim_allowed=false" ||
  fail "candidate validator must not open High-Risk ready claim"
printf '%s\n' "$candidate_output" | grep -Fq "required_platform_pairs_covered=true" || fail "candidate validator did not detect required platform pair coverage"
printf '%s\n' "$candidate_output" | grep -Fq "different_networks_covered=true" || fail "candidate validator did not detect different network coverage"
printf '%s\n' "$candidate_output" | grep -Fq "production_field_evidence_ready=false" || fail "validator must not auto-open production evidence"
printf '%s\n' "$candidate_output" | grep -Fq "status=redacted-field-evidence-candidate-requires-review" || fail "candidate validator did not require manual review"

cat >"$tmp_dir/peer-secret.md" <<'REPORT'
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
high_risk_readiness_condition_coverage=safety-verification#high-risk-transport-runtime
platform_pair=macos-to-macos
checksum_result=pass
install_path_reached=first-launch
flow_scope=two-machine-different-network
network_condition_class=different-networks
run_count=1
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_verify_status=pass
manual_envelope_round_trip_status=pass
retry_cancel_recovery_status=pass
restart_resume_status=pass
offline_online_transition_status=pass
failed_delivery_recovery_status=pass
delete_wipe_lifecycle_status=pass
public_diagnostics_copy_status=pass
required_flow_status=pass
failure_class=unknown-redacted
recovery_next_action=contains-secret
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
ADENVSECRET
REPORT

invalid_output="$tmp_dir/invalid.out"
if node "$VALIDATOR" "$tmp_dir/peer-secret.md" >"$invalid_output" 2>&1; then
  fail "validator accepted forbidden payload marker"
fi
grep -Fq "forbidden-content:envelope-payload" "$invalid_output" || fail "validator did not report forbidden envelope payload"

cat <<'STATUS'
status=redacted-field-report-validator-ready
redacted_field_report_validator_available=true
f100_1_field_evidence_blocker_closed=true
field_evidence_policy_waiver_authorized=true
field_evidence_execution_claim_allowed=false
high_risk_readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
field_report_high_risk_condition_coverage=none
field_report_high_risk_missing_conditions=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
real_external_two_machine_field_evidence_present=false
high_risk_ready_claim_allowed=false
reports_found=0
accepted_production_field_reports=0
required_platform_pairs_covered=false
production_field_evidence_ready=false
next_required_input=real-external-multi-platform-redacted-reports
STATUS

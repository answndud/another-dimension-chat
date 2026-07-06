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
must_contain "$VALIDATOR" "forbidden-content"
must_contain "$VALIDATOR" "non-claims-mismatch"

must_contain "$PACKET" "redacted_field_report_validator_available=true"
must_contain "$PACKET" "clean_install_checksum_status=pass|fail|partial|not-run"
must_contain "$PACKET" "manual_envelope_round_trip_status=pass|fail|partial|not-run"
must_contain "$PACKET" "failed_delivery_recovery_status=pass|fail|partial|not-run"
must_contain "$PACKET" "node scripts/validate_redacted_field_reports.mjs"
must_not_match "$PACKET" "production_field_evidence_ready=true"
must_not_match "$PACKET" "external_delivery_success_claim_allowed=true"
must_not_match "$PACKET" "reliable_external_delivery_claim_allowed=true"

empty_output="$(node "$VALIDATOR" "$ROOT/docs/redacted-field-reports")"
printf '%s\n' "$empty_output" | grep -Fq "reports_found=0" || fail "empty validator run did not report zero reports"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-redacted-field-reports" || fail "empty validator run did not wait for reports"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

write_report() {
  local file="$1"
  local scope="$2"
  local network="$3"
  cat >"$file" <<REPORT
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
platform_pair=macos-to-macos
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

write_report "$tmp_dir/peer-a.md" "two-machine-same-network" "same-lan"
write_report "$tmp_dir/peer-b.md" "two-machine-different-network" "different-networks"

candidate_output="$(node "$VALIDATOR" "$tmp_dir")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_production_field_reports=2" || fail "candidate validator did not accept two reports"
printf '%s\n' "$candidate_output" | grep -Fq "different_networks_covered=true" || fail "candidate validator did not detect different network coverage"
printf '%s\n' "$candidate_output" | grep -Fq "production_field_evidence_ready=false" || fail "validator must not auto-open production evidence"
printf '%s\n' "$candidate_output" | grep -Fq "status=redacted-field-evidence-candidate-requires-review" || fail "candidate validator did not require manual review"

cat >"$tmp_dir/peer-c.md" <<'REPORT'
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
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
if node "$VALIDATOR" "$tmp_dir/peer-c.md" >"$invalid_output" 2>&1; then
  fail "validator accepted forbidden payload marker"
fi
grep -Fq "forbidden-content:envelope-payload" "$invalid_output" || fail "validator did not report forbidden envelope payload"

cat <<'STATUS'
status=redacted-field-report-validator-ready
redacted_field_report_validator_available=true
reports_found=0
accepted_production_field_reports=0
production_field_evidence_ready=false
next_required_input=real-external-macos-two-machine-redacted-reports
STATUS

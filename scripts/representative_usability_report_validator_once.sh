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
    fail "$file contains forbidden representative usability pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VALIDATOR="scripts/validate_representative_usability_reports.mjs"
PACKET="reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md"

[ -f "$VALIDATOR" ] || fail "missing validator: $VALIDATOR"
[ -f "$PACKET" ] || fail "missing packet: $PACKET"

must_contain "$PACKET" "representative_usability_report_packet_available=true"
must_contain "$PACKET" "m100_6_usability_blocker_closed=true"
must_contain "$PACKET" "representative_usability_policy_waiver_authorized=true"
must_contain "$PACKET" "representative_usability_waiver_scope=active-queue-unblock-only"
must_contain "$PACKET" "representative_usability_evidence_required_for_stable_claims=true"
must_contain "$PACKET" "representative_usability_report_validator_available=true"
must_contain "$PACKET" "consent_non_sensitive_use_notice_ready=true"
must_contain "$PACKET" "representative_usability_sample_threshold=3-5"
must_contain "$PACKET" "representative_usability_candidate_requires_manual_review=true"
must_contain "$PACKET" "usability_study_completed=false"
must_contain "$PACKET" "representative_usability_evidence_completed=false"
must_contain "$PACKET" "sensitive communication prohibited"
must_contain "$PACKET" "not audited"
must_contain "$PACKET" "not production-ready"
must_contain "$PACKET" "only disposable test data may be used"

must_contain "$VALIDATOR" "status=waiting-for-representative-usability-reports"
must_contain "$VALIDATOR" "status=representative-usability-evidence-candidate-requires-review"
must_contain "$VALIDATOR" "representative_usability_sample_threshold_met"
must_contain "$VALIDATOR" "usability_study_completed=false"
must_contain "$VALIDATOR" "representative_usability_evidence_completed=false"
must_contain "$VALIDATOR" "manual-review-and-stable-gate-update-required"
must_contain "$VALIDATOR" "forbidden-content"
must_contain "$VALIDATOR" "non-claims-mismatch"

must_not_match "$PACKET" "usability_study_completed=true"
must_not_match "$PACKET" "representative_usability_evidence_completed=true"
must_not_match "$PACKET" "production_wording_ready=true"
must_not_match "$PACKET" "sensitive_communication_allowed=true"

empty_output="$(node "$VALIDATOR" "$ROOT/docs/representative-usability-reports")"
printf '%s\n' "$empty_output" | grep -Fq "reports_found=0" || fail "empty validator run did not report zero reports"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-representative-usability-reports" || fail "empty validator did not wait for reports"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

write_report() {
  local file="$1"
  local participant="$2"
  cat >"$file" <<REPORT
participant_label=$participant
representative_user_type=non-developer
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
platform=macos
session_scope=first-run-invite-manual-envelope-recovery-diagnostics-delete
consent_notice_acknowledged=true
non_sensitive_use_confirmed=true
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_join_status=pass
safety_verification_status=pass
manual_envelope_exchange_status=pass
retry_cancel_recovery_status=pass
local_delete_wipe_status=pass
public_diagnostics_copy_status=pass
recovery_next_action_understood=pass
required_task_status=pass
blocker_class=none-redacted
redacted_blocker_summary=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT
}

write_report "$tmp_dir/r01.md" "R01"
write_report "$tmp_dir/r02.md" "R02"
write_report "$tmp_dir/r03.md" "R03"

candidate_output="$(node "$VALIDATOR" "$tmp_dir")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_representative_usability_reports=3" || fail "candidate validator did not accept three reports"
printf '%s\n' "$candidate_output" | grep -Fq "representative_usability_sample_threshold_met=true" || fail "candidate validator did not detect threshold"
printf '%s\n' "$candidate_output" | grep -Fq "usability_study_completed=false" || fail "validator must not auto-complete usability study"
printf '%s\n' "$candidate_output" | grep -Fq "status=representative-usability-evidence-candidate-requires-review" || fail "candidate validator did not require review"

cat >"$tmp_dir/invalid.md" <<'REPORT'
participant_label=R04
representative_user_type=non-developer
app_version=0.1.0
build_channel=beta-onion
build_commit=test-redacted
platform=macos
session_scope=first-run-invite-manual-envelope-recovery-diagnostics-delete
consent_notice_acknowledged=true
non_sensitive_use_confirmed=true
clean_install_checksum_status=pass
first_launch_warning_status=pass
profile_create_unlock_status=pass
invite_join_status=pass
safety_verification_status=pass
manual_envelope_exchange_status=pass
retry_cancel_recovery_status=pass
local_delete_wipe_status=pass
public_diagnostics_copy_status=pass
recovery_next_action_understood=pass
required_task_status=pass
blocker_class=none-redacted
redacted_blocker_summary=contact tester@example.com
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT

invalid_output="$tmp_dir/invalid.out"
if node "$VALIDATOR" "$tmp_dir/invalid.md" >"$invalid_output" 2>&1; then
  fail "validator accepted forbidden email address"
fi
grep -Fq "forbidden-content:email-address" "$invalid_output" || fail "validator did not report forbidden email address"

cat <<'STATUS'
status=representative-usability-report-validator-ready
representative_usability_report_packet_available=true
m100_6_usability_blocker_closed=true
representative_usability_policy_waiver_authorized=true
representative_usability_waiver_scope=active-queue-unblock-only
representative_usability_evidence_required_for_stable_claims=true
representative_usability_report_validator_available=true
consent_non_sensitive_use_notice_ready=true
representative_usability_sample_threshold=3-5
accepted_representative_usability_reports=0
usability_study_completed=false
representative_usability_evidence_completed=false
next_required_phase=Phase-M100-8-macOS-Stable-Release-Gate-And-Public-Copy-Upgrade
STATUS

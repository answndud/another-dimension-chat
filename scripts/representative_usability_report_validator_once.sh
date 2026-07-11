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
must_contain "$PACKET" "representative_usability_dedup_token_required=true"
must_contain "$PACKET" "representative_usability_artifact_binding_required=true"
must_contain "$PACKET" "representative_usability_redacted_support_report_required=true"
must_contain "$PACKET" "consent_non_sensitive_use_notice_ready=true"
must_contain "$PACKET" "representative_usability_sample_threshold=3-5"
must_contain "$PACKET" "representative_usability_candidate_requires_manual_review=true"
must_contain "$PACKET" "representative_usability_intake_decision_values=waiting#rejected#candidate_requires_review"
must_contain "$PACKET" "missing_evidence_is_next_owner_action=true"
must_contain "$PACKET" "usability_study_completed=false"
must_contain "$PACKET" "representative_usability_evidence_completed=false"
must_contain "$PACKET" "sensitive communication prohibited"
must_contain "$PACKET" "not audited"
must_contain "$PACKET" "not production-ready"
must_contain "$PACKET" "only disposable test data may be used"

must_contain "$VALIDATOR" "status=waiting-for-representative-usability-reports"
must_contain "$VALIDATOR" "status=representative-usability-evidence-candidate-requires-review"
must_contain "$VALIDATOR" "representative_usability_sample_threshold_met"
must_contain "$VALIDATOR" "representative_usability_unique_dedup_tokens"
must_contain "$VALIDATOR" "invalid-build-commit"
must_contain "$VALIDATOR" "redacted_support_report_copy_status"
must_contain "$VALIDATOR" "usability_study_completed=false"
must_contain "$VALIDATOR" "representative_usability_evidence_completed=false"
must_contain "$VALIDATOR" "manual-review-and-stable-gate-update-required"
must_contain "$VALIDATOR" "evidence_intake_decision"
must_contain "$VALIDATOR" "next_owner_action"
must_contain "$VALIDATOR" "missing_evidence_is_next_owner_action=true"
must_contain "$VALIDATOR" "forbidden-content"
must_contain "$VALIDATOR" "non-claims-mismatch"

must_not_match "$PACKET" "usability_study_completed=true"
must_not_match "$PACKET" "representative_usability_evidence_completed=true"
must_not_match "$PACKET" "production_wording_ready=true"
must_not_match "$PACKET" "sensitive_communication_allowed=true"

empty_output="$(node "$VALIDATOR" "$ROOT/docs/representative-usability-reports")"
printf '%s\n' "$empty_output" | grep -Fq "reports_found=0" || fail "empty validator run did not report zero reports"
printf '%s\n' "$empty_output" | grep -Fq "evidence_intake_decision=waiting" || fail "empty validator did not mark waiting decision"
printf '%s\n' "$empty_output" | grep -Fq "next_owner_action=collect-real-redacted-representative-usability-reports" ||
  fail "empty validator did not report next owner action"
printf '%s\n' "$empty_output" | grep -Fq "missing_evidence_is_next_owner_action=true" ||
  fail "empty validator did not keep missing evidence as owner action"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-representative-usability-reports" || fail "empty validator did not wait for reports"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

write_report() {
  local file="$1"
  local participant="$2"
  local dedup_token="$3"
  cat >"$file" <<REPORT
participant_label=$participant
participant_dedup_token=$dedup_token
representative_user_type=non-developer
app_version=0.1.0
build_channel=beta-onion
build_commit=abcdef1234567890
artifact_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
distribution_manifest_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
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
redacted_support_report_copy_status=pass
support_report_raw_logs_allowed=false
support_report_private_payload_allowed=false
support_report_key_material_allowed=false
recovery_next_action_understood=pass
required_task_status=pass
blocker_class=none-redacted
redacted_blocker_summary=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT
}

write_report "$tmp_dir/r01.md" "R01" "dedup_11111111111111111111111111111111"
write_report "$tmp_dir/r02.md" "R02" "dedup_22222222222222222222222222222222"
write_report "$tmp_dir/r03.md" "R03" "dedup_33333333333333333333333333333333"

candidate_output="$(node "$VALIDATOR" "$tmp_dir")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_representative_usability_reports=3" || fail "candidate validator did not accept three reports"
printf '%s\n' "$candidate_output" | grep -Fq "representative_usability_sample_threshold_met=true" || fail "candidate validator did not detect threshold"
printf '%s\n' "$candidate_output" | grep -Fq "representative_usability_unique_dedup_tokens=true" || fail "candidate validator did not verify dedup tokens"
printf '%s\n' "$candidate_output" | grep -Fq "usability_study_completed=false" || fail "validator must not auto-complete usability study"
printf '%s\n' "$candidate_output" | grep -Fq "evidence_intake_decision=candidate_requires_review" ||
  fail "candidate validator did not mark candidate decision"
printf '%s\n' "$candidate_output" | grep -Fq "next_owner_action=manual-review-and-stable-gate-update-required" ||
  fail "candidate validator did not preserve review next action"
printf '%s\n' "$candidate_output" | grep -Fq "status=representative-usability-evidence-candidate-requires-review" || fail "candidate validator did not require review"

cat >"$tmp_dir/invalid.md" <<'REPORT'
participant_label=R04
participant_dedup_token=dedup_44444444444444444444444444444444
representative_user_type=non-developer
app_version=0.1.0
build_channel=beta-onion
build_commit=abcdef1234567890
artifact_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
distribution_manifest_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
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
redacted_support_report_copy_status=pass
support_report_raw_logs_allowed=false
support_report_private_payload_allowed=false
support_report_key_material_allowed=false
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
grep -Fq "evidence_intake_decision=rejected" "$invalid_output" || fail "validator did not mark invalid report rejected"
grep -Fq "next_owner_action=fix-redaction-or-required-fields" "$invalid_output" ||
  fail "validator did not report invalid next owner action"

cp "$tmp_dir/r01.md" "$tmp_dir/invalid-build.md"
perl -0pi -e 's/build_commit=abcdef1234567890/build_commit=test-redacted/' "$tmp_dir/invalid-build.md"
if node "$VALIDATOR" "$tmp_dir/invalid-build.md" >"$tmp_dir/invalid-build.out" 2>&1; then
  fail "validator accepted non-SHA build commit"
fi
grep -Fq "invalid-build-commit" "$tmp_dir/invalid-build.out" ||
  fail "validator did not report invalid build commit"

cp "$tmp_dir/r02.md" "$tmp_dir/duplicate-dedup.md"
perl -0pi -e 's/participant_label=R02/participant_label=R04/; s/dedup_22222222222222222222222222222222/dedup_11111111111111111111111111111111/' \
  "$tmp_dir/duplicate-dedup.md"
if node "$VALIDATOR" "$tmp_dir/r01.md" "$tmp_dir/r03.md" "$tmp_dir/duplicate-dedup.md" >"$tmp_dir/duplicate-dedup.out" 2>&1; then
  if grep -Fq "status=representative-usability-evidence-candidate-requires-review" "$tmp_dir/duplicate-dedup.out"; then
    fail "validator accepted duplicate participant dedup token"
  fi
fi
grep -Fq "representative_usability_unique_dedup_tokens=false" "$tmp_dir/duplicate-dedup.out" ||
  fail "validator did not report duplicate dedup token"

cat <<'STATUS'
status=representative-usability-report-validator-ready
representative_usability_report_packet_available=true
m100_6_usability_blocker_closed=true
representative_usability_policy_waiver_authorized=true
representative_usability_waiver_scope=active-queue-unblock-only
representative_usability_evidence_required_for_stable_claims=true
representative_usability_report_validator_available=true
representative_usability_dedup_token_required=true
representative_usability_artifact_binding_required=true
representative_usability_redacted_support_report_required=true
consent_non_sensitive_use_notice_ready=true
representative_usability_sample_threshold=3-5
accepted_representative_usability_reports=0
usability_study_completed=false
representative_usability_evidence_completed=false
next_required_phase=Phase-O100-1-Operations-Incident-And-Vulnerability-Readiness
STATUS

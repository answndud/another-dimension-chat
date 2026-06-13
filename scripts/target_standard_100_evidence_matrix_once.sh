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
    fail "$file contains forbidden target-standard 100 pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
TARGET="docs/product/TARGET_STANDARD.md"

for file in "$MATRIX" "$TARGET" "README.md" "SECURITY.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md" \
  "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md" \
  "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md" \
  "scripts/collect_macos_release_credential_evidence.sh" \
  "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md" \
  "reference/PRODUCTION_E2EE_SOURCE_GATE.md" \
  "reference/PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md" \
  "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "reference/EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "reference/EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" \
  "reference/REPRESENTATIVE_USABILITY_REPORT_PACKET.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "reference/STABLE_RELEASE_HOLD_REPORT.md" \
  "reference/EXTERNAL_REVIEW_AUDIT_READINESS.md" \
  "reference/AUDIT_FINDING_TRACKER.md" \
  "reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "reference/REDACTED_FIELD_REPORT_PACKET.md" \
  "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md" \
  "reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "reference/MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md"; do
  [ -f "$file" ] || fail "missing required target-standard 100 input: $file"
done

for file in "$MATRIX" "README.md" "SECURITY.md"; do
  must_contain "$file" "unsigned experimental public beta"
  must_contain "$file" "sensitive communication prohibited"
  must_contain "$file" "not audited"
  must_contain "$file" "not production-ready"
done

must_contain "README.md" "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
must_contain "SECURITY.md" "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
must_contain "README.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
must_contain "README.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "SECURITY.md" "reference/DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md"
must_contain "README.md" "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"
must_contain "SECURITY.md" "reference/MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md"

must_contain "$MATRIX" "Status: P100-0 definition locked"
must_contain "$MATRIX" "## Evidence Order"
must_contain "$MATRIX" "## macOS Public App Experience 100%"
must_contain "$MATRIX" "## TARGET_STANDARD 100%"
must_contain "$MATRIX" "## Gate Connection Matrix"
must_contain "$MATRIX" "## Forbidden Claim Matrix"
must_contain "$MATRIX" "## Current False And Hold Flags"

for criterion in \
  "GitHub Release or official distribution page download" \
  "Checksum and provenance verification" \
  "Developer ID signing" \
  "Notarization and stapling" \
  "Gatekeeper no-exception open" \
  "Supported architecture and macOS scope" \
  "First run and profile unlock" \
  "Invite and safety verification" \
  "Manual encrypted envelope exchange" \
  "Retry and cancel" \
  "Local deletion and wipe" \
  "Redacted support report" \
  "Representative usability evidence" \
  "Update and rollback-safe release channel" \
  "Incident, vulnerability, and support operation" \
  "Stable macOS release decision"; do
  must_contain "$MATRIX" "$criterion"
done

for criterion in \
  "Briar/Cwtch-inspired practical private messenger" \
  "No phone number" \
  "No email" \
  "No global account" \
  "No searchable username or public directory" \
  "No central contact discovery" \
  "No central message server dependency" \
  "No required push notification" \
  "No cloud backup" \
  "Pairwise identity and invite/QR default" \
  "Message-content E2EE" \
  "Passphrase-first encrypted local storage" \
  "Redacted public diagnostics and support" \
  "Security trust base is not platform signing/store authority" \
  "Default practical transport understandable to normal users" \
  "High-risk onion/Tor path separated" \
  "No automatic network start" \
  "User-authorized network actions only" \
  "No external onion delivery claim before evidence" \
  "macOS public app" \
  "Windows desktop public app" \
  "Android thin shell" \
  "iOS thin shell" \
  "Shared Rust core owns security-sensitive behavior" \
  "Platform wrappers stay thin" \
  "External review/audit" \
  "External field evidence" \
  "Release/update integrity" \
  "Public wording never exceeds evidence"; do
  must_contain "$MATRIX" "$criterion"
done

for linked in \
  "PRODUCTION_READINESS_CLAIM_GATE.md" \
  "PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md" \
  "DEPLOYMENT_READINESS_GAP_REGISTER.md" \
  "DEPLOYMENT_100_BLOCKER_RESOLUTION_PLAN.md" \
  "MACOS_RELEASE_CREDENTIAL_EVIDENCE_SCHEMA.md" \
  "PRODUCTION_E2EE_SOURCE_GATE.md" \
  "MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" \
  "EXTERNAL_EVIDENCE_INTAKE_EXECUTION.md" \
  "EXTERNAL_REVIEW_INTAKE_RUNBOOK.md" \
  "REPRESENTATIVE_USABILITY_REPORT_PACKET.md" \
  "PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md" \
  "PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md" \
  "PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md" \
  "PRODUCTION_KEY_STORAGE_LIFECYCLE.md" \
  "PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md" \
  "STABLE_MACOS_V1_RELEASE_GATE.md" \
  "STABLE_RELEASE_HOLD_REPORT.md" \
  "EXTERNAL_REVIEW_AUDIT_READINESS.md" \
  "AUDIT_FINDING_TRACKER.md" \
  "INDEPENDENT_REVIEW_PACKET.md" \
  "FIELD_EVIDENCE_RELIABILITY_PROGRAM.md" \
  "FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md" \
  "REDACTED_FIELD_REPORT_PACKET.md" \
  "CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md" \
  "WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md" \
  "WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md" \
  "ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md" \
  "MACOS_PRODUCTION_DISTRIBUTION_GATE.md" \
  "MACOS_PRODUCTION_UX_ONBOARDING.md" \
  "MACOS_USABILITY_RECOVERY_CLOSURE.md" \
  "OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md" \
  "UPDATE_INTEGRITY.md"; do
  must_contain "$MATRIX" "$linked"
done

for flag in \
  "evidence_matrix_machine_checkable=true" \
  "target_standard_100_evidence_matrix_available=true" \
  "target_standard_100_active_queue_source_closure_available=true" \
  "deployment_100_blocker_resolution_plan_available=true" \
  "m100_1_credential_blocker_closed=true" \
  "release_credential_policy_waiver_authorized=true" \
  "signed_notarized_release_requires_actual_credentials=true" \
  "m100_3_artifact_blocker_closed=true" \
  "signed_notarized_rc_policy_waiver_authorized=true" \
  "signed_notarized_artifact_required_for_distribution_claims=true" \
  "m100_6_usability_blocker_closed=true" \
  "representative_usability_policy_waiver_authorized=true" \
  "representative_usability_evidence_required_for_stable_claims=true" \
  "m100_7_update_blocker_closed=true" \
  "update_channel_policy_waiver_authorized=true" \
  "signed_update_or_rollback_evidence_required_for_stable_claims=true" \
  "m100_8_stable_release_blocker_closed=true" \
  "stable_release_policy_waiver_authorized=true" \
  "stable_release_evidence_required_for_public_copy_upgrade=true" \
  "public_copy_upgrade_authorized=false" \
  "public_copy_upgrade_performed=false" \
  "c100_1_e2ee_blocker_closed=true" \
  "production_e2ee_policy_waiver_authorized=true" \
  "production_e2ee_external_review_required_for_claims=true" \
  "production_e2ee_field_evidence_required_for_claims=true" \
  "macos_release_credential_evidence_schema_available=true" \
  "macos_release_credential_evidence_validator_available=true" \
  "macos_release_credential_evidence_collector_available=true" \
  "macos_release_credential_evidence_collector_source_ready=true" \
  "macos_release_credential_evidence_intake_ready=true" \
  "macos_release_credential_evidence_current_head_bound=true" \
  "macos_release_credential_evidence_private_docs_path_bound=true" \
  "target_standard_100_deployment_gap_reconciled=true" \
  "target_standard_criteria_complete=true" \
  "macos_public_app_100_criteria_complete=true" \
  "pairwise_identity_safety_product_closure_reviewed=true" \
  "macos_update_rollback_safe_release_channel_reviewed=true" \
  "macos_current_scope_supported=true" \
  "macos_universal_intel_scope_still_hold=true" \
  "onboarding_recovery_source_ready=true" \
  "supported_default_transport_ready=true" \
  "supported_local_key_lifecycle_ready=true" \
  "supported_local_deletion_scope_ready=true" \
  "production_key_management_source_gate_reviewed=true" \
  "production_key_management_source_ready=true" \
  "d100_2_key_management_source_gate_reviewed=true" \
  "key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only" \
  "production_e2ee_source_gate_reviewed=true" \
  "production_e2ee_source_ready=true" \
  "d100_1_e2ee_source_gate_reviewed=true" \
  "protocol_session_e2ee_source_ready=true" \
  "protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete" \
  "manual_update_integrity_policy_available=true" \
  "macos_signed_update_manifest_schema_available=true" \
  "macos_signed_update_manifest_validator_available=true" \
  "signed_update_manifest_candidate_verifier_ready=true" \
  "d100_3_signed_notarized_execution_path_reviewed=true" \
  "macos_signed_notarized_execution_path_available=true" \
  "signed_notarized_rc_execution_ready=false" \
  "d100_4_external_evidence_intake_execution_reviewed=true" \
  "external_evidence_intake_operator_ready=true" \
  "external_review_intake_runbook_available=true" \
  "external_review_intake_operator_ready=true" \
  "reviewer_packet_freeze_ready=true" \
  "audit_finding_tracker_ready=true" \
  "audit_finding_tracker_schema_machine_checkable=true" \
  "audit_finding_counts_machine_checked=true" \
  "field_report_validator_ready=true" \
  "usability_report_validator_ready=true" \
  "consent_non_sensitive_use_notice_ready=true" \
  "representative_usability_report_packet_available=true" \
  "representative_usability_report_validator_available=true" \
  "representative_usability_sample_threshold=3-5" \
  "field_report_sample_threshold=multiple-real-two-machine-plus-different-network" \
  "fabricated_or_local_only_evidence_rejected=true" \
  "d100_5_windows_public_artifact_execution_path_reviewed=true" \
  "windows_public_artifact_execution_path_available=true" \
  "windows_real_runtime_result_schema_available=true" \
  "windows_real_runtime_result_validator_available=true" \
  "real_windows_runtime_smoke_requirements_defined=true" \
  "windows_installer_signing_decision_recorded=true" \
  "windows_checksum_provenance_requirements_defined=true" \
  "windows_public_copy_requirements_defined=true" \
  "windows_support_diagnostics_requirements_defined=true" \
  "windows_no_overclaim_gate_ready=true" \
  "production_claim_gate_linked=true" \
  "audit_review_gate_linked=true" \
  "field_evidence_gate_linked=true" \
  "platform_support_matrix_linked=true" \
  "current_public_claim_level=unsigned-experimental-public-beta-only" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "beta_wording_removal_allowed=false" \
  "audited_claim_allowed=false" \
  "secure_messenger_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "reliable_external_delivery_claim_allowed=false" \
  "repeated_external_onion_evidence_claim_allowed=false" \
  "briar_cwtch_equivalent_claim_allowed=false" \
  "censorship_resistant_claim_allowed=false" \
  "stable_release_allowed=false" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "macos_two_machine_real_user_flow_repeated=false" \
  "repeated_redacted_field_reports_available=false" \
  "production_field_evidence_ready=false" \
  "developer_id_signing_available=false" \
  "notarization_available=false" \
  "stable_signed_notarized_artifact_available=false" \
  "representative_usability_evidence_completed=false" \
  "local_only_evidence_promoted_to_external=false" \
  "windows_real_runtime_smoke_passed=false" \
  "windows_public_artifact_ready=false" \
  "windows_installer_ready=false" \
  "windows_signing_ready=false" \
  "windows_public_artifact_upload_allowed=false" \
  "windows_release_packaging_allowed=false" \
  "windows_generated_artifact_commit_allowed=false" \
  "windows_public_copy_published=false" \
  "windows_production_claim_allowed=false" \
  "production_e2ee_ready=false" \
  "production_key_management_ready=false" \
  "app_key_wrapping_ready=false" \
  "key_rotation_ready=false" \
  "rollback_prevention_claimed=false" \
  "secure_deletion_claim_allowed=false" \
  "production_transport_ready=false" \
  "production_distribution_ready=false" \
  "production_operational_readiness_claim_allowed=false" \
  "windows_public_artifact_available=false" \
  "android_public_artifact_available=false" \
  "ios_public_artifact_available=false" \
  "platform_missing_artifacts_hidden=false" \
  "false_or_hold_items_hidden=false" \
  "public_claim_ahead_of_evidence=false" \
  "generated_release_artifacts_staged=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false"; do
  must_contain "$MATRIX" "$flag"
done

for phrase in \
  "secure messenger" \
  "production-ready" \
  "audited" \
  "sensitive communication safe/allowed" \
  "Briar/Cwtch-equivalent" \
  "reliable external onion delivery" \
  "repeated external onion evidence" \
  "censorship-resistant"; do
  must_contain "$MATRIX" "$phrase"
done

for source_text in \
  "전화번호를 요구하지 않는다" \
  "이메일을 요구하지 않는다" \
  "글로벌 계정을 만들지 않는다" \
  "검색 가능한 username 또는 public directory를 만들지 않는다" \
  "중앙 contact discovery를 만들지 않는다" \
  "중앙 메시지 서버에 메시지 전달을 의존하지 않는다" \
  "push notification을 필수 구조로 두지 않는다" \
  "cloud backup을 제공하지 않는다" \
  "pairwise identity와 초대 코드 또는 QR 기반 연결을 기본으로 한다" \
  "메시지 내용은 end-to-end encryption을 전제로 한다" \
  "로컬 저장소는 암호화하고 passphrase-first unlock을 기본으로 한다" \
  "public diagnostics와 support flow는 redacted data만 허용한다" \
  "자동 네트워크 시작은 금지한다" \
  "protocol, storage, transport, pairing, message orchestration은 shared Rust core가 소유한다" \
  "public 문구는 구현, 검증, 감사 수준을 넘어서지 않는다"; do
  must_contain "$TARGET" "$source_text"
done

for file in "$MATRIX" "README.md" "SECURITY.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md" \
  "reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md"; do
  must_not_match "$file" "macos_public_app_100_claim_allowed=true"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "beta_wording_removal_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "secure_messenger_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "repeated_external_onion_evidence_claim_allowed=true"
  must_not_match "$file" "briar_cwtch_equivalent_claim_allowed=true"
  must_not_match "$file" "censorship_resistant_claim_allowed=true"
  must_not_match "$file" "stable_release_allowed=true"
done

for file in README.md SECURITY.md reference/*.md; do
  must_not_match "$file" "Another Dimension Chat is (a )?secure messenger"
  must_not_match "$file" "Another Dimension Chat is production-ready"
  must_not_match "$file" "Another Dimension Chat is audited"
  must_not_match "$file" "sensitive communication is (safe|allowed)"
  must_not_match "$file" "Another Dimension Chat is (a )?Briar/Cwtch-equivalent"
  must_not_match "$file" "reliable external onion delivery (is )?(available|supported|ready)"
  must_not_match "$file" "repeated external onion evidence (is )?(available|complete|ready)"
  must_not_match "$file" "Another Dimension Chat is (a )?censorship-resistant"
done

if git -C "$ROOT" ls-files | grep -Eq '^(docs/|apps/desktop-tauri/(public-release|beta-artifacts)/)'; then
  fail "private docs or generated release artifact path is tracked"
fi

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/)'; then
  fail "private docs, AGENTS.md, or generated release artifact path is staged"
fi

cat <<'STATUS'
status=target-standard-100-evidence-matrix-ready
target_standard_100_evidence_matrix_available=true
target_standard_criteria_complete=true
macos_public_app_100_criteria_complete=true
production_claim_gate_linked=true
audit_review_gate_linked=true
field_evidence_gate_linked=true
platform_support_matrix_linked=true
false_or_hold_items_hidden=false
public_claim_ahead_of_evidence=false
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
reliable_external_delivery_claim_allowed=false
next_required_phase=Phase-C100-2-Pairwise-Identity-And-Safety-Verification-Closure
STATUS

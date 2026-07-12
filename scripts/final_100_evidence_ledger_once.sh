#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

DOC="reference/FINAL_100_EVIDENCE_LEDGER_SCHEMA.md"
VALIDATOR="scripts/validate_final_100_evidence_ledger.mjs"
ARTIFACT_GUARD="scripts/mobile_generated_artifact_guard_once.sh"

for file in "$DOC" "$VALIDATOR" "$ARTIFACT_GUARD" "reference/FINAL_100_CLAIM_GATE.md"; do
  [ -f "$file" ] || fail "missing final 100 evidence ledger input: $file"
done

for flag in \
  "final_100_evidence_ledger_schema_available=true" \
  "final_100_evidence_ledger_validator_available=true" \
  "final_100_evidence_ledger_waiting_for_real_inputs=true" \
  "final_100_evidence_ledger_rejects_fabricated_or_local_only=true" \
  "final_100_evidence_ledger_rejects_private_material=true" \
  "final_100_evidence_ledger_requires_child_evidence_files=true" \
  "final_100_evidence_ledger_child_files_sha_verified=true" \
  "final_100_evidence_ledger_child_files_content_redacted=true" \
  "final_100_evidence_ledger_requires_valid_representative_usability_reports=true" \
  "final_100_evidence_ledger_requires_valid_windows_artifact_manifest=true" \
  "final_100_evidence_ledger_requires_valid_windows_runtime_result=true" \
  "final_100_evidence_ledger_requires_valid_external_review_signoff=true" \
  "final_100_evidence_ledger_requires_valid_audit_finding_tracker=true" \
  "final_100_evidence_ledger_requires_valid_redacted_field_reports=true" \
  "final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true" \
  "final_100_evidence_candidate_requires_owner_claim_decision=true" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "final-100-evidence-ledger-v1"
must_contain "$VALIDATOR" "real-external-and-device-evidence"
must_contain "$VALIDATOR" "final_100_evidence_ledger_child_files_sha_verified=true"
must_contain "$VALIDATOR" "final_100_evidence_ledger_child_files_content_redacted=true"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_representative_usability_reports=true"
must_contain "$VALIDATOR" "validate_representative_usability_reports.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_windows_artifact_manifest=true"
must_contain "$VALIDATOR" "validate_windows_artifact_manifest.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_windows_runtime_result=true"
must_contain "$VALIDATOR" "validate_windows_public_artifact_results.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_external_review_signoff=true"
must_contain "$VALIDATOR" "validate_external_review_signoff.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_audit_finding_tracker=true"
must_contain "$VALIDATOR" "validate_audit_finding_tracker.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_valid_redacted_field_reports=true"
must_contain "$VALIDATOR" "validate_redacted_field_reports.mjs"
must_contain "$VALIDATOR" "final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true"
must_contain "$VALIDATOR" "status=final-100-evidence-candidate-requires-review"
must_contain "reference/FINAL_100_CLAIM_GATE.md" "final_100_evidence_ledger_schema_available=true"
must_contain "scripts/final_100_claim_gate_once.sh" "final_100_evidence_ledger_once.sh"
must_contain "$ARTIFACT_GUARD" "generated_artifacts_staged=false"

node --check "$VALIDATOR" >/dev/null
"$ARTIFACT_GUARD" >/dev/null

empty_output="$(node "$VALIDATOR" "$ROOT/docs/final-100-evidence")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-final-100-evidence-ledger" ||
  fail "empty final 100 evidence ledger validator did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
write_evidence() {
  local rel="$1"
  local body="$2"
  mkdir -p "$tmp_dir/$(dirname "$rel")"
  printf '%s\n' "$body" >"$tmp_dir/$rel"
}

write_usability_report() {
  local rel="$1"
  local participant="$2"
  local dedup_token="$3"
  local required_status="${4:-pass}"
  mkdir -p "$tmp_dir/$(dirname "$rel")"
  cat >"$tmp_dir/$rel" <<REPORT
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
required_task_status=$required_status
blocker_class=none-redacted
redacted_blocker_summary=none-redacted
app_launch_network_stayed_false=true
default_transport_path=local-manual-encrypted-envelope-exchange
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready
REPORT
}

write_field_report() {
  local rel="$1"
  local platform_pair="$2"
  local scope="$3"
  local network="$4"
  mkdir -p "$tmp_dir/$(dirname "$rel")"
  cat >"$tmp_dir/$rel" <<REPORT
app_version=0.1.0
build_channel=beta-onion
build_commit=abcdef1234567890
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

write_evidence "macos/artifact.provenance.json" '{"schema":"macos-provenance","result":"signed-notarized-stapled"}'
write_evidence "macos/distribution-manifest.json" '{"schema":"macos-release-distribution-manifest-v1","result":"verified"}'
write_evidence "macos/gatekeeper-assessment.txt" 'spctl assessment passed on clean macOS host'
write_evidence "macos/dmg-contained-app-assessment.txt" 'mounted DMG app codesign, execute assessment, and source bundle match passed'
write_usability_report "macos/usability-1.md" "R01" "dedup_11111111111111111111111111111111"
write_usability_report "macos/usability-2.md" "R02" "dedup_22222222222222222222222222222222"
write_usability_report "macos/usability-3.md" "R03" "dedup_33333333333333333333333333333333"
mkdir -p "$tmp_dir/windows"
windows_artifact_name="Another Dimension Chat_0.1.0_x64-setup.exe"
node - "$tmp_dir/windows/$windows_artifact_name" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const bytes = Buffer.alloc(512, 0);
bytes.write("MZ", 0, "ascii");
bytes.writeUInt32LE(0x80, 0x3c);
bytes.write("PE\0\0", 0x80, "binary");
fs.writeFileSync(file, bytes);
NODE
windows_artifact_sha="$(shasum -a 256 "$tmp_dir/windows/$windows_artifact_name" | awk '{print $1}')"
windows_artifact_size="$(wc -c <"$tmp_dir/windows/$windows_artifact_name" | tr -d ' ')"
printf '%s  %s\n' "$windows_artifact_sha" "$windows_artifact_name" \
  >"$tmp_dir/windows/$windows_artifact_name.sha256"
cat >"$tmp_dir/windows/$windows_artifact_name.provenance.json" <<JSON
{
  "schema_version": "windows-public-artifact-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "artifact_filename": "$windows_artifact_name",
  "artifact_sha256": "$windows_artifact_sha",
  "release_class": "unsigned-windows-beta",
  "bundle_target": "nsis",
  "signing_status": "unsigned-hold",
  "release_upload_authorized": false,
  "windows_public_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false,
  "engine_sidecar_required": true,
  "engine_sidecar_packaged": true,
  "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
  "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
  "engine_sidecar_contract_version": 1,
  "engine_sidecar_status_command": "status",
  "engine_sidecar_manual_self_test_command": "manual-self-test",
  "engine_sidecar_manual_self_test_required": true,
  "engine_sidecar_raw_path_returned": false,
  "engine_sidecar_stdout_returned": false,
  "engine_sidecar_stderr_returned": false,
  "engine_sidecar_app_launch_network_allowed": false,
  "engine_sidecar_room_open_network_allowed": false,
  "engine_sidecar_local_runtime_promoted_to_delivery_proof": false
}
JSON
windows_provenance_sha="$(shasum -a 256 "$tmp_dir/windows/$windows_artifact_name.provenance.json" | awk '{print $1}')"
windows_manifest_name="WINDOWS_ARTIFACT_MANIFEST.json"
cat >"$tmp_dir/windows/$windows_manifest_name" <<JSON
{
  "schema_version": "windows-public-artifact-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "version": "0.1.0",
  "release_class": "unsigned-windows-beta",
  "manifest_file": "$windows_manifest_name",
  "manifest_sha256_file": "$windows_manifest_name.sha256",
  "default_bundle_target": "nsis",
  "default_artifact_extension": ".exe",
  "webview2_runtime_required": true,
  "app_data_resolver": "tauri-app-data",
  "redacted_diagnostics_required": true,
  "auto_update": false,
  "engine_sidecar_required": true,
  "engine_sidecar_packaged": true,
  "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
  "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
  "engine_sidecar_contract_version": 1,
  "engine_sidecar_status_command": "status",
  "engine_sidecar_manual_self_test_command": "manual-self-test",
  "engine_sidecar_manual_self_test_required": true,
  "engine_sidecar_raw_path_returned": false,
  "engine_sidecar_stdout_returned": false,
  "engine_sidecar_stderr_returned": false,
  "engine_sidecar_app_launch_network_allowed": false,
  "engine_sidecar_room_open_network_allowed": false,
  "engine_sidecar_local_runtime_promoted_to_delivery_proof": false,
  "same_release_asset_authority_required": true,
  "release_upload_authorized": false,
  "release_body_edit_authorized": false,
  "windows_public_artifact_ready": false,
  "windows_installer_ready": false,
  "generated_release_artifacts_commit_allowed": false,
  "public_non_claims": [
    "unsigned experimental public beta",
    "sensitive communication prohibited",
    "not audited",
    "not production-ready",
    "no public Windows artifact",
    "no Windows installer",
    "no public artifact upload"
  ],
  "artifacts": [
    {
      "filename": "$windows_artifact_name",
      "artifact_basename": "$windows_artifact_name",
      "artifact_path_class": "generated-release-directory-relative-basename",
      "sha256": "$windows_artifact_sha",
      "size_bytes": $windows_artifact_size,
      "platform": "windows",
      "architecture": "windows-x64",
      "bundle_target": "nsis",
      "signing_status": "unsigned-hold",
      "checksum_file": "$windows_artifact_name.sha256",
      "provenance_file": "$windows_artifact_name.provenance.json",
      "webview2_runtime_required": true,
      "app_data_resolver": "tauri-app-data",
      "encrypted_store_required": true,
      "redacted_diagnostics_required": true,
      "auto_update": false,
      "smartscreen_reputation_claim": false,
      "signing_trust_boundary": false,
      "engine_sidecar_required": true,
      "engine_sidecar_packaged": true,
      "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
      "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
      "engine_sidecar_contract_version": 1,
      "engine_sidecar_status_command": "status",
      "engine_sidecar_manual_self_test_command": "manual-self-test",
      "engine_sidecar_manual_self_test_required": true,
      "engine_sidecar_raw_path_returned": false,
      "engine_sidecar_stdout_returned": false,
      "engine_sidecar_stderr_returned": false,
      "engine_sidecar_app_launch_network_allowed": false,
      "engine_sidecar_room_open_network_allowed": false,
      "engine_sidecar_local_runtime_promoted_to_delivery_proof": false
    }
  ]
}
JSON
windows_manifest_sha="$(shasum -a 256 "$tmp_dir/windows/$windows_manifest_name" | awk '{print $1}')"
printf '%s  %s\n' "$windows_manifest_sha" "$windows_manifest_name" \
  >"$tmp_dir/windows/$windows_manifest_name.sha256"
cat >"$tmp_dir/windows/runtime-result.md" <<REPORT
schema_version=windows-public-artifact-result-v1
result_id=WIN-0001
run_host=real-windows-machine
platform=windows
windows_version=Windows 11 23H2
architecture=x64
artifact_kind=nsis
artifact_app_version=0.1.0
artifact_release_class=unsigned-windows-beta
artifact_path_redacted=true
install_path_class=redacted-installer-default
app_data_resolver_class=tauri-app-data
artifact_manifest_file=$windows_manifest_name
artifact_sha256=$windows_artifact_sha
artifact_provenance_sha256=$windows_provenance_sha
artifact_manifest_sha256=$windows_manifest_sha
source_commit=abcdef1234567890
webview2_rendered=pass
app_data_root_redacted=pass
path_separator_behavior=pass
encrypted_store_profile_unlock=pass
profile_create_unlock=pass
local_deletion_behavior=pass
redacted_diagnostics_only=pass
redacted_diagnostics_copy=pass
engine_sidecar_status_runtime_checked=true
engine_sidecar_status_failure_class=none
engine_sidecar_status_contract_valid=true
engine_sidecar_status_redacted_diagnostics_only=true
engine_sidecar_manual_self_test_runtime_checked=true
engine_sidecar_manual_self_test_failure_class=none
engine_sidecar_manual_self_test_contract_valid=true
engine_sidecar_manual_self_test_passed=true
engine_sidecar_manual_self_test_runtime_available=true
engine_sidecar_raw_path_returned=false
engine_sidecar_stdout_returned=false
engine_sidecar_stderr_returned=false
engine_sidecar_app_launch_network_allowed=false
engine_sidecar_room_open_network_allowed=false
engine_sidecar_local_runtime_promoted_to_delivery_proof=false
explicit_user_action_before_network=pass
app_launch_network=false
local_manual_envelope_default_path=pass
auto_update_channel_absent=pass
public_non_claims_visible=pass
installer_signing_decision=unsigned-hold
smartscreen_reputation_claim=false
public_copy_reviewed=true
checksum_provenance_verified=true
support_diagnostics_reviewed=true
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload
REPORT
write_evidence "android/artifact-manifest.json" '{"schema":"android-public-artifact-manifest-v1","result":"verified"}'
write_evidence "android/device-result.md" 'real Android device result: shared-core flow and backup exclusion passed'
write_evidence "ios/artifact-manifest.json" '{"schema":"ios-public-artifact-manifest-v1","result":"verified"}'
write_evidence "ios/device-result.md" 'real iOS device result: shared-core flow and entitlements review passed'
mkdir -p "$tmp_dir/external"
cat >"$tmp_dir/external/review-signoff.json" <<'JSON'
{
  "schema_version": "external-review-signoff-v1",
  "review_id": "XR-2026-0001",
  "review_type": "security-audit",
  "reviewer": {
    "name": "Riley Stone",
    "affiliation": "Independent Security Review LLC",
    "contact": "reviewer@example.org"
  },
  "reviewed_commit": "abcdef1234567890",
  "completed_at": "2026-06-13",
  "public_safe_report_sha256": "9999999999999999999999999999999999999999999999999999999999999999",
  "reviewed_inputs": [
    "README.md",
    "SECURITY.md",
    "reference/INDEPENDENT_REVIEW_PACKET.md",
    "reference/AUDIT_FINDING_TRACKER.md",
    "scripts/validate_audit_finding_tracker.mjs",
    "crates/core/src/lib.rs",
    "apps/desktop-tauri/src/App.tsx"
  ],
  "finding_summary": {
    "total_findings": 1,
    "critical_open": 0,
    "high_open": 0,
    "medium_open": 0,
    "low_open": 0,
    "informational_open": 0,
    "fixed": 1,
    "held": 0,
    "waived": 0,
    "all_findings_triaged": true
  },
  "signoff": {
    "reviewer_signed_public_safe_summary": true,
    "reviewer_claims_sensitive_use_safety": false,
    "reviewer_claims_production_ready": false,
    "reviewer_claims_audited_product": false
  },
  "evidence_boundary": {
    "external_reviewer_submitted": true,
    "fabricated_or_local_only": false,
    "private_material_included": false,
    "owner_claim_decision_required": true
  }
}
JSON
cat >"$tmp_dir/external/audit-finding-tracker.md" <<'TRACKER'
# Audit Finding Tracker

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| AR-0001 | high | storage | Redacted storage lifecycle blocker. | fix | fixed | Keep not audited, not production-ready, and sensitive communication prohibited. |

## Current Counts

- critical_findings_open=0
- high_findings_open=0
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=1
- findings_held=0
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
TRACKER
write_field_report "external/field-1.md" "macos-to-macos" "two-machine-same-network" "same-lan"
write_field_report "external/field-2.md" "macos-to-windows" "two-machine-different-network" "different-networks"
write_field_report "external/field-3.md" "windows-to-windows" "two-machine-same-network" "same-lan"
write_field_report "external/field-4.md" "android-to-ios" "two-machine-different-network" "different-networks"
write_evidence "claim/release-copy-review.md" 'release copy reviewed: public claims do not exceed evidence'
write_evidence "claim/support-copy-review.md" 'support copy reviewed: public claims do not exceed evidence'

node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = process.argv[2];
const ref = (relativePath) => ({
  path: relativePath,
  sha256: createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex"),
});

const ledger = {
  schema_version: "final-100-evidence-ledger-v1",
  source_commit: "abcdef1234567890",
  evidence_origin: "real-external-and-device-evidence",
  final_100_claim_gate_ready: true,
  macos_public_app_100_claim_allowed: false,
  whole_target_standard_100_claim_allowed: false,
  production_ready_claim_allowed: false,
  audited_claim_allowed: false,
  sensitive_communication_allowed: false,
  evidence_files: {
    macos: {
      artifact_provenance: ref("macos/artifact.provenance.json"),
      distribution_manifest: ref("macos/distribution-manifest.json"),
      gatekeeper_assessment: ref("macos/gatekeeper-assessment.txt"),
      dmg_contained_app_assessment: ref("macos/dmg-contained-app-assessment.txt"),
      representative_usability_reports: [
        ref("macos/usability-1.md"),
        ref("macos/usability-2.md"),
        ref("macos/usability-3.md"),
      ],
    },
    windows: {
      artifact_manifest: ref("windows/WINDOWS_ARTIFACT_MANIFEST.json"),
      runtime_result: ref("windows/runtime-result.md"),
    },
    android: {
      artifact_manifest: ref("android/artifact-manifest.json"),
      real_device_result: ref("android/device-result.md"),
    },
    ios: {
      artifact_manifest: ref("ios/artifact-manifest.json"),
      real_device_result: ref("ios/device-result.md"),
    },
    external: {
      review_signoff: ref("external/review-signoff.json"),
      audit_finding_tracker: ref("external/audit-finding-tracker.md"),
      redacted_field_reports: [
        ref("external/field-1.md"),
        ref("external/field-2.md"),
        ref("external/field-3.md"),
        ref("external/field-4.md"),
      ],
    },
    claim_discipline: {
      release_copy_review: ref("claim/release-copy-review.md"),
      support_copy_review: ref("claim/support-copy-review.md"),
    },
  },
  macos: {
    developer_id_signed: true,
    notarized: true,
    stapled: true,
    spctl_assess_passed: true,
    dmg_mounted_app_found: true,
    dmg_contained_app_codesign_verify_passed: true,
    dmg_contained_app_gatekeeper_assess_passed: true,
    dmg_contained_app_matches_signed_source_app: true,
    gatekeeper_clean_open_observed: true,
    release_distribution_manifest_verified: true,
    representative_usability_completed: true,
    representative_usability_report_count: 3,
    artifact_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    distribution_manifest_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  windows: {
    real_runtime_smoke_passed: true,
    webview2_runtime_verified: true,
    public_artifact_manifest_verified: true,
    artifact_sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    artifact_manifest_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  },
  android: {
    real_device_smoke_passed: true,
    shared_core_flow_verified: true,
    apk_or_aab_manifest_verified: true,
    backup_exclusion_verified: true,
    artifact_sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    artifact_manifest_sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  },
  ios: {
    real_device_smoke_passed: true,
    shared_core_flow_verified: true,
    ipa_or_testflight_manifest_verified: true,
    minimal_entitlements_reviewed: true,
    privacy_labels_reviewed: true,
    artifact_sha256: "1111111111111111111111111111111111111111111111111111111111111111",
    artifact_manifest_sha256: "2222222222222222222222222222222222222222222222222222222222222222",
  },
  security: {
    production_e2ee_reviewed: true,
    key_management_reviewed: true,
    storage_lifecycle_reviewed: true,
    default_transport_ready: true,
    redacted_diagnostics_reviewed: true,
  },
  external: {
    named_external_review_completed: true,
    audit_completed: true,
    critical_high_findings_closed: true,
    repeated_real_field_reports_available: true,
    accepted_field_report_count: 4,
  },
  claim_discipline: {
    public_claim_may_not_exceed_evidence: true,
    release_copy_reviewed: true,
    support_copy_reviewed: true,
  },
};

fs.writeFileSync(path.join(root, "valid-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE

candidate_output="$(node "$VALIDATOR" "$tmp_dir/valid-ledger.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_final_100_evidence_ledgers=1" ||
  fail "valid final 100 evidence ledger was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_child_files_sha_verified=true" ||
  fail "final 100 ledger validator did not verify child evidence file SHAs"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_child_files_content_redacted=true" ||
  fail "final 100 ledger validator did not scan child evidence content"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_representative_usability_reports=true" ||
  fail "final 100 ledger validator did not require valid representative usability reports"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_windows_artifact_manifest=true" ||
  fail "final 100 ledger validator did not require valid Windows artifact manifest"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_windows_runtime_result=true" ||
  fail "final 100 ledger validator did not require valid Windows runtime result"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_external_review_signoff=true" ||
  fail "final 100 ledger validator did not require valid external review signoff"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_audit_finding_tracker=true" ||
  fail "final 100 ledger validator did not require valid audit finding tracker"
printf '%s\n' "$candidate_output" | grep -Fq "final_100_evidence_ledger_requires_valid_redacted_field_reports=true" ||
  fail "final 100 ledger validator did not require valid redacted field reports"
printf '%s\n' "$candidate_output" | grep -Fq "macos_public_app_100_claim_allowed=false" ||
  fail "final 100 ledger validator must not auto-open macOS claim"
printf '%s\n' "$candidate_output" | grep -Fq "status=final-100-evidence-candidate-requires-review" ||
  fail "final 100 ledger validator did not require review"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/valid-ledger.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict final 100 evidence ledger validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict final 100 evidence ledger validator did not report stale source commit"

write_usability_report "macos/usability-1.md" "R01" "dedup_11111111111111111111111111111111" "fail"
node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const ledgerFile = path.join(root, "valid-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
const usability = path.join(root, "macos/usability-1.md");
ledger.evidence_files.macos.representative_usability_reports[0].sha256 =
  createHash("sha256").update(fs.readFileSync(usability)).digest("hex");
fs.writeFileSync(path.join(root, "invalid-usability-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE
if node "$VALIDATOR" "$tmp_dir/invalid-usability-ledger.json" >"$tmp_dir/invalid-usability.out" 2>&1; then
  fail "final 100 evidence ledger accepted invalid representative usability report evidence"
fi
grep -Fq "macos.representative_usability_reports:required-tasks-not-passed" \
  "$tmp_dir/invalid-usability.out" ||
  fail "final 100 ledger validator did not report invalid representative usability reports"

sed 's/^artifact_manifest_sha256=.*/artifact_manifest_sha256=dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/' \
  "$tmp_dir/windows/runtime-result.md" >"$tmp_dir/windows/runtime-result-bad-manifest-sha.md"
node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const ledger = JSON.parse(fs.readFileSync(path.join(root, "valid-ledger.json"), "utf8"));
const result = path.join(root, "windows/runtime-result-bad-manifest-sha.md");
ledger.evidence_files.windows.runtime_result = {
  path: "windows/runtime-result-bad-manifest-sha.md",
  sha256: createHash("sha256").update(fs.readFileSync(result)).digest("hex"),
};
fs.writeFileSync(path.join(root, "invalid-windows-runtime-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE
if node "$VALIDATOR" "$tmp_dir/invalid-windows-runtime-ledger.json" >"$tmp_dir/invalid-windows-runtime.out" 2>&1; then
  fail "final 100 evidence ledger accepted Windows runtime result with mismatched artifact manifest SHA"
fi
grep -Fq "windows.runtime_result:validator-failed" "$tmp_dir/invalid-windows-runtime.out" ||
  fail "final 100 ledger validator did not report invalid Windows runtime result"

node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const ledger = JSON.parse(fs.readFileSync(path.join(root, "valid-ledger.json"), "utf8"));
const signoff = path.join(root, "external/review-signoff.json");
const doc = JSON.parse(fs.readFileSync(signoff, "utf8"));
doc.reviewer.name = "Unknown";
fs.writeFileSync(signoff, `${JSON.stringify(doc, null, 2)}\n`);
ledger.evidence_files.external.review_signoff.sha256 =
  createHash("sha256").update(fs.readFileSync(signoff)).digest("hex");
fs.writeFileSync(path.join(root, "invalid-signoff-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE
if node "$VALIDATOR" "$tmp_dir/invalid-signoff-ledger.json" >"$tmp_dir/invalid-signoff.out" 2>&1; then
  fail "final 100 evidence ledger accepted invalid external review signoff"
fi
grep -Fq "external.review_signoff:validator-failed" "$tmp_dir/invalid-signoff.out" ||
  fail "final 100 ledger validator did not report invalid external review signoff"

cat >"$tmp_dir/external/audit-finding-tracker.md" <<'TRACKER'
# Audit Finding Tracker

## Finding Table

| ID | Severity | Area | Public-safe summary | Decision | Status | Public wording impact |
| --- | --- | --- | --- | --- | --- | --- |
| AR-0001 | high | storage | Redacted storage lifecycle blocker. | hold | open | Keep not audited, not production-ready, and sensitive communication prohibited. |

## Current Counts

- critical_findings_open=0
- high_findings_open=1
- medium_findings_open=0
- low_findings_open=0
- informational_findings_open=0
- findings_fixed=0
- findings_held=1
- findings_waived=0
- external_review_completed=false
- audit_completed=false
- audited_claim_allowed=false
- security_ready_claimed=false
TRACKER
node - "$tmp_dir" <<'NODE'
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const ledger = JSON.parse(fs.readFileSync(path.join(root, "valid-ledger.json"), "utf8"));
const tracker = path.join(root, "external/audit-finding-tracker.md");
ledger.evidence_files.external.audit_finding_tracker.sha256 =
  createHash("sha256").update(fs.readFileSync(tracker)).digest("hex");
fs.writeFileSync(path.join(root, "invalid-audit-tracker-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
NODE
if node "$VALIDATOR" "$tmp_dir/invalid-audit-tracker-ledger.json" >"$tmp_dir/invalid-audit-tracker.out" 2>&1; then
  fail "final 100 evidence ledger accepted open high audit finding tracker"
fi
grep -Fq "external.audit_finding_tracker:critical-high-open" \
  "$tmp_dir/invalid-audit-tracker.out" ||
  fail "final 100 ledger validator did not report open critical/high audit finding tracker"

cat >"$tmp_dir/local-only-ledger.json" <<'JSON'
{
  "schema_version": "final-100-evidence-ledger-v1",
  "source_commit": "abcdef1234567890",
  "evidence_origin": "real-external-and-device-evidence",
  "note": "local-only same-machine synthetic evidence",
  "final_100_claim_gate_ready": true
}
JSON

if node "$VALIDATOR" "$tmp_dir/local-only-ledger.json" >"$tmp_dir/local-only.out" 2>&1; then
  fail "final 100 evidence ledger accepted local-only synthetic evidence"
fi
grep -Fq "forbidden-content:synthetic-evidence" "$tmp_dir/local-only.out" ||
  fail "synthetic evidence rejection was not reported"

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=final-100-evidence-ledger-gate-ready
final_100_evidence_ledger_schema_available=true
final_100_evidence_ledger_validator_available=true
final_100_evidence_ledger_waiting_for_real_inputs=true
final_100_evidence_ledger_rejects_fabricated_or_local_only=true
final_100_evidence_ledger_rejects_private_material=true
final_100_evidence_ledger_requires_child_evidence_files=true
final_100_evidence_ledger_child_files_sha_verified=true
final_100_evidence_ledger_child_files_content_redacted=true
final_100_evidence_ledger_requires_valid_representative_usability_reports=true
final_100_evidence_ledger_requires_valid_windows_artifact_manifest=true
final_100_evidence_ledger_requires_valid_windows_runtime_result=true
final_100_evidence_ledger_requires_valid_external_review_signoff=true
final_100_evidence_ledger_requires_valid_audit_finding_tracker=true
final_100_evidence_ledger_requires_valid_redacted_field_reports=true
final_100_evidence_ledger_requires_macos_dmg_contained_app_evidence=true
final_100_evidence_candidate_requires_owner_claim_decision=true
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
generated_artifacts_staged=false
STATUS

#!/usr/bin/env bash
set -euo pipefail

echo "FAIL final security-ready acceptance is outside the v0.1 public product claim" >&2
echo "status=final-acceptance-out-of-v0_1-scope" >&2
echo "release_class=public_beta" >&2
echo "acceptance_bar_items=27" >&2
echo "acceptance_bar_covered=true" >&2
echo "payload_recorded=false" >&2
echo "passphrase_recorded=false" >&2
echo "local_path_recorded=false" >&2
echo "key_material_recorded=false" >&2
echo "p0_p1_local_bug_audit_complete=false" >&2
echo "p0_p1_local_bugs_present=unverified" >&2
echo "p0_p1_local_bug_blocker=missing-audit-or-unverified-bugs" >&2
echo "stable_candidate_blocked_by_p0_p1_audit=true" >&2
echo "stable_public_app_blocked_by_p0_p1_audit=true" >&2
echo "source_acceptance_suite_passed=false" >&2
echo "release_artifact_consistency_verified=false" >&2
echo "external_two_machine_evidence_present=false" >&2
echo "macos_public_artifact_consistency_verified=false" >&2
echo "windows_public_artifact_candidate_source_gate_ready=true" >&2
echo "windows_artifact_manifest_package_structure_verified=true" >&2
echo "windows_runtime_result_manifest_binding_verified=true" >&2
echo "windows_runtime_evidence_contract_verified=true" >&2
echo "windows_public_artifact_real_runtime_evidence_present=false" >&2
echo "windows_public_artifact_consistency_verified=false" >&2
echo "windows_artifact_release_upload_authorized=false" >&2
echo "emergency_advisory_path_ready=false" >&2
echo "public_copy_claims_reviewed=true" >&2
echo "ordinary_use_public_copy_scope=no-phone#no-email#no-global-account#pairwise-invite#mandatory-safety-comparison#user-mediated-encrypted-exchange#local-data-ownership" >&2
echo "defined_high_risk_mode_copy_scope=defined-threat-model#onion-only-explicit-action#local-at-rest-hardening#redacted-support#not-protected-boundary" >&2
echo "high_risk_not_protected_boundary=compromised-endpoint#direct-coercion#global-traffic-correlation" >&2
echo "forbidden_positive_public_claims_found=false" >&2
echo "support_redaction_verified=true" >&2
echo "public_beta_ready=false" >&2
echo "stable_candidate_ready=false" >&2
echo "stable_public_app_ready=false" >&2
echo "high_risk_readiness=not_ready" >&2
echo "high_risk_mode_ready=false" >&2
echo "high_risk_required_conditions_missing=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-encryption-evidence#release-integrity" >&2
echo "high_risk_blocked_by_missing_required_conditions=true" >&2
echo "release_decision=hold" >&2
echo "missing_stable_candidate_conditions=p0_p1_audit#source_acceptance#external_two_machine_evidence#macos_artifact#windows_artifact#emergency_advisory#release_artifact_consistency" >&2
echo "missing_windows_public_artifact_conditions=real_windows_runtime_result#release_artifact#signing_decision#upload_authorization#public_copy_review" >&2
echo "external_delivery_claim=false" >&2
echo "audited_claim=false" >&2
echo "windows_production_claim_allowed=false" >&2
echo "high_risk_public_claim_allowed=false" >&2
echo "briar_cwtch_signal_equivalence_claim=false" >&2
echo "compromised_device_safe_claim=false" >&2
echo "coercion_safe_claim=false" >&2
echo "full_global_correlation_safe_claim=false" >&2
echo "source_acceptance=use scripts/public_release_readiness_preflight.sh for the current unsigned public beta source gate" >&2
echo "next=use scripts/public_release_readiness_preflight.sh, then scripts/prepare_unsigned_public_beta_release.sh only with the pinned frozen ignored DMG" >&2
exit 1

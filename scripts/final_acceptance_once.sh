#!/usr/bin/env bash
set -euo pipefail

echo "FAIL final security-ready acceptance is outside the v0.1 public product claim" >&2
echo "status=final-acceptance-out-of-v0_1-scope" >&2
echo "acceptance_bar_items=27" >&2
echo "acceptance_bar_covered=true" >&2
echo "payload_recorded=false" >&2
echo "passphrase_recorded=false" >&2
echo "local_path_recorded=false" >&2
echo "key_material_recorded=false" >&2
echo "p0_p1_local_bug_audit_complete=false" >&2
echo "p0_p1_local_bugs_present=unverified" >&2
echo "source_acceptance_suite_passed=false" >&2
echo "release_artifact_consistency_verified=false" >&2
echo "public_copy_claims_reviewed=true" >&2
echo "support_redaction_verified=true" >&2
echo "stable_public_app_ready=false" >&2
echo "high_risk_readiness=not_ready" >&2
echo "high_risk_mode_ready=false" >&2
echo "release_decision=hold" >&2
echo "external_delivery_claim=false" >&2
echo "audited_claim=false" >&2
echo "briar_cwtch_signal_equivalence_claim=false" >&2
echo "compromised_device_safe_claim=false" >&2
echo "coercion_safe_claim=false" >&2
echo "full_global_correlation_safe_claim=false" >&2
echo "source_acceptance=use scripts/public_release_readiness_preflight.sh for the current unsigned public beta source gate" >&2
echo "next=use scripts/public_release_readiness_preflight.sh, then scripts/prepare_unsigned_public_beta_release.sh only with the pinned frozen ignored DMG" >&2
exit 1

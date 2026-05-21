#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

cd "$ROOT_DIR"

run_step "rustfmt" cargo fmt --all -- --check
run_step "workspace library tests" cargo test --workspace --lib
run_step "default build boundary checks" scripts/verify_default_boundary.sh
run_step "tauri scaffold static checks" scripts/verify_tauri_scaffold.sh
run_step "release artifact gate skeleton" scripts/verify_release_artifact_gates.sh
run_step "dependency review gate skeleton" scripts/verify_dependency_review_gate.sh
run_step "dependency review template" scripts/verify_dependency_review_template.sh
run_step "external review gate skeleton" scripts/verify_external_review_gate.sh
run_step "external review template" scripts/verify_external_review_template.sh
run_step "release completion audit" scripts/verify_release_completion_audit.sh
run_step "release gate evidence audit" scripts/verify_release_gate_evidence_audit.sh
run_step "update integrity gate skeleton" scripts/verify_update_integrity_gate.sh
run_step "update integrity template" scripts/verify_update_integrity_template.sh
run_step "release signoff gate skeleton" scripts/verify_release_signoff_gate.sh
run_step "release signoff template" scripts/verify_release_signoff_template.sh
run_step "release signing plan" scripts/verify_release_signing_plan.sh
run_step "release signing dry-run" scripts/verify_release_signing_dry_run.sh
run_step "release detached-signature fixture" scripts/verify_release_detached_signature_fixture.sh
run_step "release signing tooling gate" scripts/verify_release_signing_tooling_gate.sh
run_step "release signing ceremony dry-run" scripts/verify_release_signing_ceremony_dry_run.sh
run_step "release signing ceremony harness" scripts/verify_release_signing_ceremony_harness.sh
run_step "release key ceremony requirements" scripts/verify_release_key_ceremony_requirements.sh
run_step "release artifact signing requirements" scripts/verify_release_artifact_signing_requirements.sh
run_step "release verification UX requirements" scripts/verify_release_verification_ux_requirements.sh
run_step "release signing candidate evidence index" scripts/verify_release_signing_candidate_evidence_index.sh
run_step "release signing candidate evidence runbook" scripts/verify_release_signing_candidate_evidence_runbook.sh
run_step "release signing candidate evidence fixture" scripts/verify_release_signing_candidate_evidence_fixture.sh
run_step "release signing candidate evidence fixture audit" scripts/verify_release_signing_candidate_evidence_fixture_audit.sh
run_step "release signing release-note non-claim guard" scripts/verify_release_signing_release_note_non_claim_guard.sh
run_step "release signing evidence package layout fixture" scripts/verify_release_signing_evidence_package_layout_fixture.sh
run_step "release signing evidence package layout audit" scripts/verify_release_signing_evidence_package_layout_audit.sh
run_step "release signing candidate manifest consistency fixture" scripts/verify_release_signing_candidate_manifest_consistency_fixture.sh
run_step "release signing candidate manifest consistency audit" scripts/verify_release_signing_candidate_manifest_consistency_audit.sh
run_step "release signing candidate evidence package checksum audit" scripts/verify_release_signing_candidate_evidence_package_checksum_audit.sh
run_step "release signing candidate evidence package checksum non-claim guard" scripts/verify_release_signing_candidate_evidence_package_checksum_non_claim_guard.sh
run_step "release signing candidate evidence package checksum guard audit" scripts/verify_release_signing_candidate_evidence_package_checksum_guard_audit.sh
run_step "release signing candidate evidence index checksum requirements" scripts/verify_release_signing_candidate_evidence_index_checksum_requirements.sh
run_step "release signing candidate evidence index checksum fixture" scripts/verify_release_signing_candidate_evidence_index_checksum_fixture.sh
run_step "release signing candidate evidence index checksum fixture audit" scripts/verify_release_signing_candidate_evidence_index_checksum_fixture_audit.sh
run_step "release signing candidate signed-artifact verification requirements" scripts/verify_release_signing_candidate_signed_artifact_verification_requirements.sh
run_step "release signing candidate signed-artifact verification fixture" scripts/verify_release_signing_candidate_signed_artifact_verification_fixture.sh
run_step "release signing candidate signed-artifact verification fixture audit" scripts/verify_release_signing_candidate_signed_artifact_verification_fixture_audit.sh
run_step "release signing candidate signed-artifact verification non-claim guard" scripts/verify_release_signing_candidate_signed_artifact_verification_non_claim_guard.sh
run_step "release signing candidate signed-artifact verification guard audit" scripts/verify_release_signing_candidate_signed_artifact_verification_guard_audit.sh
run_step "release signing candidate signed-artifact verification guard audit coverage checks" scripts/verify_release_signing_candidate_signed_artifact_verification_guard_audit_coverage_checks.sh
run_step "release signing candidate signed-artifact verification record template" scripts/verify_release_signing_candidate_signed_artifact_verification_record_template.sh
run_step "release signing candidate signed-artifact verification record template coverage audit" scripts/verify_release_signing_candidate_signed_artifact_verification_record_template_coverage_audit.sh
run_step "binary verification plan" scripts/verify_binary_verification_plan.sh
run_step "binary manifest fixture" scripts/verify_binary_manifest_fixture.sh
run_step "binary input template" scripts/verify_binary_input_template.sh
run_step "release hygiene static checks" scripts/verify_release_hygiene.sh

printf '\nlight verification steps passed\n'

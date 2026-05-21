#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

grep -q 'Audit verdict: not complete' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Current evidence does not prove v0.1-security-ready 100%' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Release signing | `RELEASE_HARDENING.md` records a pre-implementation signing plan, OpenSSL-compatible tooling decision, ceremony dry-run record, real key ceremony requirements, artifact signing requirements, verification UX requirements, candidate evidence index, candidate evidence collection runbook, candidate evidence fixture, candidate evidence fixture coverage audit, release-note non-claim guard, evidence package layout fixture, evidence package layout coverage audit, candidate manifest consistency fixture, candidate manifest consistency coverage audit, candidate evidence package checksum coverage audit, candidate evidence package checksum non-claim guard, candidate evidence package checksum guard coverage audit, candidate evidence index checksum binding requirements, candidate evidence index checksum binding fixture, ceremony command harness, dry-run verifier, and disposable detached-signature fixture, but no release signing workflow or signed artifact verification exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_ceremony_dry_run.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_ceremony_harness.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_key_ceremony_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_artifact_signing_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_verification_ux_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_index.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_runbook.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_fixture_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_release_note_non_claim_guard.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_evidence_package_layout_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_evidence_package_layout_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_manifest_consistency_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_manifest_consistency_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_package_checksum_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_package_checksum_non_claim_guard.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_package_checksum_guard_audit.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_index_checksum_requirements.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_candidate_evidence_index_checksum_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_plan.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_dry_run.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_detached_signature_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signing_tooling_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Reproducible or equivalent binary verification | `RELEASE_HARDENING.md` records a pre-implementation binary verification plan, input template, and manifest fixture verifier, but no reproducible build evidence or equivalent binary verification evidence exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_binary_verification_plan.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_binary_manifest_fixture.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_binary_input_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Dependency and supply-chain review | `RELEASE_HARDENING.md` records a policy skeleton and \[RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md\](RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md) records required candidate-review fields, but no candidate-specific dependency review evidence exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_dependency_review_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Threat model and release copy alignment | `RELEASE_HARDENING.md` records a release-candidate signoff skeleton and \[RELEASE_SIGNOFF_TEMPLATE.md\](RELEASE_SIGNOFF_TEMPLATE.md) records required threat-model, public-copy, gate-evidence, and blocker fields, but no candidate-specific signoff evidence exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signoff_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'External or independent review readiness | `RELEASE_HARDENING.md` records a readiness checklist skeleton and \[RELEASE_EXTERNAL_REVIEW_TEMPLATE.md\](RELEASE_EXTERNAL_REVIEW_TEMPLATE.md) records required scope/material/finding/blocker fields, but no candidate-specific external or independent review readiness evidence exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_external_review_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Update and installer integrity | `RELEASE_HARDENING.md` records an update/installer integrity checklist skeleton and \[RELEASE_UPDATE_INTEGRITY_TEMPLATE.md\](RELEASE_UPDATE_INTEGRITY_TEMPLATE.md) records required artifact, signature/hash, downgrade, package, and recovery fields, but no candidate-specific update or installer integrity evidence exists' \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_update_integrity_template.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'Update and installer integrity' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"
grep -q 'scripts/verify_release_signoff_gate.sh' "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md"

if grep -R -n -E 'v0\.1-security-ready 100% complete|release gates complete|completion audit passed|approved for high-risk release' \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/RELEASE_HARDENING.md" \
  "$ROOT_DIR/RELEASE_COMPLETION_AUDIT.md" \
  "$ROOT_DIR/COMPONENT_BOUNDARIES.md" >/dev/null; then
  echo "completion audit does not prove 100% or release approval" >&2
  exit 1
fi

printf 'release completion audit confirms v0.1-security-ready is not complete\n'

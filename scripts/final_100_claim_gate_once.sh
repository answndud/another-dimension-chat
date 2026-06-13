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

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden final 100 claim pattern: $pattern"
  fi
}

DOC="reference/FINAL_100_CLAIM_GATE.md"

for file in "$DOC" \
  "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "reference/MACOS_RELEASE_DISTRIBUTION_METADATA.md" \
  "reference/MACOS_FIRST_RUN_RECOVERY_USABILITY_MATRIX.md" \
  "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md" \
  "reference/PRODUCTION_READINESS_CLAIM_GATE.md" \
  "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" \
  "reference/ANDROID_PUBLIC_APP_CANDIDATE.md" \
  "reference/IOS_PUBLIC_APP_CANDIDATE.md" \
  "reference/EXTERNAL_AUDIT_FIELD_EVIDENCE_GATE.md" \
  "reference/STABLE_MACOS_V1_RELEASE_GATE.md"; do
  [ -f "$file" ] || fail "missing final 100 claim gate input: $file"
done

for flag in \
  "final_100_claim_gate_ready=true" \
  "macos_public_app_100_claim_allowed=false" \
  "whole_target_standard_100_claim_allowed=false" \
  "production_claim_gate_passed=false" \
  "production_claim_gate_passed_by_evidence=false" \
  "stable_release_gate_decision=hold" \
  "stable_macos_v1_release_allowed=false" \
  "macos_signed_notarized_artifact_available=false" \
  "macos_release_distribution_artifact_ready=false" \
  "gatekeeper_assess_executed=false" \
  "windows_public_artifact_ready=false" \
  "android_public_artifact_ready=false" \
  "ios_public_artifact_ready=false" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "repeated_redacted_field_reports_available=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "public_claim_may_not_exceed_evidence=true"; do
  must_contain "$DOC" "$flag"
done

must_contain "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" "gatekeeper_assess_executed=false"
must_contain "reference/MACOS_RELEASE_DISTRIBUTION_METADATA.md" "macos_release_distribution_artifact_ready=false"
must_contain "reference/MACOS_FIRST_RUN_RECOVERY_USABILITY_MATRIX.md" "representative_usability_evidence_completed=false"
must_contain "reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md" "signed_update_manifest_ready=false"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "production_claim_gate_passed=false"
must_contain "reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md" "windows_public_artifact_ready=false"
must_contain "reference/ANDROID_PUBLIC_APP_CANDIDATE.md" "android_public_artifact_ready=false"
must_contain "reference/IOS_PUBLIC_APP_CANDIDATE.md" "ios_public_artifact_ready=false"
must_contain "reference/EXTERNAL_AUDIT_FIELD_EVIDENCE_GATE.md" "external_review_completed=false"
must_contain "reference/EXTERNAL_AUDIT_FIELD_EVIDENCE_GATE.md" "repeated_redacted_field_reports_available=false"
must_contain "reference/STABLE_MACOS_V1_RELEASE_GATE.md" "stable_release_gate_decision=hold"

for file in "$DOC" \
  reference/PRODUCTION_READINESS_CLAIM_GATE.md \
  reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md \
  reference/ANDROID_PUBLIC_APP_CANDIDATE.md \
  reference/IOS_PUBLIC_APP_CANDIDATE.md \
  reference/EXTERNAL_AUDIT_FIELD_EVIDENCE_GATE.md \
  reference/STABLE_MACOS_V1_RELEASE_GATE.md; do
  must_not_match "$file" "macos_public_app_100_claim_allowed=true"
  must_not_match "$file" "whole_target_standard_100_claim_allowed=true"
  must_not_match "$file" "production_claim_gate_passed=true"
  must_not_match "$file" "windows_public_artifact_ready=true"
  must_not_match "$file" "android_public_artifact_ready=true"
  must_not_match "$file" "ios_public_artifact_ready=true"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "repeated_redacted_field_reports_available=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
  must_not_match "$file" "audited_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=final-100-claim-gate-held
final_100_claim_gate_ready=true
macos_public_app_100_claim_allowed=false
whole_target_standard_100_claim_allowed=false
production_claim_gate_passed=false
production_claim_gate_passed_by_evidence=false
stable_release_gate_decision=hold
stable_macos_v1_release_allowed=false
windows_public_artifact_ready=false
android_public_artifact_ready=false
ios_public_artifact_ready=false
external_review_completed=false
audit_completed=false
repeated_redacted_field_reports_available=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_communication_allowed=false
public_claim_may_not_exceed_evidence=true
STATUS

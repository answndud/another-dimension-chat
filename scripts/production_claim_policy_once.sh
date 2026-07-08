#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="$ROOT_DIR/reference/PRODUCTION_READINESS_CLAIM_GATE.md"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
FINAL_REPORT="$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"
DECISION="$ROOT_DIR/reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing production claim policy input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing production claim policy text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden production claim policy text in $file: $text" >&2
    exit 1
  fi
}

for file in "$GATE" "$README" "$SECURITY" "$FINAL_REPORT" "$DECISION"; do
  require_file "$file"
done

for file in "$README" "$SECURITY" "$FINAL_REPORT"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
done

require_text "$README" "reference/PRODUCTION_READINESS_CLAIM_GATE.md"
require_text "$README" "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
require_text "$README" "Signing and notarization are"
require_text "$SECURITY" "reference/PRODUCTION_READINESS_CLAIM_GATE.md"
require_text "$SECURITY" "reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md"
require_text "$SECURITY" "distribution ergonomics, not a messenger security"
require_text "$FINAL_REPORT" "Phase OPS-1 - Production Readiness Definition And Claim Gate"

require_text "$GATE" "Status: not satisfied"
require_text "$GATE" "rb_8_production_claim_release_class_decision_reviewed=true"
require_text "$GATE" "stable_release_candidate_gate_decision=lower-release-class-only"
require_text "$GATE" "next_release_class=signed-public-beta-or-rc"
require_text "$GATE" "Production-Ready Meaning"
require_text "$GATE" "Functional readiness"
require_text "$GATE" "Security readiness"
require_text "$GATE" "Transport readiness"
require_text "$GATE" "Distribution readiness"
require_text "$GATE" "Operational readiness"
require_text "$GATE" "Claim Matrix"
require_text "$GATE" "Beta Wording Removal Checklist"
require_text "$GATE" "Explicit Non-Gates"
require_text "$GATE" "signed_notarized_security_boundary=false"
require_text "$GATE" "production_ready_claim_allowed=false"
require_text "$GATE" "r100_1_production_claim_gate_decision_closed=true"
require_text "$GATE" "production_claim_gate_passed=false"
require_text "$GATE" "production_claim_gate_passed_by_evidence=false"
require_text "$GATE" "beta_wording_removal_allowed=false"
require_text "$GATE" "audited_claim_allowed=false"
require_text "$GATE" "sensitive_communication_allowed=false"
require_text "$GATE" "reliable_external_delivery_claim_allowed=false"
require_text "$GATE" "lower_release_class_claim_boundary_ready=true"
require_text "$GATE" "public_wording_matches_lower_release_class=true"
require_text "$GATE" "owner_stable_release_approval_recorded=false"
require_text "$GATE" "d100_1_e2ee_source_gate_reviewed=true"
require_text "$GATE" "protocol_session_e2ee_source_ready=true"
require_text "$GATE" "OPS-2 production E2EE protocol/session lifecycle hardening is complete"
require_text "$GATE" "OPS-3 production key management and local storage lifecycle is complete"
require_text "$GATE" "d100_2_key_management_source_gate_reviewed=true"
require_text "$GATE" "production_key_management_source_ready=true"
require_text "$GATE" "OPS-4 reliable default transport product path is complete"
require_text "$GATE" "OPS-5 macOS production UX and onboarding is complete"
require_text "$GATE" "OPS-6 macOS production distribution is complete"
require_text "$GATE" "OPS-7 external review and audit readiness is complete"
require_text "$GATE" "OPS-8 field evidence and reliability program is complete"
require_text "$GATE" "OPS-9 operational support, incident, and vulnerability process is complete"
require_text "$GATE" "OPS-10 stable macOS v1.0 release gate is complete"
require_text "$GATE" "Signing and notarization reduce macOS install friction"
require_text "$GATE" "not a security trust boundary"
require_text "$GATE" "do not replace same-release checksum verification"

for file in "$README" "$SECURITY" "$FINAL_REPORT"; do
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "audited secure messenger"
  reject_text "$file" "production-ready public beta"
  reject_text "$file" "reliable external onion delivery product"
  reject_text "$file" "Briar/Cwtch-equivalent claim"
  reject_text "$file" "censorship-resistant messenger"
done

scripts/production_claim_release_class_decision_once.sh >/dev/null

printf 'status=production-claim-policy-ready\n'
printf 'rb_8_production_claim_release_class_decision_reviewed=true\n'
printf 'stable_release_candidate_gate_decision=lower-release-class-only\n'
printf 'next_release_class=signed-public-beta-or-rc\n'
printf 'production_ready_claim_allowed=false\n'
printf 'r100_1_production_claim_gate_decision_closed=true\n'
printf 'production_claim_gate_passed=false\n'
printf 'beta_wording_removal_allowed=false\n'
printf 'audited_claim_allowed=false\n'
printf 'sensitive_communication_allowed=false\n'
printf 'reliable_external_delivery_claim_allowed=false\n'
printf 'signed_notarized_security_boundary=false\n'
printf 'd100_1_e2ee_source_gate_reviewed=true\n'
printf 'protocol_session_e2ee_source_ready=true\n'
printf 'd100_2_key_management_source_gate_reviewed=true\n'
printf 'production_key_management_source_ready=true\n'
printf 'next_required_phase=RB-9-github-stable-release-publication\n'

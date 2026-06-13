#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="$ROOT_DIR/reference/PRODUCTION_READINESS_CLAIM_GATE.md"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
FINAL_REPORT="$ROOT_DIR/reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md"

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

for file in "$GATE" "$README" "$SECURITY" "$FINAL_REPORT"; do
  require_file "$file"
done

for file in "$README" "$SECURITY" "$FINAL_REPORT"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
done

require_text "$README" "reference/PRODUCTION_READINESS_CLAIM_GATE.md"
require_text "$README" "Signing and notarization are"
require_text "$SECURITY" "reference/PRODUCTION_READINESS_CLAIM_GATE.md"
require_text "$SECURITY" "distribution ergonomics, not a messenger security"
require_text "$FINAL_REPORT" "Phase OPS-1 - Production Readiness Definition And Claim Gate"

require_text "$GATE" "Status: not satisfied"
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
require_text "$GATE" "beta_wording_removal_allowed=false"
require_text "$GATE" "audited_claim_allowed=false"
require_text "$GATE" "sensitive_communication_allowed=false"
require_text "$GATE" "reliable_external_delivery_claim_allowed=false"
require_text "$GATE" "next_required_phase=OPS-2 production E2EE protocol and session lifecycle hardening"
require_text "$GATE" "OPS-2 production E2EE protocol/session lifecycle hardening is complete"
require_text "$GATE" "OPS-3 production key management and local storage lifecycle is complete"
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
  reject_text "$file" "reliable external onion delivery"
  reject_text "$file" "Briar/Cwtch-equivalent claim"
  reject_text "$file" "censorship-resistant messenger"
done

printf 'status=production-claim-policy-ready\n'
printf 'production_ready_claim_allowed=false\n'
printf 'beta_wording_removal_allowed=false\n'
printf 'audited_claim_allowed=false\n'
printf 'sensitive_communication_allowed=false\n'
printf 'reliable_external_delivery_claim_allowed=false\n'
printf 'signed_notarized_security_boundary=false\n'
printf 'next_required_phase=OPS-2-production-e2ee-protocol-session-lifecycle-hardening\n'

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOUNDARY="$ROOT_DIR/reference/WINDOWS_CODE_SIGNING_REPUTATION_BOUNDARY.md"
CANDIDATE_GATE="$ROOT_DIR/reference/WINDOWS_PUBLIC_ARTIFACT_CANDIDATE_GATE.md"
PREFLIGHT="$ROOT_DIR/scripts/public_release_readiness_preflight.sh"

fail() {
  echo "FAIL windows code signing reputation boundary: $*" >&2
  exit 1
}

require_text() {
  local file="$1"
  local text="$2"
  grep -Fq -- "$text" "$file" || fail "missing text in $file: $text"
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    fail "forbidden text in $file: $text"
  fi
}

for file in "$BOUNDARY" "$CANDIDATE_GATE" "$PREFLIGHT"; do
  [ -f "$file" ] || fail "missing file: $file"
done

require_text "$BOUNDARY" "windows_code_signing_reputation_boundary=true"
require_text "$BOUNDARY" "signtool_signature_result_required=true"
require_text "$BOUNDARY" "certificate_thumbprint_record_required=true"
require_text "$BOUNDARY" "timestamp_authority_record_required=true"
require_text "$BOUNDARY" "smart_screen_reputation_observation_required=true"
require_text "$BOUNDARY" "microsoft_store_reputation_observation_required=true"
require_text "$BOUNDARY" "signed_artifact_manifest_binding_required=true"
require_text "$BOUNDARY" "signed_artifact_runtime_result_binding_required=true"
require_text "$BOUNDARY" "windows_signing_ready=false"
require_text "$BOUNDARY" "smartscreen_security_boundary_claimed=false"
require_text "$BOUNDARY" "code_signing_security_boundary_claimed=false"
require_text "$BOUNDARY" "store_reputation_security_boundary_claimed=false"
require_text "$BOUNDARY" "signing_reputation_message_security_claim_allowed=false"
require_text "$BOUNDARY" "signing_reputation_high_risk_claim_allowed=false"

require_text "$CANDIDATE_GATE" "code signing are distribution or integrity aids only"
require_text "$CANDIDATE_GATE" "code_signing_security_boundary_claimed=false"
require_text "$CANDIDATE_GATE" "store_reputation_security_boundary_claimed=false"
require_text "$PREFLIGHT" "windows_signing_ready=false"
require_text "$PREFLIGHT" "windows_installer_signing_store_claim_allowed=false"

for file in "$BOUNDARY" "$CANDIDATE_GATE" "$PREFLIGHT"; do
  reject_text "$file" "windows_signing_ready=true"
  reject_text "$file" "smartscreen_security_boundary_claimed=true"
  reject_text "$file" "code_signing_security_boundary_claimed=true"
  reject_text "$file" "store_reputation_security_boundary_claimed=true"
  reject_text "$file" "signing_reputation_message_security_claim_allowed=true"
  reject_text "$file" "signing_reputation_high_risk_claim_allowed=true"
done

cat <<'EOF'
windows_code_signing_reputation_boundary=source-ready
signtool_signature_result_required=true
certificate_thumbprint_record_required=true
timestamp_authority_record_required=true
smart_screen_reputation_observation_required=true
microsoft_store_reputation_observation_required=true
signed_artifact_manifest_binding_required=true
signed_artifact_runtime_result_binding_required=true
windows_signing_ready=false
smartscreen_security_boundary_claimed=false
code_signing_security_boundary_claimed=false
store_reputation_security_boundary_claimed=false
signing_reputation_message_security_claim_allowed=false
signing_reputation_high_risk_claim_allowed=false
EOF

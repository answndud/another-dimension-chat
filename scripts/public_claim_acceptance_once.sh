#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing public claim file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq "$text" "$file"; then
    echo "FAIL missing public claim text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq "$text" "$file"; then
    echo "FAIL forbidden public claim text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_CLAIM_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md"
  "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md"
  "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
  "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
  "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md"
  "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md"
)

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  require_file "$file"
done

require_text "$ROOT_DIR/README.md" "This project does not currently provide a secure messenger."
require_text "$ROOT_DIR/SECURITY.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not a secure messenger release"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not a secure messenger release"

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_INSTALL.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md" "$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"; do
  require_file "$file"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
done

require_text "$ROOT_DIR/README.md" "The beta does not claim Briar/Cwtch equivalence"
require_text "$ROOT_DIR/SECURITY.md" "Briar/Cwtch-equivalent privacy or security level"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "Briar/Cwtch-equivalent."
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "gap map, not a"
require_text "$ROOT_DIR/reference/PRIVACY_MODEL_COMPARISON.md" "not audited, not production-ready, and sensitive communication prohibited"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "not an external review result"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Public Claims Not Allowed Today"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "Suggested Public-Safe Review Commands"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "practical transport split"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "manual GitHub Release download"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md" "workflow state"
require_text "$ROOT_DIR/reference/REPOSITORY_GOVERNANCE.md" 'Private planning notes stay in ignored `docs/`.'
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "not a secure messenger release today"
require_text "$ROOT_DIR/reference/COMPONENT_BOUNDARIES.md" "Release and updates"
require_text "$ROOT_DIR/README.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/SECURITY.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "COMPONENT_BOUNDARIES.md"
require_text "$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md" "public support diagnostics"
require_text "$ROOT_DIR/reference/PUBLIC_THREAT_MODEL.md" "public support diagnostics"

if git -C "$ROOT_DIR" ls-files docs | grep -q .; then
  echo "FAIL private docs are tracked in git" >&2
  git -C "$ROOT_DIR" ls-files docs >&2
  exit 1
fi

for file in "${PUBLIC_CLAIM_FILES[@]}"; do
  reject_text "$file" "production-ready secure messenger"
  reject_text "$file" "Briar/Cwtch-equivalent privacy or security level achieved"
  reject_text "$file" "independent review complete=true"
  reject_text "$file" "security_ready_claim=true"
done

bash -n "$ROOT_DIR/scripts/prepare_unsigned_public_beta_release.sh"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/final_acceptance_once.sh"

echo "status=public-claim-audit-readiness-ready"

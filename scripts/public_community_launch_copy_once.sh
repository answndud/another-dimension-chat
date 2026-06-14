#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL public community launch copy: $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_text() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$file" || fail "missing text in $file: $expected"
}

reject_text() {
  local file="$1"
  local forbidden="$2"
  if grep -Fq -- "$forbidden" "$file"; then
    fail "forbidden positive claim in $file: $forbidden"
  fi
}

COPY="$ROOT_DIR/reference/PUBLIC_COMMUNITY_LAUNCH_COPY.md"
CROSS_PLATFORM="$ROOT_DIR/reference/CROSS_PLATFORM_UNSIGNED_PUBLIC_BETA_PACKET.md"
RELEASE_BODY="$ROOT_DIR/reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md"
PUBLIC_SCANNER="$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh"

for file in "$COPY" "$CROSS_PLATFORM" "$RELEASE_BODY" "$PUBLIC_SCANNER"; do
  require_file "$file"
done

require_text "$COPY" "accountless 1:1 private messenger unsigned public"
require_text "$COPY" "pairwise invites"
require_text "$COPY" "mandatory safety"
require_text "$COPY" "manual encrypted envelope exchange"
require_text "$COPY" "local data ownership"
require_text "$COPY" "redacted diagnostics"
require_text "$COPY" "unsigned macOS DMG from GitHub"
require_text "$COPY" "Windows is source-gated only and not yet published"
require_text "$COPY" "Not audited, not production-ready, sensitive communication prohibited"
require_text "$COPY" "not High-Risk-ready"
require_text "$COPY" "not a Signal/Briar/Cwtch-equivalent privacy or security"
require_text "$COPY" "release_class=unsigned-oss-public-beta"
require_text "$COPY" "macos_unsigned_public_beta_ready=true"
require_text "$COPY" "windows_public_artifact_ready=false"
require_text "$COPY" "windows_public_artifact_claim_allowed=false"
require_text "$COPY" "windows_installer_claim_allowed=false"
require_text "$COPY" "windows_upload_claim_allowed=false"
require_text "$COPY" "production_ready_claim_allowed=false"
require_text "$COPY" "audited_claim_allowed=false"
require_text "$COPY" "sensitive_use_claim_allowed=false"
require_text "$COPY" "high_risk_public_claim_allowed=false"
require_text "$COPY" "high_risk_ready_claim_allowed=false"
require_text "$COPY" "external_delivery_claim=false"
require_text "$COPY" "security_ready_claim=false"
require_text "$COPY" "scripts/public_community_launch_copy_once.sh"

require_text "$CROSS_PLATFORM" "Allowed short public copy"
require_text "$CROSS_PLATFORM" "Required disclaimer"
require_text "$CROSS_PLATFORM" "windows_public_artifact_claim_allowed=false"
require_text "$CROSS_PLATFORM" "high_risk_ready_claim_allowed=false"
require_text "$RELEASE_BODY" "external_delivery_claim=false"
require_text "$RELEASE_BODY" "security_ready_claim=false"
require_text "$RELEASE_BODY" "high_risk_public_claim_allowed=false"
require_text "$RELEASE_BODY" "high_risk_ready_claim_allowed=false"

for file in "$COPY" "$CROSS_PLATFORM" "$RELEASE_BODY"; do
  reject_text "$file" "production-ready secure messenger"
  reject_text "$file" "audited secure messenger"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "high-risk ready"
  reject_text "$file" "Signal/Briar/Cwtch equivalent"
  reject_text "$file" "windows_public_artifact_ready=true"
  reject_text "$file" "windows_public_artifact_claim_allowed=true"
  reject_text "$file" "high_risk_ready_claim_allowed=true"
  reject_text "$file" "production_ready_claim_allowed=true"
  reject_text "$file" "audited_claim_allowed=true"
  reject_text "$file" "sensitive_use_claim_allowed=true"
done

scanner_output="$("$PUBLIC_SCANNER")"
printf '%s\n' "$scanner_output" | grep -Fq -- "forbidden_positive_claims_found=false" ||
  fail "public forbidden claim scanner did not pass"

cat <<'STATUS'
public_community_launch_copy=ready
release_class=unsigned-oss-public-beta
macos_unsigned_public_beta_ready=true
windows_public_artifact_ready=false
windows_public_artifact_claim_allowed=false
windows_installer_claim_allowed=false
windows_upload_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_use_claim_allowed=false
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
external_delivery_claim=false
security_ready_claim=false
generated_release_artifacts_commit_allowed=false
STATUS

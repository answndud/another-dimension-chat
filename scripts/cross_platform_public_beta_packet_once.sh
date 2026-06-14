#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL cross-platform public beta packet: $*" >&2
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
    fail "forbidden text in $file: $forbidden"
  fi
}

require_output() {
  local output="$1"
  local expected="$2"
  printf '%s\n' "$output" | grep -Fq -- "$expected" ||
    fail "missing output: $expected"
}

run_and_capture() {
  local script="$1"
  require_file "$script"
  bash -n "$script"
  "$script"
}

require_ignored_path() {
  git -C "$ROOT_DIR" check-ignore -q "$1" || fail "path is not ignored: $1"
}

require_no_tracked_generated_release_outputs() {
  if git -C "$ROOT_DIR" ls-files apps/desktop-tauri/public-release apps/desktop-tauri/beta-artifacts | grep -q .; then
    fail "generated public-release or beta-artifacts file is tracked"
  fi
}

REFERENCE="$ROOT_DIR/reference/CROSS_PLATFORM_UNSIGNED_PUBLIC_BETA_PACKET.md"
MACOS_REFERENCE="$ROOT_DIR/reference/MACOS_UNSIGNED_OSS_PUBLIC_RELEASE_PACKET.md"
WINDOWS_EXECUTION="$ROOT_DIR/reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
WINDOWS_MANIFEST="$ROOT_DIR/reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
WINDOWS_RESULT="$ROOT_DIR/reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"
HIGH_RISK_RUNTIME_SCHEMA="$ROOT_DIR/reference/HIGH_RISK_RUNTIME_EVIDENCE_SCHEMA.md"
HIGH_RISK_RUNTIME_VALIDATOR="$ROOT_DIR/scripts/high_risk_runtime_evidence_validate_once.sh"
COMMUNITY_COPY="$ROOT_DIR/reference/PUBLIC_COMMUNITY_LAUNCH_COPY.md"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"

for file in "$REFERENCE" "$MACOS_REFERENCE" "$WINDOWS_EXECUTION" "$WINDOWS_MANIFEST" "$WINDOWS_RESULT" "$HIGH_RISK_RUNTIME_SCHEMA" "$HIGH_RISK_RUNTIME_VALIDATOR" "$COMMUNITY_COPY" "$README" "$SECURITY"; do
  require_file "$file"
done

require_text "$REFERENCE" "source-ready for cross-platform public beta/RC copy"
require_text "$REFERENCE" "macOS Apple Silicon: unsigned OSS public beta DMG"
require_text "$REFERENCE" "Windows: public artifact candidate path is source-defined"
require_text "$REFERENCE" "no public artifact, installer, signing, upload, or production claim"
require_text "$REFERENCE" "real_windows_runtime_result_present=false"
require_text "$REFERENCE" "windows_runtime_result_packet_required_for_public_artifact=true"
require_text "$REFERENCE" "windows_manifest_checksum_provenance_separate_from_runtime_result=true"
require_text "$REFERENCE" "windows_public_artifact_claim_allowed=false"
require_text "$REFERENCE" "windows_installer_claim_allowed=false"
require_text "$REFERENCE" "windows_upload_claim_allowed=false"
require_text "$REFERENCE" "Use only assets attached to the same GitHub Release"
require_text "$REFERENCE" "explicit owner actions only"
require_text "$REFERENCE" "Not audited, not production-ready, not for sensitive communication"
require_text "$REFERENCE" "not High-Risk-ready"
require_text "$REFERENCE" "reference/PUBLIC_COMMUNITY_LAUNCH_COPY.md"
require_text "$REFERENCE" "scripts/public_community_launch_copy_once.sh"
require_text "$REFERENCE" "High-Risk runtime evidence validator is a redacted evidence-format gate"
require_text "$REFERENCE" "high_risk_public_claim_allowed=false"
require_text "$REFERENCE" "high_risk_ready_claim_allowed=false"
require_text "$REFERENCE" "compromised endpoint"
require_text "$REFERENCE" "direct coercion"
require_text "$REFERENCE" "full global traffic correlation"
require_text "$REFERENCE" "scripts/cross_platform_public_beta_packet_once.sh"
require_text "$COMMUNITY_COPY" "accountless 1:1 private messenger unsigned public"
require_text "$COMMUNITY_COPY" "manual encrypted envelope exchange"
require_text "$COMMUNITY_COPY" "windows_public_artifact_claim_allowed=false"
require_text "$COMMUNITY_COPY" "high_risk_ready_claim_allowed=false"
require_text "$HIGH_RISK_RUNTIME_SCHEMA" "high_risk_public_claim_allowed=false"
require_text "$HIGH_RISK_RUNTIME_SCHEMA" "high_risk_ready_claim_allowed=false"
require_text "$HIGH_RISK_RUNTIME_VALIDATOR" "high_risk_public_claim_allowed=false"
require_text "$HIGH_RISK_RUNTIME_VALIDATOR" "high_risk_ready_claim_allowed=false"

require_text "$MACOS_REFERENCE" "unsigned OSS public beta"
require_text "$MACOS_REFERENCE" "not signed, not notarized, not audited"
require_text "$MACOS_REFERENCE" "Do not disable Gatekeeper globally"
require_text "$WINDOWS_EXECUTION" "windows_public_artifact_ready=false"
require_text "$WINDOWS_EXECUTION" "real_windows_runtime_result_present=false"
require_text "$WINDOWS_EXECUTION" "windows_runtime_result_packet_required_for_public_artifact=true"
require_text "$WINDOWS_EXECUTION" "windows_manifest_checksum_provenance_separate_from_runtime_result=true"
require_text "$WINDOWS_EXECUTION" "windows_public_artifact_claim_allowed=false"
require_text "$WINDOWS_EXECUTION" "windows_installer_claim_allowed=false"
require_text "$WINDOWS_EXECUTION" "windows_upload_claim_allowed=false"
require_text "$WINDOWS_EXECUTION" "windows_result_runtime_boundary_verified=true"
require_text "$WINDOWS_MANIFEST" "windows_artifact_manifest_sha_sidecar_verified_by_validator=true"
require_text "$WINDOWS_RESULT" "windows_result_requires_real_windows_machine=true"
require_text "$SECURITY" "Public launch copy may describe the implemented app as accountless 1:1 private"
require_text "$SECURITY" "High-Risk Mode copy may mention its defined threat model"

for file in "$REFERENCE" "$README" "$SECURITY"; do
  reject_text "$file" "production-ready secure messenger"
  reject_text "$file" "audited secure messenger"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "high-risk ready"
  reject_text "$file" "Signal/Briar/Cwtch equivalent"
done

require_ignored_path "$ROOT_DIR/docs/"
require_ignored_path "$ROOT_DIR/apps/desktop-tauri/public-release/"
require_ignored_path "$ROOT_DIR/apps/desktop-tauri/beta-artifacts/"
require_no_tracked_generated_release_outputs

macos_output="$(run_and_capture "$ROOT_DIR/scripts/macos_unsigned_public_release_packet_once.sh")"
require_output "$macos_output" "macos_unsigned_public_release_packet=ready"
require_output "$macos_output" "release_class=unsigned-oss-public-beta"
require_output "$macos_output" "release_upload_authorized=false"
require_output "$macos_output" "production_ready_claim_allowed=false"
require_output "$macos_output" "high_risk_runtime_evidence_validator_ready=true"
require_output "$macos_output" "high_risk_runtime_evidence_claim_separated=true"
require_output "$macos_output" "high_risk_public_claim_allowed=false"
require_output "$macos_output" "high_risk_ready_claim_allowed=false"

windows_manifest_output="$(run_and_capture "$ROOT_DIR/scripts/windows_artifact_manifest_checksum_once.sh")"
require_output "$windows_manifest_output" "windows_artifact_manifest_checksum_schema_available=true"
require_output "$windows_manifest_output" "windows_artifact_manifest_sha_sidecar_verified_by_validator=true"
require_output "$windows_manifest_output" "windows_public_artifact_ready=false"
require_output "$windows_manifest_output" "windows_public_artifact_upload_allowed=false"

windows_runtime_output="$(run_and_capture "$ROOT_DIR/scripts/windows_artifact_runtime_evidence_contract_once.sh")"
require_output "$windows_runtime_output" "status=windows-artifact-runtime-evidence-contract-ready"
require_output "$windows_runtime_output" "real_windows_runtime_result_present=false"
require_output "$windows_runtime_output" "windows_runtime_result_packet_required_for_public_artifact=true"
require_output "$windows_runtime_output" "windows_manifest_checksum_provenance_separate_from_runtime_result=true"
require_output "$windows_runtime_output" "windows_non_windows_runtime_result_promoted=false"
require_output "$windows_runtime_output" "windows_local_or_fabricated_runtime_result_promoted=false"
require_output "$windows_runtime_output" "windows_result_requires_real_windows_machine=true"
require_output "$windows_runtime_output" "windows_public_artifact_ready=false"
require_output "$windows_runtime_output" "windows_public_artifact_claim_allowed=false"
require_output "$windows_runtime_output" "windows_installer_claim_allowed=false"
require_output "$windows_runtime_output" "windows_upload_claim_allowed=false"

windows_execution_output="$(run_and_capture "$ROOT_DIR/scripts/windows_public_artifact_execution_path_once.sh")"
require_output "$windows_execution_output" "real_windows_runtime_result_present=false"
require_output "$windows_execution_output" "windows_runtime_result_packet_required_for_public_artifact=true"
require_output "$windows_execution_output" "windows_manifest_checksum_provenance_separate_from_runtime_result=true"
require_output "$windows_execution_output" "windows_result_artifact_identity_verified=true"
require_output "$windows_execution_output" "windows_result_runtime_boundary_verified=true"
require_output "$windows_execution_output" "windows_non_windows_runtime_result_promoted=false"
require_output "$windows_execution_output" "windows_local_or_fabricated_runtime_result_promoted=false"
require_output "$windows_execution_output" "windows_real_runtime_smoke_passed=false"
require_output "$windows_execution_output" "windows_public_artifact_ready=false"
require_output "$windows_execution_output" "windows_public_artifact_upload_allowed=false"
require_output "$windows_execution_output" "windows_public_artifact_claim_allowed=false"
require_output "$windows_execution_output" "windows_installer_claim_allowed=false"
require_output "$windows_execution_output" "windows_upload_claim_allowed=false"

public_claim_output="$(run_and_capture "$ROOT_DIR/scripts/public_forbidden_claim_scanner_once.sh")"
require_output "$public_claim_output" "forbidden_positive_claims_found=false"
require_output "$public_claim_output" "stable_candidate_claim_allowed=false"
require_output "$public_claim_output" "high_risk_runtime_evidence_validator_ready=true"
require_output "$public_claim_output" "high_risk_runtime_evidence_claim_separated=true"
require_output "$public_claim_output" "high_risk_public_claim_allowed=false"
require_output "$public_claim_output" "high_risk_ready_claim_allowed=false"

community_copy_output="$(run_and_capture "$ROOT_DIR/scripts/public_community_launch_copy_once.sh")"
require_output "$community_copy_output" "public_community_launch_copy=ready"
require_output "$community_copy_output" "release_class=unsigned-oss-public-beta"
require_output "$community_copy_output" "windows_public_artifact_claim_allowed=false"
require_output "$community_copy_output" "high_risk_ready_claim_allowed=false"

cat <<'STATUS'
cross_platform_public_beta_packet=source-ready
public_community_launch_copy=ready
release_class=unsigned-oss-public-beta
macos_unsigned_public_beta_ready=true
macos_release_upload_authorized=false
windows_public_artifact_candidate_source_ready=true
real_windows_runtime_result_present=false
windows_runtime_result_packet_required_for_public_artifact=true
windows_manifest_checksum_provenance_separate_from_runtime_result=true
windows_non_windows_runtime_result_promoted=false
windows_local_or_fabricated_runtime_result_promoted=false
windows_public_artifact_ready=false
windows_public_artifact_upload_allowed=false
windows_public_artifact_claim_allowed=false
windows_installer_claim_allowed=false
windows_upload_claim_allowed=false
same_github_release_asset_authority_required=true
generated_release_artifacts_commit_allowed=false
production_ready_claim_allowed=false
high_risk_runtime_evidence_validator_ready=true
high_risk_runtime_evidence_claim_separated=true
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
STATUS

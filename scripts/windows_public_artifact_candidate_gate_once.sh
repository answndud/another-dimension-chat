#!/usr/bin/env bash
set -euo pipefail

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
    fail "$file contains forbidden Windows public artifact candidate pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CORE="crates/core/src/lib.rs"
STATE="apps/desktop-tauri/src/action-state.js"
STATE_TEST="apps/desktop-tauri/src/action-state.test.js"
SMOKE_TEST="apps/desktop-tauri/src/ui-smoke.test.js"
REFERENCE="reference/WINDOWS_PUBLIC_ARTIFACT_CANDIDATE_GATE.md"
MANIFEST_SCHEMA="reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
RUNTIME_SCHEMA="reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"

for file in "$CORE" "$STATE" "$STATE_TEST" "$SMOKE_TEST" "$REFERENCE" "$MANIFEST_SCHEMA" "$RUNTIME_SCHEMA"; do
  [ -f "$file" ] || fail "missing Windows public artifact candidate gate input: $file"
done

for file in "$CORE" "$STATE" "$REFERENCE"; do
  must_contain "$file" "windows-nsis-exe-installer-candidate"
  must_contain "$file" "webview2_runtime_required"
  must_contain "$file" "app_data_resolver_shared_storage_semantics"
  must_contain "$file" "manifest_checksum_provenance_required"
  must_contain "$file" "runtime_result_external_peer_evidence_separated"
  must_contain "$file" "smartscreen_security_boundary_claimed"
  must_contain "$file" "windows_public_artifact_ready"
  must_contain "$file" "windows_production_claim_allowed"
done

must_contain "$CORE" "production_windows_public_artifact_candidate_summary"
must_contain "$CORE" "PRODUCTION_WINDOWS_PUBLIC_ARTIFACT_REQUIRED_FIELDS"
must_contain "$CORE" "PRODUCTION_WINDOWS_PUBLIC_ARTIFACT_FORBIDDEN_CLAIMS"
must_contain "$CORE" "windows_public_artifact_candidate_keeps_claims_false_and_shared_core_bound"

must_contain "$STATE" "productionWindowsPublicArtifactCandidateView"
must_contain "$STATE_TEST" "windows public artifact candidate keeps installer and security claims false"
must_contain "$SMOKE_TEST" "productionWindowsPublicArtifactCandidateView"

must_contain "$REFERENCE" "windows_public_artifact_candidate=true"
must_contain "$REFERENCE" "bundle_target=nsis"
must_contain "$REFERENCE" "default_extension=.exe"
must_contain "$REFERENCE" "portable_default_allowed=false"
must_contain "$REFERENCE" "msi_alternative_allowed=true"
must_contain "$REFERENCE" "webview2_failure_class_redacted=true"
must_contain "$REFERENCE" "raw_local_path_returned=false"
must_contain "$REFERENCE" "shared_core_bypass_allowed=false"
must_contain "$REFERENCE" "local_runtime_promoted_to_delivery_proof=false"
must_contain "$REFERENCE" "smartscreen_security_boundary_claimed=false"
must_contain "$REFERENCE" "code_signing_security_boundary_claimed=false"
must_contain "$REFERENCE" "store_reputation_security_boundary_claimed=false"
must_contain "$REFERENCE" "auto_update_claimed=false"
must_contain "$REFERENCE" "windows_public_artifact_upload_allowed=false"
must_contain "$REFERENCE" "windows_production_claim_allowed=false"

for file in "$STATE" "$REFERENCE"; do
  must_not_match "$file" "windows_public_artifact_ready[=:] ?true"
  must_not_match "$file" "windows_installer_ready[=:] ?true"
  must_not_match "$file" "windows_signing_ready[=:] ?true"
  must_not_match "$file" "windows_public_artifact_upload_allowed[=:] ?true"
  must_not_match "$file" "windows_production_claim_allowed[=:] ?true"
  must_not_match "$file" "smartscreen_security_boundary_claimed[=:] ?true"
  must_not_match "$file" "local_runtime_promoted_to_delivery_proof[=:] ?true"
  must_not_match "$file" "shared_core_bypass_allowed[=:] ?true"
done

echo "status=windows-public-artifact-candidate-gate-ready"
echo "windows_public_artifact_candidate=true"
echo "artifact_type=windows-nsis-exe-installer-candidate"
echo "bundle_target=nsis"
echo "webview2_runtime_required=true"
echo "app_data_resolver_shared_storage_semantics=true"
echo "manifest_checksum_provenance_required=true"
echo "runtime_result_external_peer_evidence_separated=true"
echo "windows_public_artifact_ready=false"
echo "windows_production_claim_allowed=false"

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

must_reference_public_gate() {
  local file="$1"
  local needle="$2"
  if grep -Fq "$needle" "$file"; then
    return
  fi
  if [ "$file" = "README.md" ] &&
    grep -Fq "SECURITY.md" "$file" &&
    grep -Fq "$needle" "SECURITY.md"; then
    return
  fi
  fail "$file missing public-reachable reference: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden Windows public artifact pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
SCHEMA="reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"
VALIDATOR="scripts/validate_windows_public_artifact_results.mjs"
MANIFEST_SCHEMA="reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
MANIFEST_VALIDATOR="scripts/validate_windows_artifact_manifest.mjs"
MANIFEST_GENERATOR="scripts/prepare_windows_public_artifact_metadata.sh"
MANIFEST_VERIFIER="scripts/windows_artifact_manifest_checksum_once.sh"
SCOPE_DOWN="reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md"
PARITY="apps/desktop-tauri/windows_desktop_parity_intake.json"
HANDOFF="apps/desktop-tauri/windows_local_runtime_smoke_handoff.json"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
GAP_REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
CROSS_PLATFORM="reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md"

for file in "$DOC" "$SCHEMA" "$VALIDATOR" "$MANIFEST_SCHEMA" "$MANIFEST_VALIDATOR" \
  "$MANIFEST_GENERATOR" "$MANIFEST_VERIFIER" "$SCOPE_DOWN" "$PARITY" "$HANDOFF" \
  "$MATRIX" "$GAP_REGISTER" "$CROSS_PLATFORM" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing D100-5 Windows artifact input: $file"
done

for flag in \
  "d100_5_windows_public_artifact_execution_path_reviewed=true" \
  "windows_public_artifact_execution_path_available=true" \
  "windows_real_runtime_result_schema_available=true" \
  "windows_real_runtime_result_validator_available=true" \
  "windows_artifact_manifest_checksum_schema_available=true" \
  "windows_artifact_manifest_checksum_validator_available=true" \
  "windows_artifact_metadata_generator_ready=true" \
  "windows_artifact_manifest_checksum_verifier_ready=true" \
  "real_windows_runtime_smoke_requirements_defined=true" \
  "windows_installer_signing_decision_recorded=true" \
  "windows_checksum_provenance_requirements_defined=true" \
  "windows_public_copy_requirements_defined=true" \
  "windows_support_diagnostics_requirements_defined=true" \
  "windows_no_overclaim_gate_ready=true" \
  "windows_result_requires_real_windows_machine=true" \
  "windows_result_requires_checksum_provenance=true" \
  "windows_artifact_requires_same_release_authority=true" \
  "windows_artifact_checksum_bytes_verified_by_validator=true" \
  "windows_artifact_provenance_consistency_verified_by_validator=true" \
  "windows_result_requires_support_diagnostics_review=true" \
  "windows_result_requires_public_non_claims=true" \
  "windows_result_rejects_local_only_or_private_data=true" \
  "windows_public_artifact_candidate_requires_manual_review=true" \
  "windows_real_runtime_smoke_passed=false" \
  "windows_public_artifact_ready=false" \
  "windows_installer_ready=false" \
  "windows_signing_ready=false" \
  "windows_artifact_release_upload_authorized=false" \
  "windows_artifact_release_body_edit_authorized=false" \
  "windows_public_artifact_upload_allowed=false" \
  "windows_release_packaging_allowed=false" \
  "windows_generated_artifact_commit_allowed=false" \
  "windows_public_copy_published=false" \
  "windows_production_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

for file in "$SCHEMA" "$SCOPE_DOWN" "$MATRIX" "$GAP_REGISTER" "$CROSS_PLATFORM" \
  "README.md" "SECURITY.md"; do
  if [ "$file" = "README.md" ]; then
    must_reference_public_gate "$file" "WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
  else
    must_contain "$file" "WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
  fi
done

for file in "$DOC" "$SCOPE_DOWN" "$MATRIX" "$GAP_REGISTER" "$CROSS_PLATFORM" \
  "README.md" "SECURITY.md"; do
  if [ "$file" = "README.md" ]; then
    must_reference_public_gate "$file" "WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"
  else
    must_contain "$file" "WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"
  fi
done

must_contain "$SCHEMA" "windows_real_runtime_result_schema_available=true"
must_contain "$SCHEMA" "WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
must_contain "$SCHEMA" "windows_public_artifact_ready=false"
must_contain "$VALIDATOR" "status=windows-public-artifact-candidate-requires-review"
must_contain "$MANIFEST_SCHEMA" "windows_artifact_manifest_checksum_schema_available=true"
must_contain "$MANIFEST_VALIDATOR" "windows-public-artifact-manifest-v1"
must_contain "$MANIFEST_GENERATOR" "AD_PREPARE_WINDOWS_PUBLIC_ARTIFACT_METADATA"
must_contain "$PARITY" '"windows_public_artifact_ready": false'
must_contain "$HANDOFF" '"must_run_on": "real-windows-machine"'

for file in "$DOC" "$SCHEMA" "$SCOPE_DOWN" "$MATRIX" "$GAP_REGISTER" "$CROSS_PLATFORM" \
  "README.md" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_not_match "$file" "windows_real_runtime_smoke_passed[=:] ?true"
  must_not_match "$file" "windows_public_artifact_ready[=:] ?true"
  must_not_match "$file" "windows_installer_ready[=:] ?true"
  must_not_match "$file" "windows_signing_ready[=:] ?true"
  must_not_match "$file" "windows_public_artifact_upload_allowed[=:] ?true"
  must_not_match "$file" "windows_release_packaging_allowed[=:] ?true"
  must_not_match "$file" "windows_generated_artifact_commit_allowed[=:] ?true"
  must_not_match "$file" "windows_public_copy_published[=:] ?true"
  must_not_match "$file" "windows_production_claim_allowed[=:] ?true"
done

empty_output="$(node "$VALIDATOR" "$ROOT/docs/windows-public-artifact-results")"
printf '%s\n' "$empty_output" | grep -Fq "results_found=0" || fail "empty validator run did not report zero results"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-real-windows-public-artifact-results" || fail "empty validator did not wait for real Windows results"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cat >"$tmp_dir/win-valid.md" <<'RESULT'
schema_version=windows-public-artifact-result-v1
result_id=WIN-0001
run_host=real-windows-machine
platform=windows
windows_version=Windows 11 23H2 redacted
architecture=x64
artifact_kind=tauri-bundle
artifact_path_redacted=true
artifact_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
artifact_provenance_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
artifact_manifest_sha256=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
source_commit=abcdef1234567890
webview2_rendered=pass
app_data_root_redacted=pass
path_separator_behavior=pass
encrypted_store_profile_unlock=pass
local_deletion_behavior=pass
redacted_diagnostics_only=pass
explicit_user_action_before_network=pass
local_manual_envelope_default_path=pass
auto_update_channel_absent=pass
public_non_claims_visible=pass
installer_signing_decision=unsigned-hold
smartscreen_reputation_claim=false
public_copy_reviewed=true
checksum_provenance_verified=true
support_diagnostics_reviewed=true
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload
RESULT

candidate_output="$(node "$VALIDATOR" "$tmp_dir/win-valid.md")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_windows_public_artifact_results=1" || fail "candidate validator did not accept valid result"
printf '%s\n' "$candidate_output" | grep -Fq "windows_public_artifact_ready=false" || fail "validator must not auto-open Windows artifact readiness"
printf '%s\n' "$candidate_output" | grep -Fq "status=windows-public-artifact-candidate-requires-review" || fail "candidate validator did not require review"

cat >"$tmp_dir/not-windows.md" <<'RESULT'
schema_version=windows-public-artifact-result-v1
result_id=WIN-0002
run_host=macos-local
platform=windows
windows_version=Windows 11 23H2 redacted
architecture=x64
artifact_kind=tauri-bundle
artifact_path_redacted=true
artifact_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
artifact_provenance_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
artifact_manifest_sha256=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
source_commit=abcdef1234567890
webview2_rendered=pass
app_data_root_redacted=pass
path_separator_behavior=pass
encrypted_store_profile_unlock=pass
local_deletion_behavior=pass
redacted_diagnostics_only=pass
explicit_user_action_before_network=pass
local_manual_envelope_default_path=pass
auto_update_channel_absent=pass
public_non_claims_visible=pass
installer_signing_decision=unsigned-hold
smartscreen_reputation_claim=false
public_copy_reviewed=true
checksum_provenance_verified=true
support_diagnostics_reviewed=true
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload
RESULT

if node "$VALIDATOR" "$tmp_dir/not-windows.md" >/tmp/windows-not-real.out 2>&1; then
  fail "validator accepted non-Windows host"
fi
grep -Fq "invalid-value:run_host" /tmp/windows-not-real.out || fail "non-Windows host rejection was not reported"

cat >"$tmp_dir/private-path.md" <<'RESULT'
schema_version=windows-public-artifact-result-v1
result_id=WIN-0003
run_host=real-windows-machine
platform=windows
windows_version=Windows 11 23H2 redacted
architecture=x64
artifact_kind=tauri-bundle
artifact_path_redacted=true
artifact_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
artifact_provenance_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
artifact_manifest_sha256=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
source_commit=abcdef1234567890
webview2_rendered=pass
app_data_root_redacted=pass
path_separator_behavior=pass
encrypted_store_profile_unlock=pass
local_deletion_behavior=pass
redacted_diagnostics_only=pass
explicit_user_action_before_network=pass
local_manual_envelope_default_path=pass
auto_update_channel_absent=pass
public_non_claims_visible=pass
installer_signing_decision=unsigned-hold
smartscreen_reputation_claim=false
public_copy_reviewed=true
checksum_provenance_verified=true
support_diagnostics_reviewed=true
non_claims_confirmed=unsigned-experimental-public-beta#sensitive-communication-prohibited#not-audited#not-production-ready#no-public-windows-artifact#no-windows-installer#no-public-artifact-upload
note=C:\Users\Alice\AppData\Local\AnotherDimension
RESULT

if node "$VALIDATOR" "$tmp_dir/private-path.md" >/tmp/windows-private-path.out 2>&1; then
  fail "validator accepted private Windows path"
fi
grep -Fq "forbidden-content:windows-local-path" /tmp/windows-private-path.out || fail "private Windows path rejection was not reported"

scripts/windows_artifact_manifest_checksum_once.sh >/dev/null

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=windows-public-artifact-execution-path-ready
d100_5_windows_public_artifact_execution_path_reviewed=true
windows_public_artifact_execution_path_available=true
windows_real_runtime_result_schema_available=true
windows_real_runtime_result_validator_available=true
windows_artifact_manifest_checksum_schema_available=true
windows_artifact_manifest_checksum_validator_available=true
windows_artifact_metadata_generator_ready=true
windows_artifact_manifest_checksum_verifier_ready=true
real_windows_runtime_smoke_requirements_defined=true
windows_installer_signing_decision_recorded=true
windows_checksum_provenance_requirements_defined=true
windows_public_copy_requirements_defined=true
windows_support_diagnostics_requirements_defined=true
windows_no_overclaim_gate_ready=true
windows_real_runtime_smoke_passed=false
windows_public_artifact_ready=false
windows_installer_ready=false
windows_signing_ready=false
windows_artifact_release_upload_authorized=false
windows_artifact_release_body_edit_authorized=false
windows_public_artifact_upload_allowed=false
windows_release_packaging_allowed=false
windows_generated_artifact_commit_allowed=false
windows_public_copy_published=false
windows_production_claim_allowed=false
next_required_phase=remaining-external-credentials-field-review-mobile-release-gates
STATUS

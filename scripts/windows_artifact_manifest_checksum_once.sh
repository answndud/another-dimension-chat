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
    fail "$file contains forbidden Windows artifact manifest pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
VALIDATOR="scripts/validate_windows_artifact_manifest.mjs"
GENERATOR="scripts/prepare_windows_public_artifact_metadata.sh"
EXECUTION="reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md"
SCHEMA="reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md"

for file in "$DOC" "$VALIDATOR" "$GENERATOR" "$EXECUTION" "$SCHEMA"; do
  [ -f "$file" ] || fail "missing Windows artifact manifest input: $file"
done

for flag in \
  "windows_artifact_manifest_checksum_schema_available=true" \
  "windows_artifact_manifest_checksum_validator_available=true" \
  "windows_artifact_metadata_generator_ready=true" \
  "windows_artifact_manifest_checksum_verifier_ready=true" \
  "windows_artifact_requires_same_release_authority=true" \
  "windows_artifact_checksum_bytes_verified_by_validator=true" \
  "windows_artifact_provenance_consistency_verified_by_validator=true" \
  "windows_artifact_provenance_field_consistency_verified_by_validator=true" \
  "windows_artifact_bundle_target_extension_bound=true" \
  "windows_artifact_release_upload_authorized=false" \
  "windows_artifact_release_body_edit_authorized=false" \
  "windows_public_artifact_ready=false" \
  "windows_installer_ready=false" \
  "windows_signing_ready=false" \
  "windows_public_artifact_upload_allowed=false" \
  "windows_generated_artifact_commit_allowed=false" \
  "windows_production_claim_allowed=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "windows-public-artifact-manifest-v1"
must_contain "$VALIDATOR" "windows-public-artifact-provenance-v1"
must_contain "$VALIDATOR" "windows_artifact_checksum_bytes_verified=true"
must_contain "$VALIDATOR" "provenance-signing-status-mismatch"
must_contain "$VALIDATOR" "bundle-target-extension-mismatch"
must_contain "$GENERATOR" "AD_PREPARE_WINDOWS_PUBLIC_ARTIFACT_METADATA"
must_contain "$GENERATOR" "AD_WINDOWS_ARTIFACT"
must_contain "$EXECUTION" "WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"
must_contain "$EXECUTION" "validate_windows_artifact_manifest.mjs"
must_contain "$SCHEMA" "WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md"

for file in "$DOC" "$EXECUTION" "$SCHEMA" README.md SECURITY.md; do
  [ -f "$file" ] || continue
  must_contain "$file" "not production-ready"
  must_not_match "$file" "windows_public_artifact_ready[=:] ?true"
  must_not_match "$file" "windows_installer_ready[=:] ?true"
  must_not_match "$file" "windows_signing_ready[=:] ?true"
  must_not_match "$file" "windows_public_artifact_upload_allowed[=:] ?true"
  must_not_match "$file" "windows_generated_artifact_commit_allowed[=:] ?true"
  must_not_match "$file" "windows_production_claim_allowed[=:] ?true"
done

node --check "$VALIDATOR" >/dev/null
bash -n "$GENERATOR"

empty_output="$(node "$VALIDATOR" "$ROOT/apps/desktop-tauri/public-release/windows-artifact-metadata")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-windows-artifact-manifest" ||
  fail "empty Windows artifact manifest validator did not wait"

held_output="$("$GENERATOR")"
printf '%s\n' "$held_output" | grep -Fq "status=windows-public-artifact-metadata-held" ||
  fail "Windows metadata generator did not hold without explicit execute flag"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
artifact="$tmp_dir/Another Dimension Chat_0.1.0_x64-setup.exe"
printf 'windows artifact fixture\n' >"$artifact"
artifact_sha="$(shasum -a 256 "$artifact" | awk '{print $1}')"
artifact_size="$(wc -c <"$artifact" | tr -d ' ')"
printf '%s  %s\n' "$artifact_sha" "$(basename "$artifact")" >"$tmp_dir/Another Dimension Chat_0.1.0_x64-setup.exe.sha256"
cat >"$tmp_dir/Another Dimension Chat_0.1.0_x64-setup.exe.provenance.json" <<JSON
{
  "schema_version": "windows-public-artifact-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "artifact_filename": "Another Dimension Chat_0.1.0_x64-setup.exe",
  "artifact_sha256": "$artifact_sha",
  "release_class": "unsigned-windows-beta",
  "bundle_target": "nsis",
  "signing_status": "unsigned-hold",
  "release_upload_authorized": false,
  "windows_public_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false
}
JSON
cat >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" <<JSON
{
  "schema_version": "windows-public-artifact-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
  "version": "0.1.0",
  "release_class": "unsigned-windows-beta",
  "same_release_asset_authority_required": true,
  "release_upload_authorized": false,
  "release_body_edit_authorized": false,
  "windows_public_artifact_ready": false,
  "windows_installer_ready": false,
  "generated_release_artifacts_commit_allowed": false,
  "public_non_claims": [
    "unsigned experimental public beta",
    "sensitive communication prohibited",
    "not audited",
    "not production-ready",
    "no public Windows artifact",
    "no Windows installer",
    "no public artifact upload"
  ],
  "artifacts": [
    {
      "filename": "Another Dimension Chat_0.1.0_x64-setup.exe",
      "sha256": "$artifact_sha",
      "size_bytes": $artifact_size,
      "platform": "windows",
      "architecture": "windows-x64",
      "bundle_target": "nsis",
      "signing_status": "unsigned-hold",
      "checksum_file": "Another Dimension Chat_0.1.0_x64-setup.exe.sha256",
      "provenance_file": "Another Dimension Chat_0.1.0_x64-setup.exe.provenance.json",
      "webview2_runtime_required": true,
      "smartscreen_reputation_claim": false,
      "signing_trust_boundary": false
    }
  ]
}
JSON

candidate_output="$(node "$VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_windows_artifact_manifests=1" ||
  fail "valid Windows artifact manifest was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "windows_artifact_checksum_bytes_verified=true" ||
  fail "validator did not report checksum-byte verification"
printf '%s\n' "$candidate_output" | grep -Fq "windows_public_artifact_ready=false" ||
  fail "validator must not claim Windows artifact readiness"
printf '%s\n' "$candidate_output" | grep -Fq "status=windows-artifact-manifest-candidate-requires-release-gate" ||
  fail "candidate validator did not require release gate"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict Windows artifact manifest validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict Windows artifact validator did not report stale source commit"

bad_sha="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
if [ "$bad_sha" = "$artifact_sha" ]; then
  bad_sha="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
fi
sed 's/"sha256": "'"$artifact_sha"'"/"sha256": "'"$bad_sha"'"/' \
  "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_SHA.json"
if node "$VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_SHA.json" >"$tmp_dir/bad-sha.out" 2>&1; then
  fail "validator accepted mismatched artifact SHA"
fi
grep -Fq "artifact-sha-mismatch" "$tmp_dir/bad-sha.out" ||
  fail "bad SHA rejection was not reported"

sed 's/"bundle_target": "nsis"/"bundle_target": "msi"/' \
  "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_TARGET_EXTENSION.json"
if node "$VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_TARGET_EXTENSION.json" >"$tmp_dir/bad-target-extension.out" 2>&1; then
  fail "validator accepted bundle target/extension mismatch"
fi
grep -Fq "bundle-target-extension-mismatch" "$tmp_dir/bad-target-extension.out" ||
  fail "bundle target/extension mismatch rejection was not reported"

sed 's/"signing_status": "unsigned-hold"/"signing_status": "signtool-signed"/' \
  "$tmp_dir/Another Dimension Chat_0.1.0_x64-setup.exe.provenance.json" >"$tmp_dir/bad-signing.provenance.json"
sed 's/"provenance_file": "Another Dimension Chat_0.1.0_x64-setup.exe.provenance.json"/"provenance_file": "bad-signing.provenance.json"/' \
  "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST.json" >"$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_SIGNING_PROVENANCE.json"
if node "$VALIDATOR" "$tmp_dir/WINDOWS_ARTIFACT_MANIFEST_BAD_SIGNING_PROVENANCE.json" >"$tmp_dir/bad-signing.out" 2>&1; then
  fail "validator accepted provenance signing mismatch"
fi
grep -Fq "provenance-signing-status-mismatch" "$tmp_dir/bad-signing.out" ||
  fail "provenance signing mismatch rejection was not reported"

if git -C "$ROOT" ls-files | grep -Eq '^(apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "generated Windows artifact path is tracked"
fi
if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=windows-artifact-manifest-checksum-gate-ready
windows_artifact_manifest_checksum_schema_available=true
windows_artifact_manifest_checksum_validator_available=true
windows_artifact_metadata_generator_ready=true
windows_artifact_manifest_checksum_verifier_ready=true
windows_artifact_requires_same_release_authority=true
windows_artifact_checksum_bytes_verified_by_validator=true
windows_artifact_provenance_consistency_verified_by_validator=true
windows_artifact_provenance_field_consistency_verified_by_validator=true
windows_artifact_bundle_target_extension_bound=true
windows_public_artifact_ready=false
windows_installer_ready=false
windows_signing_ready=false
windows_public_artifact_upload_allowed=false
windows_generated_artifact_commit_allowed=false
production_ready_claim_allowed=false
sensitive_communication_allowed=false
STATUS

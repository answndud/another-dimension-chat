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
    fail "$file contains forbidden macOS release distribution pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/MACOS_RELEASE_DISTRIBUTION_METADATA.md"
VALIDATOR="scripts/validate_macos_release_distribution_manifest.mjs"
GENERATOR="scripts/prepare_macos_release_distribution_metadata.sh"
UPLOAD="scripts/upload_macos_release_assets_approved.sh"
ARTIFACT_GUARD="scripts/mobile_generated_artifact_guard_once.sh"

for file in "$DOC" "$VALIDATOR" "$GENERATOR" "$UPLOAD" "$ARTIFACT_GUARD"; do
  [ -f "$file" ] || fail "missing macOS release distribution input: $file"
done

for flag in \
  "macos_release_distribution_manifest_schema_available=true" \
  "macos_release_distribution_manifest_validator_available=true" \
  "macos_release_distribution_checksum_bytes_verified=true" \
  "macos_release_distribution_provenance_consistency_verified=true" \
  "macos_release_distribution_dmg_contained_app_evidence_required=true" \
  "macos_release_distribution_signed_artifact_tools_verified=true" \
  "macos_dmg_contained_app_verifier_available=false" \
  "dmg_mounted_app_found=false" \
  "dmg_contained_app_codesign_verify_passed=false" \
  "dmg_contained_app_gatekeeper_assess_passed=false" \
  "dmg_contained_app_matches_signed_source_app=false" \
  "macos_release_distribution_metadata_generator_ready=true" \
  "macos_release_upload_script_ready=true" \
  "macos_current_public_support_scope=apple-silicon-aarch64-only" \
  "macos_universal_artifact_available=false" \
  "macos_intel_artifact_available=false" \
  "signed_notarized_distribution_artifact_available=false" \
  "macos_release_distribution_artifact_ready=false" \
  "release_upload_authorized=false" \
  "release_body_edit_authorized=false" \
  "generated_release_artifacts_commit_allowed=false"; do
  must_contain "$DOC" "$flag"
done

must_contain "$VALIDATOR" "macos-release-distribution-manifest-v1"
must_contain "$VALIDATOR" "macos_release_distribution_dmg_contained_app_evidence_verified=true"
must_contain "$VALIDATOR" "macos_release_distribution_signed_artifact_tools_verified=true"
must_contain "$VALIDATOR" "codesign"
must_contain "$VALIDATOR" "spctl"
must_contain "$VALIDATOR" "stapler"
must_contain "$VALIDATOR" "macos_dmg_contained_app_verifier_available"
must_contain "$VALIDATOR" "dmg_contained_app_matches_signed_source_app"
must_contain "$GENERATOR" "AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA"
must_contain "$GENERATOR" "AD_MACOS_SIGNED_RC_PROVENANCE_IN"
must_contain "$GENERATOR" "AD_MACOS_DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP"
must_contain "$UPLOAD" "AD_RELEASE_UPLOAD_AUTHORIZED"
must_contain "$UPLOAD" "gh release upload"

for file in "$DOC" README.md SECURITY.md reference/*.md; do
  [ -f "$file" ] || continue
  must_not_match "$file" "macos_universal_artifact_available=true"
  must_not_match "$file" "macos_intel_artifact_available=true"
  must_not_match "$file" "signed_notarized_distribution_artifact_available=true"
  must_not_match "$file" "macos_release_distribution_artifact_ready=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "release_body_edit_authorized=true"
  must_not_match "$file" "generated_release_artifacts_commit_allowed=true"
done

empty_output="$(node "$VALIDATOR" "$ROOT/apps/desktop-tauri/public-release/macos-distribution-metadata")"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-macos-release-distribution-manifest" ||
  fail "empty distribution manifest validator did not wait"

tmp_dir="$(mktemp -d)"
generator_fixture_dir="$ROOT/apps/desktop-tauri/beta-artifacts/macos-distribution-generator-fixture.$$"
cleanup() {
  rm -rf "$tmp_dir" "$generator_fixture_dir"
}
trap cleanup EXIT
artifact_name="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg"
printf 'macos focused validator fixture\n' >"$tmp_dir/$artifact_name"
artifact_sha="$(shasum -a 256 "$tmp_dir/$artifact_name" | awk '{print $1}')"
artifact_size="$(wc -c <"$tmp_dir/$artifact_name" | tr -d ' ')"
printf '%s  %s\n' "$artifact_sha" "$artifact_name" >"$tmp_dir/$artifact_name.sha256"
source_commit="abcdef1234567890"
cat >"$tmp_dir/$artifact_name.provenance.json" <<JSON
{
  "schema_version": "macos-release-distribution-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "artifact_filename": "$artifact_name",
  "artifact_sha256": "$artifact_sha",
  "release_class": "unsigned-public-beta",
  "architecture": "macos-aarch64",
  "signing_status": "unsigned",
  "notarization_status": "not-notarized",
  "stapled": false,
  "macos_dmg_contained_app_verifier_available": false,
  "dmg_mounted_app_found": false,
  "dmg_contained_app_codesign_verify_passed": false,
  "dmg_contained_app_gatekeeper_assess_passed": false,
  "dmg_contained_app_matches_signed_source_app": false,
  "release_upload_authorized": false,
  "macos_release_distribution_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false
}
JSON
cat >"$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" <<'JSON'
{
  "schema_version": "macos-release-distribution-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "__SOURCE_COMMIT__",
  "version": "0.1.0",
  "release_class": "unsigned-public-beta",
  "same_release_asset_authority_required": true,
  "release_upload_authorized": false,
  "release_body_edit_authorized": false,
  "generated_release_artifacts_commit_allowed": false,
  "public_non_claims": [
    "sensitive communication prohibited",
    "not audited",
    "not production-ready"
  ],
  "artifacts": [
    {
      "filename": "__ARTIFACT_NAME__",
      "sha256": "__ARTIFACT_SHA__",
      "size_bytes": __ARTIFACT_SIZE__,
      "platform": "macos",
      "architecture": "macos-aarch64",
      "signing_status": "unsigned",
      "notarization_status": "not-notarized",
      "stapled": false,
      "macos_dmg_contained_app_verifier_available": false,
      "dmg_mounted_app_found": false,
      "dmg_contained_app_codesign_verify_passed": false,
      "dmg_contained_app_gatekeeper_assess_passed": false,
      "dmg_contained_app_matches_signed_source_app": false,
      "checksum_file": "__ARTIFACT_NAME__.sha256",
      "provenance_file": "__ARTIFACT_NAME__.provenance.json"
    }
  ]
}
JSON
perl -0pi -e "s/__SOURCE_COMMIT__/$source_commit/g; s/__ARTIFACT_NAME__/$artifact_name/g; s/__ARTIFACT_SHA__/$artifact_sha/g; s/__ARTIFACT_SIZE__/$artifact_size/g" \
  "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json"

candidate_output="$(node "$VALIDATOR" "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_macos_release_distribution_manifests=1" ||
  fail "valid distribution manifest was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "macos_release_distribution_checksum_bytes_verified=true" ||
  fail "manifest validator did not verify checksum bytes"
printf '%s\n' "$candidate_output" | grep -Fq "macos_release_distribution_provenance_consistency_verified=true" ||
  fail "manifest validator did not verify provenance consistency"
printf '%s\n' "$candidate_output" | grep -Fq "macos_release_distribution_dmg_contained_app_evidence_verified=true" ||
  fail "manifest validator did not verify DMG contained app evidence"
printf '%s\n' "$candidate_output" | grep -Fq "macos_release_distribution_artifact_ready=false" ||
  fail "manifest validator must not claim artifact readiness"

signed_artifact_name="another-dimension-chat-0.1.0-beta-onion-macos-aarch64-signed-notarized.dmg"
printf 'forged signed notarized dmg fixture\n' >"$tmp_dir/$signed_artifact_name"
signed_artifact_sha="$(shasum -a 256 "$tmp_dir/$signed_artifact_name" | awk '{print $1}')"
signed_artifact_size="$(wc -c <"$tmp_dir/$signed_artifact_name" | tr -d ' ')"
printf '%s  %s\n' "$signed_artifact_sha" "$signed_artifact_name" >"$tmp_dir/$signed_artifact_name.sha256"
cat >"$tmp_dir/$signed_artifact_name.provenance.json" <<JSON
{
  "schema_version": "macos-release-distribution-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "artifact_filename": "$signed_artifact_name",
  "artifact_sha256": "$signed_artifact_sha",
  "release_class": "signed-notarized-rc",
  "architecture": "macos-aarch64",
  "signing_status": "signed",
  "notarization_status": "notarized",
  "stapled": true,
  "macos_dmg_contained_app_verifier_available": true,
  "dmg_mounted_app_found": true,
  "dmg_contained_app_codesign_verify_passed": true,
  "dmg_contained_app_gatekeeper_assess_passed": true,
  "dmg_contained_app_matches_signed_source_app": true,
  "release_upload_authorized": false,
  "macos_release_distribution_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false,
  "signed_rc_provenance_schema_version": "macos-signed-notarized-rc-provenance-v1",
  "signed_rc_artifact": "$signed_artifact_name",
  "signed_rc_sha256": "$signed_artifact_sha",
  "signed_rc_source_commit": "$source_commit",
  "signed_rc_target_arch": "aarch64-apple-darwin",
  "signed_rc_signed": true,
  "signed_rc_notarized": true,
  "signed_rc_stapled": true,
  "signed_rc_gatekeeper_assessed": true,
  "signed_rc_dmg_rebuild_authorized": true
}
JSON
cat >"$tmp_dir/forged-signed-manifest.json" <<JSON
{
  "schema_version": "macos-release-distribution-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "version": "0.1.0",
  "release_class": "signed-notarized-rc",
  "same_release_asset_authority_required": true,
  "release_upload_authorized": false,
  "release_body_edit_authorized": false,
  "generated_release_artifacts_commit_allowed": false,
  "public_non_claims": [
    "sensitive communication prohibited",
    "not audited",
    "not production-ready"
  ],
  "artifacts": [
    {
      "filename": "$signed_artifact_name",
      "sha256": "$signed_artifact_sha",
      "size_bytes": $signed_artifact_size,
      "platform": "macos",
      "architecture": "macos-aarch64",
      "signing_status": "signed",
      "notarization_status": "notarized",
      "stapled": true,
      "macos_dmg_contained_app_verifier_available": true,
      "dmg_mounted_app_found": true,
      "dmg_contained_app_codesign_verify_passed": true,
      "dmg_contained_app_gatekeeper_assess_passed": true,
      "dmg_contained_app_matches_signed_source_app": true,
      "checksum_file": "$signed_artifact_name.sha256",
      "provenance_file": "$signed_artifact_name.provenance.json"
    }
  ]
}
JSON
if node "$VALIDATOR" "$tmp_dir/forged-signed-manifest.json" >"$tmp_dir/forged-signed.out" 2>&1; then
  fail "distribution manifest validator accepted forged signed/notarized artifact evidence"
fi
grep -Eq "codesign-(verify-failed|unavailable-for-signed-distribution)" "$tmp_dir/forged-signed.out" ||
  fail "distribution manifest validator did not require live signed artifact verification"

mkdir -p "$generator_fixture_dir"
generator_artifact="$generator_fixture_dir/$artifact_name"
generator_provenance="$generator_fixture_dir/signed-build.provenance.json"
generator_out="$generator_fixture_dir/out"
printf 'macos distribution metadata generator fixture\n' >"$generator_artifact"

if AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA=1 \
  AD_MACOS_RELEASE_ARTIFACT="$generator_artifact" \
  AD_MACOS_RELEASE_METADATA_OUT_DIR="$generator_out" \
  "$GENERATOR" >"$tmp_dir/generator-missing-provenance.out" 2>&1; then
  fail "metadata generator accepted signed/notarized artifact without signed-build provenance"
fi
grep -Fq "AD_MACOS_SIGNED_RC_PROVENANCE_IN is required" \
  "$tmp_dir/generator-missing-provenance.out" ||
  fail "metadata generator did not report missing signed-build provenance input"

cat >"$generator_provenance" <<'JSON'
{
  "schema_version": "macos-signed-notarized-rc-provenance-v1",
  "macos_dmg_contained_app_verifier_available": true,
  "dmg_mounted_app_found": true,
  "dmg_contained_app_codesign_verify_passed": true,
  "dmg_contained_app_gatekeeper_assess_passed": true,
  "dmg_contained_app_matches_signed_source_app": true
}
JSON
if AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA=1 \
  AD_MACOS_RELEASE_ARTIFACT="$generator_artifact" \
  AD_MACOS_SIGNED_RC_PROVENANCE_IN="$generator_provenance" \
  AD_MACOS_RELEASE_METADATA_OUT_DIR="$generator_out" \
  "$GENERATOR" >"$tmp_dir/generator-forged-provenance.out" 2>&1; then
  fail "metadata generator accepted incomplete signed-build provenance"
fi
grep -Fq "signed RC provenance artifact mismatch" "$tmp_dir/generator-forged-provenance.out" ||
  fail "metadata generator did not reject incomplete signed-build provenance"

AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA=1 \
  AD_MACOS_RELEASE_CLASS=unsigned-public-beta \
  AD_MACOS_ARTIFACT_SIGNING_STATUS=unsigned \
  AD_MACOS_ARTIFACT_NOTARIZATION_STATUS=not-notarized \
  AD_MACOS_ARTIFACT_STAPLED=false \
  AD_MACOS_RELEASE_ARTIFACT="$generator_artifact" \
  AD_MACOS_RELEASE_METADATA_OUT_DIR="$generator_out" \
  "$GENERATOR" >"$tmp_dir/generator-prepared.out"
grep -Fq "macos_release_distribution_dmg_contained_app_evidence_verified=true" \
  "$tmp_dir/generator-prepared.out" ||
  fail "metadata generator did not prepare contained-app distribution evidence"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict distribution manifest validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict distribution manifest validator did not report stale source commit"

"$GENERATOR" >/dev/null
"$UPLOAD" >/dev/null
"$ARTIFACT_GUARD" >/dev/null

if git -C "$ROOT" ls-files | grep -Eq '^(apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "generated release artifact path is tracked"
fi
if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=macos-release-distribution-manifest-gate-ready
macos_release_distribution_manifest_schema_available=true
macos_release_distribution_manifest_validator_available=true
macos_release_distribution_checksum_bytes_verified=true
macos_release_distribution_provenance_consistency_verified=true
macos_release_distribution_dmg_contained_app_evidence_required=true
macos_release_distribution_signed_artifact_tools_verified=true
macos_dmg_contained_app_verifier_available=false
dmg_mounted_app_found=false
dmg_contained_app_codesign_verify_passed=false
dmg_contained_app_gatekeeper_assess_passed=false
dmg_contained_app_matches_signed_source_app=false
macos_release_distribution_metadata_generator_ready=true
macos_release_upload_script_ready=true
macos_current_public_support_scope=apple-silicon-aarch64-only
macos_universal_artifact_available=false
macos_intel_artifact_available=false
signed_notarized_distribution_artifact_available=false
macos_release_distribution_artifact_ready=false
release_upload_authorized=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
generated_artifacts_staged=false
STATUS

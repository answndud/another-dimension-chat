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

for file in "$DOC" "$VALIDATOR" "$GENERATOR" "$UPLOAD"; do
  [ -f "$file" ] || fail "missing macOS release distribution input: $file"
done

for flag in \
  "macos_release_distribution_manifest_schema_available=true" \
  "macos_release_distribution_manifest_validator_available=true" \
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
must_contain "$GENERATOR" "AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA"
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
trap 'rm -rf "$tmp_dir"' EXIT
cat >"$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" <<'JSON'
{
  "schema_version": "macos-release-distribution-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "abcdef1234567890",
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
      "filename": "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-signed-notarized.dmg",
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "size_bytes": 123456,
      "platform": "macos",
      "architecture": "macos-aarch64",
      "signing_status": "signed",
      "notarization_status": "notarized",
      "stapled": true,
      "checksum_file": "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-signed-notarized.dmg.sha256",
      "provenance_file": "another-dimension-chat-0.1.0-beta-onion-macos-aarch64-signed-notarized.dmg.provenance.json"
    }
  ]
}
JSON

candidate_output="$(node "$VALIDATOR" "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_macos_release_distribution_manifests=1" ||
  fail "valid distribution manifest was not accepted"
printf '%s\n' "$candidate_output" | grep -Fq "macos_release_distribution_artifact_ready=false" ||
  fail "manifest validator must not claim artifact readiness"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict distribution manifest validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict distribution manifest validator did not report stale source commit"

"$GENERATOR" >/dev/null
"$UPLOAD" >/dev/null

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
STATUS

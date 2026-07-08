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
    fail "$file contains forbidden signed update manifest pattern: $pattern"
  fi
}

must_contain_in_any() {
  local needle="$1"
  shift
  local file
  for file in "$@"; do
    grep -Fq "$needle" "$file" && return 0
  done
  fail "missing required text in public entrypoint/reference files: $needle"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA="reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
VALIDATOR="scripts/validate_macos_signed_update_manifest.mjs"
UPDATE_DOC="reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md"
INTEGRITY="reference/UPDATE_INTEGRITY.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"

for file in "$SCHEMA" "$VALIDATOR" "$UPDATE_DOC" "$INTEGRITY" "$MATRIX" \
  "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing M100-7 signed update manifest input: $file"
done

for flag in \
  "macos_signed_update_manifest_schema_available=true" \
  "macos_signed_update_manifest_validator_available=true" \
  "signed_update_manifest_candidate_verifier_ready=true" \
  "signed_update_manifest_requires_distribution_manifest_sha256=true" \
  "signed_update_manifest_requires_dmg_contained_app_evidence=true" \
  "signed_update_manifest_requires_distribution_manifest_validation=true" \
  "signed_update_manifest_requires_signed_false_hold_flags=true" \
  "signed_update_manifest_previous_monotonicity_verifier_ready=true" \
  "signed_update_manifest_ready=false" \
  "update_signature_ready=false" \
  "auto_update_channel_ready=false" \
  "rollback_prevention_claimed=false" \
  "release_upload_authorized=false" \
  "dmg_rebuild_authorized=false" \
  "production_distribution_ready=false" \
  "production_ready_claim_allowed=false" \
  "audited_claim_allowed=false" \
  "sensitive_communication_allowed=false"; do
  must_contain "$SCHEMA" "$flag"
done

must_contain "$SCHEMA" "scripts/validate_macos_signed_update_manifest.mjs"
must_contain "$SCHEMA" "scripts/macos_signed_update_manifest_once.sh"
must_contain "$SCHEMA" "Ed25519 signature"
must_contain "$SCHEMA" "distribution_manifest_sha256"
must_contain "$SCHEMA" "release_distribution_manifest_verified"
must_contain "$SCHEMA" "macos_release_distribution_dmg_contained_app_evidence_verified"
must_contain "$SCHEMA" "dmg_contained_app_matches_signed_source_app"
must_contain "$VALIDATOR" "crypto.verify"
must_contain "$VALIDATOR" "DISTRIBUTION_MANIFEST_VALIDATOR"
must_contain "$VALIDATOR" "source-commit-not-current-head"
must_contain "$VALIDATOR" "release-tag-not-newer-than-previous-manifest"
must_contain "$VALIDATOR" "hold_flags"
must_contain "$VALIDATOR" "distribution_manifest_sha256"
must_contain "$VALIDATOR" "macos_release_distribution_dmg_contained_app_evidence_verified"
must_contain "$VALIDATOR" "status=macos-signed-update-manifest-candidate-requires-release-gate"
must_contain "$UPDATE_DOC" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "$INTEGRITY" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "$MATRIX" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain_in_any "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md" "README.md" "SECURITY.md"

for file in "$SCHEMA" "$UPDATE_DOC" "$INTEGRITY" "$MATRIX" "SECURITY.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "signed_update_manifest_ready=true"
  must_not_match "$file" "update_signature_ready=true"
  must_not_match "$file" "auto_update_channel_ready=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
done
must_contain_in_any "not production-ready" "README.md" "SECURITY.md"
must_contain_in_any "sensitive communication prohibited" "README.md" "SECURITY.md"
for file in "README.md"; do
  must_not_match "$file" "signed_update_manifest_ready=true"
  must_not_match "$file" "update_signature_ready=true"
  must_not_match "$file" "auto_update_channel_ready=true"
  must_not_match "$file" "rollback_prevention_claimed=true"
  must_not_match "$file" "release_upload_authorized=true"
  must_not_match "$file" "dmg_rebuild_authorized=true"
  must_not_match "$file" "production_distribution_ready=true"
  must_not_match "$file" "production_ready_claim_allowed=true"
done

empty_output="$(node "$VALIDATOR" "$ROOT/docs/macos-signed-update-manifests")"
printf '%s\n' "$empty_output" | grep -Fq "signed_update_manifest_files_found=0" || fail "empty signed manifest run did not report zero files"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-macos-signed-update-manifest" || fail "empty signed manifest run did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

artifact_name="another-dimension-chat-0.1.1-rc.1-macos-aarch64.dmg"
printf 'signed update distribution binding fixture\n' >"$tmp_dir/$artifact_name"
artifact_sha="$(shasum -a 256 "$tmp_dir/$artifact_name" | awk '{print $1}')"
artifact_size="$(wc -c <"$tmp_dir/$artifact_name" | tr -d ' ')"
source_commit="abcdef1234567890"
printf '%s  %s\n' "$artifact_sha" "$artifact_name" >"$tmp_dir/$artifact_name.sha256"
cat >"$tmp_dir/$artifact_name.provenance.json" <<JSON
{
  "schema_version": "macos-release-distribution-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "artifact_filename": "$artifact_name",
  "artifact_sha256": "$artifact_sha",
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
  "generated_release_artifacts_commit_allowed": false
}
JSON
provenance_sha="$(shasum -a 256 "$tmp_dir/$artifact_name.provenance.json" | awk '{print $1}')"
cat >"$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" <<JSON
{
  "schema_version": "macos-release-distribution-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "version": "0.1.1",
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
      "filename": "$artifact_name",
      "sha256": "$artifact_sha",
      "size_bytes": $artifact_size,
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
      "checksum_file": "$artifact_name.sha256",
      "provenance_file": "$artifact_name.provenance.json"
    }
  ]
}
JSON
distribution_manifest_sha="$(shasum -a 256 "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" | awk '{print $1}')"

node - \
  "$tmp_dir/valid.json" \
  "$tmp_dir/missing-distribution.json" \
  "$tmp_dir/missing-contained-app.json" \
  "$tmp_dir/mismatched-artifact.json" \
  "$tmp_dir/previous-older.json" \
  "$tmp_dir/previous-newer.json" \
  "$artifact_name" \
  "$artifact_sha" \
  "$artifact_size" \
  "$provenance_sha" \
  "$distribution_manifest_sha" \
  "$source_commit" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const validOut = process.argv[2];
const missingDistributionOut = process.argv[3];
const missingContainedAppOut = process.argv[4];
const mismatchedArtifactOut = process.argv[5];
const previousOlderOut = process.argv[6];
const previousNewerOut = process.argv[7];
const artifactName = process.argv[8];
const artifactSha = process.argv[9];
const artifactSize = Number.parseInt(process.argv[10], 10);
const provenanceSha = process.argv[11];
const distributionManifestSha = process.argv[12];
const sourceCommit = process.argv[13];
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicDer = publicKey.export({ format: "der", type: "spki" });

function writeEnvelope(out, payload) {
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const envelope = {
    schema_version: "macos-signed-update-manifest-envelope-v1",
    manifest_id: payload.manifest_id,
    signed_payload_base64: payloadBytes.toString("base64"),
    signed_payload_sha256: crypto.createHash("sha256").update(payloadBytes).digest("hex"),
    signature_algorithm: "ed25519",
    signature_base64: crypto.sign(null, payloadBytes, privateKey).toString("base64"),
    public_key_spki_der_base64: publicDer.toString("base64"),
    public_key_spki_sha256: crypto.createHash("sha256").update(publicDer).digest("hex"),
  };
  fs.writeFileSync(out, `${JSON.stringify(envelope, null, 2)}\n`);
}

const holdFlags = {
  signed_update_manifest_ready: false,
  update_signature_ready: false,
  auto_update_channel_ready: false,
  rollback_prevention_claimed: false,
  release_upload_authorized: false,
  dmg_rebuild_authorized: false,
  stable_release_allowed: false,
  production_distribution_ready: false,
  security_ready_claimed: false,
  production_ready_claim_allowed: false,
  audited_claim_allowed: false,
  sensitive_communication_allowed: false,
};

const basePayload = {
  schema_version: "macos-signed-update-manifest-payload-v1",
  manifest_id: "MACOS-UPDATE-0001",
  repository: "answndud/another-dimension-chat",
  release_channel: "signed-public-beta-or-rc",
  release_tag: "v0.1.1-rc.1",
  app_version: "0.1.1",
  minimum_allowed_version: "0.1.0",
  platform: "macos-aarch64",
  artifact_name: artifactName,
  artifact_sha256: artifactSha,
  artifact_size_bytes: artifactSize,
  provenance_sha256: provenanceSha,
  distribution_manifest_sha256: distributionManifestSha,
  release_distribution_manifest_verified: true,
  same_release_asset_authority_required: true,
  release_notes_sha256: "c".repeat(64),
  macos_release_distribution_dmg_contained_app_evidence_verified: true,
  macos_dmg_contained_app_verifier_available: true,
  dmg_mounted_app_found: true,
  dmg_contained_app_codesign_verify_passed: true,
  dmg_contained_app_gatekeeper_assess_passed: true,
  dmg_contained_app_matches_signed_source_app: true,
  created_at_utc: "2026-06-13T12:00:00Z",
  source_commit: sourceCommit,
  update_mode: "manual-github-release-download",
  rollback_policy: "warn-and-recover-only",
  release_upload_authorized: false,
  dmg_rebuild_authorized: false,
  hold_flags: holdFlags,
  public_non_claims: [
    "unsigned-experimental-public-beta",
    "sensitive-communication-prohibited",
    "not-audited",
    "not-production-ready",
  ],
};

writeEnvelope(validOut, basePayload);

const missingDistribution = { ...basePayload };
delete missingDistribution.distribution_manifest_sha256;
writeEnvelope(missingDistributionOut, missingDistribution);

const missingContainedApp = {
  ...basePayload,
  dmg_contained_app_matches_signed_source_app: false,
};
writeEnvelope(missingContainedAppOut, missingContainedApp);

writeEnvelope(mismatchedArtifactOut, {
  ...basePayload,
  artifact_sha256: "e".repeat(64),
});

writeEnvelope(previousOlderOut, {
  ...basePayload,
  manifest_id: "MACOS-UPDATE-0000",
  release_tag: "v0.1.0",
  app_version: "0.1.0",
  minimum_allowed_version: "0.1.0",
});

writeEnvelope(previousNewerOut, {
  ...basePayload,
  manifest_id: "MACOS-UPDATE-0002",
  release_tag: "v0.1.2",
  app_version: "0.1.2",
  minimum_allowed_version: "0.1.0",
});
NODE

if node "$VALIDATOR" "$tmp_dir/valid.json" >"$tmp_dir/missing-distribution-input.out" 2>&1; then
  fail "validator accepted signed update manifest without distribution manifest validator input"
fi
grep -Fq "missing-distribution-manifest-input" "$tmp_dir/missing-distribution-input.out" ||
  fail "missing distribution manifest input rejection was not reported"

candidate_output="$(node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" "$tmp_dir/valid.json")"
printf '%s\n' "$candidate_output" | grep -Fq "macos_signed_update_distribution_manifest_files_found=1" || fail "validator did not inspect distribution manifest input"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_signed_update_manifests=1" || fail "validator did not accept valid signed manifest"
printf '%s\n' "$candidate_output" | grep -Fq "signed_update_manifest_candidate=true" || fail "valid signed manifest did not become a candidate"
printf '%s\n' "$candidate_output" | grep -Fq "signed_update_manifest_ready=false" || fail "signed manifest validator must not bypass release gate"
printf '%s\n' "$candidate_output" | grep -Fq "status=macos-signed-update-manifest-candidate-requires-release-gate" || fail "valid signed manifest did not require release gate"

previous_output="$(node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" --previous-manifest "$tmp_dir/previous-older.json" "$tmp_dir/valid.json")"
printf '%s\n' "$previous_output" | grep -Fq "accepted_signed_update_manifests=1" ||
  fail "validator did not accept monotonic signed update manifest"

if node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  --previous-manifest "$tmp_dir/previous-newer.json" "$tmp_dir/valid.json" >"$tmp_dir/non-monotonic.out" 2>&1; then
  fail "validator accepted non-monotonic signed update manifest"
fi
grep -Fq "release-tag-not-newer-than-previous-manifest" "$tmp_dir/non-monotonic.out" ||
  fail "non-monotonic release tag rejection was not reported"

if node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  "$tmp_dir/missing-distribution.json" >"$tmp_dir/missing-distribution.out" 2>&1; then
  fail "validator accepted signed update manifest without distribution manifest SHA binding"
fi
grep -Fq "missing-payload-field:distribution_manifest_sha256" "$tmp_dir/missing-distribution.out" ||
  fail "missing distribution manifest SHA rejection was not reported"

if node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  "$tmp_dir/missing-contained-app.json" >"$tmp_dir/missing-contained-app.out" 2>&1; then
  fail "validator accepted signed update manifest without DMG-contained app source-match evidence"
fi
grep -Fq "dmg_contained_app_matches_signed_source_app-must-be-true" "$tmp_dir/missing-contained-app.out" ||
  fail "missing DMG-contained app source-match rejection was not reported"

if node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  "$tmp_dir/mismatched-artifact.json" >"$tmp_dir/mismatched-artifact.out" 2>&1; then
  fail "validator accepted signed update manifest whose artifact SHA mismatched distribution manifest"
fi
grep -Fq "distribution-artifact-sha-mismatch" "$tmp_dir/mismatched-artifact.out" ||
  fail "distribution artifact SHA mismatch was not reported"

if AD_REQUIRE_CURRENT_HEAD=1 node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  "$tmp_dir/valid.json" >"$tmp_dir/stale.out" 2>&1; then
  fail "strict signed update manifest validator accepted stale source commit"
fi
grep -Fq "source-commit-not-current-head" "$tmp_dir/stale.out" ||
  fail "strict signed update manifest validator did not report stale source commit"

node - "$tmp_dir/tampered.json" "$tmp_dir/valid.json" <<'NODE'
const fs = require("node:fs");
const out = process.argv[2];
const source = process.argv[3];
const envelope = JSON.parse(fs.readFileSync(source, "utf8"));
const payload = JSON.parse(Buffer.from(envelope.signed_payload_base64, "base64").toString("utf8"));
payload.created_at_utc = "2026-06-13T12:00:01Z";
const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
envelope.signed_payload_base64 = payloadBytes.toString("base64");
envelope.signed_payload_sha256 = require("node:crypto").createHash("sha256").update(payloadBytes).digest("hex");
fs.writeFileSync(out, `${JSON.stringify(envelope, null, 2)}\n`);
NODE

if node "$VALIDATOR" --distribution-manifest "$tmp_dir/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json" \
  "$tmp_dir/tampered.json" >"$tmp_dir/tampered.out" 2>&1; then
  fail "validator accepted tampered signed manifest"
fi
grep -Fq "signature-verification-failed" "$tmp_dir/tampered.out" || fail "tampered signature rejection was not reported"

cat <<'STATUS'
status=macos-signed-update-manifest-source-ready
macos_signed_update_manifest_schema_available=true
macos_signed_update_manifest_validator_available=true
signed_update_manifest_candidate_verifier_ready=true
signed_update_manifest_requires_distribution_manifest_sha256=true
signed_update_manifest_requires_dmg_contained_app_evidence=true
signed_update_manifest_requires_distribution_manifest_validation=true
signed_update_manifest_requires_signed_false_hold_flags=true
signed_update_manifest_previous_monotonicity_verifier_ready=true
signed_update_manifest_ready=false
update_signature_ready=false
auto_update_channel_ready=false
rollback_prevention_claimed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
production_distribution_ready=false
production_ready_claim_allowed=false
next_required_phase=O100-1-Operations-Incident-And-Vulnerability-Readiness
STATUS

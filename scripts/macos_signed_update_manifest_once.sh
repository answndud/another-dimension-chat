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
must_contain "$VALIDATOR" "crypto.verify"
must_contain "$VALIDATOR" "status=macos-signed-update-manifest-candidate-requires-release-gate"
must_contain "$UPDATE_DOC" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "$INTEGRITY" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "$MATRIX" "MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "README.md" "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"
must_contain "SECURITY.md" "reference/MACOS_SIGNED_UPDATE_MANIFEST_SCHEMA.md"

for file in "$SCHEMA" "$UPDATE_DOC" "$INTEGRITY" "$MATRIX" "README.md" "SECURITY.md"; do
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

empty_output="$(node "$VALIDATOR" "$ROOT/docs/macos-signed-update-manifests")"
printf '%s\n' "$empty_output" | grep -Fq "signed_update_manifest_files_found=0" || fail "empty signed manifest run did not report zero files"
printf '%s\n' "$empty_output" | grep -Fq "status=waiting-for-macos-signed-update-manifest" || fail "empty signed manifest run did not wait"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

node - "$tmp_dir/valid.json" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const out = process.argv[2];
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicDer = publicKey.export({ format: "der", type: "spki" });
const payload = {
  schema_version: "macos-signed-update-manifest-payload-v1",
  manifest_id: "MACOS-UPDATE-0001",
  repository: "answndud/another-dimension-chat",
  release_channel: "signed-public-beta-or-rc",
  release_tag: "v0.1.1-rc.1",
  app_version: "0.1.1",
  minimum_allowed_version: "0.1.0",
  platform: "macos-aarch64",
  artifact_name: "another-dimension-chat-0.1.1-rc.1-macos-aarch64.dmg",
  artifact_sha256: "a".repeat(64),
  artifact_size_bytes: 123456,
  provenance_sha256: "b".repeat(64),
  release_notes_sha256: "c".repeat(64),
  created_at_utc: "2026-06-13T12:00:00Z",
  source_commit: "abcdef1234567890",
  update_mode: "manual-github-release-download",
  rollback_policy: "warn-and-recover-only",
  release_upload_authorized: false,
  dmg_rebuild_authorized: false,
  public_non_claims: [
    "unsigned-experimental-public-beta",
    "sensitive-communication-prohibited",
    "not-audited",
    "not-production-ready",
  ],
};
const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
const envelope = {
  schema_version: "macos-signed-update-manifest-envelope-v1",
  manifest_id: "MACOS-UPDATE-0001",
  signed_payload_base64: payloadBytes.toString("base64"),
  signed_payload_sha256: crypto.createHash("sha256").update(payloadBytes).digest("hex"),
  signature_algorithm: "ed25519",
  signature_base64: crypto.sign(null, payloadBytes, privateKey).toString("base64"),
  public_key_spki_der_base64: publicDer.toString("base64"),
  public_key_spki_sha256: crypto.createHash("sha256").update(publicDer).digest("hex"),
};
fs.writeFileSync(out, `${JSON.stringify(envelope, null, 2)}\n`);
NODE

candidate_output="$(node "$VALIDATOR" "$tmp_dir/valid.json")"
printf '%s\n' "$candidate_output" | grep -Fq "accepted_signed_update_manifests=1" || fail "validator did not accept valid signed manifest"
printf '%s\n' "$candidate_output" | grep -Fq "signed_update_manifest_candidate=true" || fail "valid signed manifest did not become a candidate"
printf '%s\n' "$candidate_output" | grep -Fq "signed_update_manifest_ready=false" || fail "signed manifest validator must not bypass release gate"
printf '%s\n' "$candidate_output" | grep -Fq "status=macos-signed-update-manifest-candidate-requires-release-gate" || fail "valid signed manifest did not require release gate"

node - "$tmp_dir/tampered.json" "$tmp_dir/valid.json" <<'NODE'
const fs = require("node:fs");
const out = process.argv[2];
const source = process.argv[3];
const envelope = JSON.parse(fs.readFileSync(source, "utf8"));
const payload = JSON.parse(Buffer.from(envelope.signed_payload_base64, "base64").toString("utf8"));
payload.artifact_sha256 = "d".repeat(64);
const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
envelope.signed_payload_base64 = payloadBytes.toString("base64");
envelope.signed_payload_sha256 = require("node:crypto").createHash("sha256").update(payloadBytes).digest("hex");
fs.writeFileSync(out, `${JSON.stringify(envelope, null, 2)}\n`);
NODE

if node "$VALIDATOR" "$tmp_dir/tampered.json" >"$tmp_dir/tampered.out" 2>&1; then
  fail "validator accepted tampered signed manifest"
fi
grep -Fq "signature-verification-failed" "$tmp_dir/tampered.out" || fail "tampered signature rejection was not reported"

cat <<'STATUS'
status=macos-signed-update-manifest-source-ready
macos_signed_update_manifest_schema_available=true
macos_signed_update_manifest_validator_available=true
signed_update_manifest_candidate_verifier_ready=true
signed_update_manifest_ready=false
update_signature_ready=false
auto_update_channel_ready=false
rollback_prevention_claimed=false
release_upload_authorized=false
dmg_rebuild_authorized=false
production_distribution_ready=false
production_ready_claim_allowed=false
next_required_phase=A100-2-External-Review-Execution-And-Finding-Closure
STATUS

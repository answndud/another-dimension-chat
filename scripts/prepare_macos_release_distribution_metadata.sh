#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXECUTE="${AD_PREPARE_MACOS_RELEASE_DISTRIBUTION_METADATA:-0}"
ARTIFACT="${AD_MACOS_RELEASE_ARTIFACT:-}"
RELEASE_CLASS="${AD_MACOS_RELEASE_CLASS:-signed-notarized-rc}"
ARCHITECTURE="${AD_MACOS_ARTIFACT_ARCHITECTURE:-macos-aarch64}"
SIGNING_STATUS="${AD_MACOS_ARTIFACT_SIGNING_STATUS:-signed}"
NOTARIZATION_STATUS="${AD_MACOS_ARTIFACT_NOTARIZATION_STATUS:-notarized}"
STAPLED="${AD_MACOS_ARTIFACT_STAPLED:-true}"
SIGNED_RC_PROVENANCE_IN="${AD_MACOS_SIGNED_RC_PROVENANCE_IN:-${AD_SIGNED_RC_PROVENANCE_IN:-}}"
DMG_CONTAINED_APP_VERIFIER_AVAILABLE="${AD_MACOS_DMG_CONTAINED_APP_VERIFIER_AVAILABLE:-}"
DMG_MOUNTED_APP_FOUND="${AD_MACOS_DMG_MOUNTED_APP_FOUND:-}"
DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED="${AD_MACOS_DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED:-}"
DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED="${AD_MACOS_DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED:-}"
DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP="${AD_MACOS_DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP:-}"
OUT_DIR="${AD_MACOS_RELEASE_METADATA_OUT_DIR:-$ROOT/apps/desktop-tauri/public-release/macos-distribution-metadata}"
VALIDATOR="scripts/validate_macos_release_distribution_manifest.mjs"

[ -f "$VALIDATOR" ] || fail "missing macOS release manifest validator"

case "$OUT_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_METADATA_OUT_DIR must be under an ignored generated artifact directory" ;;
esac

if [ "$EXECUTE" != "1" ]; then
  cat <<'STATUS'
status=macos-release-distribution-metadata-held
macos_release_distribution_metadata_generator_ready=true
explicit_metadata_generation_required=true
artifact_checksum_manifest_path_ready=true
release_body_template_path_ready=true
macos_release_distribution_dmg_contained_app_evidence_required=true
release_upload_authorized=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
STATUS
  exit 0
fi

[ -f "$ARTIFACT" ] || fail "AD_MACOS_RELEASE_ARTIFACT must point to an existing artifact"
case "$ARTIFACT" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_MACOS_RELEASE_ARTIFACT must be under an ignored generated artifact directory" ;;
esac

case "$RELEASE_CLASS" in
  unsigned-public-beta|signed-notarized-rc|stable) ;;
  *) fail "unsupported AD_MACOS_RELEASE_CLASS" ;;
esac
case "$ARCHITECTURE" in
  macos-aarch64|macos-x86_64|macos-universal) ;;
  *) fail "unsupported AD_MACOS_ARTIFACT_ARCHITECTURE" ;;
esac
case "$SIGNING_STATUS" in unsigned|signed) ;; *) fail "unsupported AD_MACOS_ARTIFACT_SIGNING_STATUS" ;; esac
case "$NOTARIZATION_STATUS" in not-notarized|notarized) ;; *) fail "unsupported AD_MACOS_ARTIFACT_NOTARIZATION_STATUS" ;; esac
case "$STAPLED" in true|false) ;; *) fail "AD_MACOS_ARTIFACT_STAPLED must be true or false" ;; esac

artifact_name="$(basename "$ARTIFACT")"
sha256="$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')"
size_bytes="$(wc -c <"$ARTIFACT" | tr -d ' ')"
version="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
source_commit="$(git rev-parse HEAD)"
signed_rc_provenance_json_fields=""

if [ "$RELEASE_CLASS" = "unsigned-public-beta" ] &&
  [ "$SIGNING_STATUS" = "unsigned" ] &&
  [ "$NOTARIZATION_STATUS" = "not-notarized" ]; then
  DMG_CONTAINED_APP_VERIFIER_AVAILABLE="${DMG_CONTAINED_APP_VERIFIER_AVAILABLE:-false}"
  DMG_MOUNTED_APP_FOUND="${DMG_MOUNTED_APP_FOUND:-false}"
  DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED="${DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED:-false}"
  DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED="${DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED:-false}"
  DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP="${DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP:-false}"
else
  [ -f "$SIGNED_RC_PROVENANCE_IN" ] ||
    fail "AD_MACOS_SIGNED_RC_PROVENANCE_IN is required for signed/notarized distribution metadata"
  case "$SIGNED_RC_PROVENANCE_IN" in
    "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
    *) fail "AD_MACOS_SIGNED_RC_PROVENANCE_IN must be under an ignored generated artifact directory" ;;
  esac
  contained_app_output="$(node - "$SIGNED_RC_PROVENANCE_IN" "$artifact_name" "$sha256" "$source_commit" "$ARCHITECTURE" <<'NODE'
const fs = require("node:fs");
const expectedTargetArch = (architecture) => {
  if (architecture === "macos-aarch64") return "aarch64-apple-darwin";
  if (architecture === "macos-x86_64") return "x86_64-apple-darwin";
  if (architecture === "macos-universal") return "macos-universal";
  return "";
};
const file = process.argv[2];
const artifactName = process.argv[3];
const artifactSha = process.argv[4];
const sourceCommit = process.argv[5];
const architecture = process.argv[6];
const provenance = JSON.parse(fs.readFileSync(file, "utf8"));
const expected = {
  schema_version: "macos-signed-notarized-rc-provenance-v1",
  artifact: artifactName,
  sha256: artifactSha,
  source_commit: sourceCommit,
  target_arch: expectedTargetArch(architecture),
  signed: true,
  notarized: true,
  stapled: true,
  gatekeeper_assessed: true,
  release_upload_authorized: false,
};
for (const [field, value] of Object.entries(expected)) {
  if (provenance[field] !== value) {
    throw new Error(`signed RC provenance ${field} mismatch`);
  }
}
const fields = [
  "macos_dmg_contained_app_verifier_available",
  "dmg_mounted_app_found",
  "dmg_contained_app_codesign_verify_passed",
  "dmg_contained_app_gatekeeper_assess_passed",
  "dmg_contained_app_matches_signed_source_app",
];
for (const field of fields) {
  if (provenance[field] !== true) {
    throw new Error(`signed RC provenance missing true ${field}`);
  }
}
for (const field of fields) {
  console.log(provenance[field]);
}
console.log(provenance.schema_version);
console.log(provenance.artifact);
console.log(provenance.sha256);
console.log(provenance.source_commit);
console.log(provenance.target_arch);
console.log(provenance.signed);
console.log(provenance.notarized);
console.log(provenance.stapled);
console.log(provenance.gatekeeper_assessed);
console.log(provenance.dmg_rebuild_authorized === true ? "true" : "false");
NODE
  )"
  DMG_CONTAINED_APP_VERIFIER_AVAILABLE="$(printf '%s\n' "$contained_app_output" | sed -n '1p')"
  DMG_MOUNTED_APP_FOUND="$(printf '%s\n' "$contained_app_output" | sed -n '2p')"
  DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED="$(printf '%s\n' "$contained_app_output" | sed -n '3p')"
  DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED="$(printf '%s\n' "$contained_app_output" | sed -n '4p')"
  DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP="$(printf '%s\n' "$contained_app_output" | sed -n '5p')"
  SIGNED_RC_PROVENANCE_SCHEMA_VERSION="$(printf '%s\n' "$contained_app_output" | sed -n '6p')"
  SIGNED_RC_ARTIFACT="$(printf '%s\n' "$contained_app_output" | sed -n '7p')"
  SIGNED_RC_SHA256="$(printf '%s\n' "$contained_app_output" | sed -n '8p')"
  SIGNED_RC_SOURCE_COMMIT="$(printf '%s\n' "$contained_app_output" | sed -n '9p')"
  SIGNED_RC_TARGET_ARCH="$(printf '%s\n' "$contained_app_output" | sed -n '10p')"
  SIGNED_RC_SIGNED="$(printf '%s\n' "$contained_app_output" | sed -n '11p')"
  SIGNED_RC_NOTARIZED="$(printf '%s\n' "$contained_app_output" | sed -n '12p')"
  SIGNED_RC_STAPLED="$(printf '%s\n' "$contained_app_output" | sed -n '13p')"
  SIGNED_RC_GATEKEEPER_ASSESSED="$(printf '%s\n' "$contained_app_output" | sed -n '14p')"
  SIGNED_RC_DMG_REBUILD_AUTHORIZED="$(printf '%s\n' "$contained_app_output" | sed -n '15p')"
  [ "$DMG_CONTAINED_APP_VERIFIER_AVAILABLE" = "true" ] ||
    fail "signed RC provenance did not verify macOS DMG contained-app verifier availability"
  [ "$DMG_MOUNTED_APP_FOUND" = "true" ] ||
    fail "signed RC provenance did not verify mounted app discovery"
  [ "$DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED" = "true" ] ||
    fail "signed RC provenance did not verify contained app codesign"
  [ "$DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED" = "true" ] ||
    fail "signed RC provenance did not verify contained app Gatekeeper assessment"
  [ "$DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP" = "true" ] ||
    fail "signed RC provenance did not verify contained app source match"
  signed_rc_provenance_json_fields=",
  \"signed_rc_provenance_schema_version\": \"$SIGNED_RC_PROVENANCE_SCHEMA_VERSION\",
  \"signed_rc_artifact\": \"$SIGNED_RC_ARTIFACT\",
  \"signed_rc_sha256\": \"$SIGNED_RC_SHA256\",
  \"signed_rc_source_commit\": \"$SIGNED_RC_SOURCE_COMMIT\",
  \"signed_rc_target_arch\": \"$SIGNED_RC_TARGET_ARCH\",
  \"signed_rc_signed\": $SIGNED_RC_SIGNED,
  \"signed_rc_notarized\": $SIGNED_RC_NOTARIZED,
  \"signed_rc_stapled\": $SIGNED_RC_STAPLED,
  \"signed_rc_gatekeeper_assessed\": $SIGNED_RC_GATEKEEPER_ASSESSED,
  \"signed_rc_dmg_rebuild_authorized\": $SIGNED_RC_DMG_REBUILD_AUTHORIZED"
fi

mkdir -p "$OUT_DIR"
checksum_file="$artifact_name.sha256"
manifest_file="$OUT_DIR/MACOS_RELEASE_DISTRIBUTION_MANIFEST.json"
release_body_file="$OUT_DIR/GITHUB_RELEASE_BODY.md"
provenance_file="$artifact_name.provenance.json"

cp "$ARTIFACT" "$OUT_DIR/$artifact_name"
printf '%s  %s\n' "$sha256" "$artifact_name" >"$OUT_DIR/$checksum_file"

cat >"$OUT_DIR/$provenance_file" <<JSON
{
  "schema_version": "macos-release-distribution-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "artifact_filename": "$artifact_name",
  "artifact_sha256": "$sha256",
  "release_class": "$RELEASE_CLASS",
  "architecture": "$ARCHITECTURE",
  "signing_status": "$SIGNING_STATUS",
  "notarization_status": "$NOTARIZATION_STATUS",
  "stapled": $STAPLED,
  "macos_dmg_contained_app_verifier_available": $DMG_CONTAINED_APP_VERIFIER_AVAILABLE,
  "dmg_mounted_app_found": $DMG_MOUNTED_APP_FOUND,
  "dmg_contained_app_codesign_verify_passed": $DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED,
  "dmg_contained_app_gatekeeper_assess_passed": $DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED,
  "dmg_contained_app_matches_signed_source_app": $DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP,
  "release_upload_authorized": false,
  "macos_release_distribution_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false$signed_rc_provenance_json_fields
}
JSON

cat >"$manifest_file" <<JSON
{
  "schema_version": "macos-release-distribution-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "version": "$version",
  "release_class": "$RELEASE_CLASS",
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
      "sha256": "$sha256",
      "size_bytes": $size_bytes,
      "platform": "macos",
      "architecture": "$ARCHITECTURE",
      "signing_status": "$SIGNING_STATUS",
      "notarization_status": "$NOTARIZATION_STATUS",
      "stapled": $STAPLED,
      "macos_dmg_contained_app_verifier_available": $DMG_CONTAINED_APP_VERIFIER_AVAILABLE,
      "dmg_mounted_app_found": $DMG_MOUNTED_APP_FOUND,
      "dmg_contained_app_codesign_verify_passed": $DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED,
      "dmg_contained_app_gatekeeper_assess_passed": $DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED,
      "dmg_contained_app_matches_signed_source_app": $DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP,
      "checksum_file": "$checksum_file",
      "provenance_file": "$provenance_file"
    }
  ]
}
JSON

cat >"$release_body_file" <<BODY
# Another Dimension Chat macOS $RELEASE_CLASS

This release remains not audited, not production-ready, and sensitive
communication prohibited.

Use only the files attached to the same GitHub Release as release authority:
the app artifact, checksum, provenance, and manifest must agree before opening
the app.

- Artifact: \`$artifact_name\`
- SHA-256: \`$sha256\`
- Architecture: \`$ARCHITECTURE\`
- Signing status: \`$SIGNING_STATUS\`
- Notarization status: \`$NOTARIZATION_STATUS\`
- DMG contained app verified: \`$DMG_CONTAINED_APP_VERIFIER_AVAILABLE/$DMG_MOUNTED_APP_FOUND/$DMG_CONTAINED_APP_CODESIGN_VERIFY_PASSED/$DMG_CONTAINED_APP_GATEKEEPER_ASSESS_PASSED/$DMG_CONTAINED_APP_MATCHES_SIGNED_SOURCE_APP\`
- Release upload authorized by this metadata script: false
BODY

node "$VALIDATOR" "$manifest_file" >/dev/null

cat <<STATUS
status=macos-release-distribution-metadata-prepared
macos_release_distribution_metadata_generator_ready=true
manifest=$manifest_file
checksum=$OUT_DIR/$checksum_file
provenance=$OUT_DIR/$provenance_file
release_body=$release_body_file
macos_release_distribution_dmg_contained_app_evidence_verified=true
release_upload_authorized=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
STATUS

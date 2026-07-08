#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXECUTE="${AD_PREPARE_WINDOWS_PUBLIC_ARTIFACT_METADATA:-0}"
ARTIFACT="${AD_WINDOWS_ARTIFACT:-}"
RELEASE_CLASS="${AD_WINDOWS_RELEASE_CLASS:-unsigned-windows-beta}"
BUNDLE_TARGET="${AD_WINDOWS_BUNDLE_TARGET:-nsis}"
ARCHITECTURE="${AD_WINDOWS_ARTIFACT_ARCHITECTURE:-windows-x64}"
SIGNING_STATUS="${AD_WINDOWS_ARTIFACT_SIGNING_STATUS:-unsigned-hold}"
OUT_DIR="${AD_WINDOWS_ARTIFACT_METADATA_OUT_DIR:-$ROOT/apps/desktop-tauri/public-release/windows-artifact-metadata}"
VALIDATOR="scripts/validate_windows_artifact_manifest.mjs"

[ -f "$VALIDATOR" ] || fail "missing Windows artifact manifest validator"

case "$OUT_DIR" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_WINDOWS_ARTIFACT_METADATA_OUT_DIR must be under an ignored generated artifact directory" ;;
esac

if [ "$EXECUTE" != "1" ]; then
  cat <<'STATUS'
status=windows-public-artifact-metadata-held
windows_artifact_metadata_generator_ready=true
explicit_windows_metadata_generation_required=true
artifact_checksum_manifest_path_ready=true
windows_public_artifact_ready=false
windows_installer_ready=false
windows_public_artifact_upload_allowed=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
STATUS
  exit 0
fi

[ -f "$ARTIFACT" ] || fail "AD_WINDOWS_ARTIFACT must point to an existing artifact"
case "$ARTIFACT" in
  "$ROOT"/apps/desktop-tauri/public-release/*|"$ROOT"/apps/desktop-tauri/beta-artifacts/*) ;;
  *) fail "AD_WINDOWS_ARTIFACT must be under an ignored generated artifact directory" ;;
esac

case "$RELEASE_CLASS" in
  unsigned-windows-beta|signed-windows-rc|stable) ;;
  *) fail "unsupported AD_WINDOWS_RELEASE_CLASS" ;;
esac
case "$BUNDLE_TARGET" in
  msi|nsis|portable-archive|msix) ;;
  *) fail "unsupported AD_WINDOWS_BUNDLE_TARGET" ;;
esac
case "$ARCHITECTURE" in
  windows-x64|windows-arm64) ;;
  *) fail "unsupported AD_WINDOWS_ARTIFACT_ARCHITECTURE" ;;
esac
case "$SIGNING_STATUS" in
  unsigned-hold|signtool-signed|store-signed) ;;
  *) fail "unsupported AD_WINDOWS_ARTIFACT_SIGNING_STATUS" ;;
esac

mkdir -p "$OUT_DIR"
artifact_name="$(basename "$ARTIFACT")"
sha256="$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')"
size_bytes="$(wc -c <"$ARTIFACT" | tr -d ' ')"
version="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
source_commit="$(git rev-parse HEAD)"
checksum_file="$artifact_name.sha256"
manifest_file="$OUT_DIR/WINDOWS_ARTIFACT_MANIFEST.json"
release_body_file="$OUT_DIR/WINDOWS_RELEASE_BODY.md"
provenance_file="$artifact_name.provenance.json"

cp "$ARTIFACT" "$OUT_DIR/$artifact_name"
printf '%s  %s\n' "$sha256" "$artifact_name" >"$OUT_DIR/$checksum_file"

cat >"$OUT_DIR/$provenance_file" <<JSON
{
  "schema_version": "windows-public-artifact-provenance-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "artifact_filename": "$artifact_name",
  "artifact_sha256": "$sha256",
  "release_class": "$RELEASE_CLASS",
  "bundle_target": "$BUNDLE_TARGET",
  "signing_status": "$SIGNING_STATUS",
  "release_upload_authorized": false,
  "windows_public_artifact_ready": false,
  "generated_release_artifacts_commit_allowed": false
}
JSON

cat >"$manifest_file" <<JSON
{
  "schema_version": "windows-public-artifact-manifest-v1",
  "repository": "answndud/another-dimension-chat",
  "source_commit": "$source_commit",
  "version": "$version",
  "release_class": "$RELEASE_CLASS",
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
      "filename": "$artifact_name",
      "sha256": "$sha256",
      "size_bytes": $size_bytes,
      "platform": "windows",
      "architecture": "$ARCHITECTURE",
      "bundle_target": "$BUNDLE_TARGET",
      "signing_status": "$SIGNING_STATUS",
      "checksum_file": "$checksum_file",
      "provenance_file": "$provenance_file",
      "webview2_runtime_required": true,
      "smartscreen_reputation_claim": false,
      "signing_trust_boundary": false
    }
  ]
}
JSON

cat >"$release_body_file" <<BODY
# Another Dimension Chat Windows $RELEASE_CLASS

This candidate remains an unsigned experimental public beta, not audited, not
production-ready, and sensitive communication prohibited. SmartScreen,
Microsoft Store review, and code signing are distribution ergonomics, not
messenger security boundaries.

Use only files attached to the same GitHub Release as release authority: the
Windows artifact, checksum, provenance, and manifest must agree before running
the app.

- Artifact: \`$artifact_name\`
- SHA-256: \`$sha256\`
- Architecture: \`$ARCHITECTURE\`
- Bundle target: \`$BUNDLE_TARGET\`
- Signing status: \`$SIGNING_STATUS\`
- Release upload authorized by this metadata script: false
BODY

node "$VALIDATOR" "$manifest_file" >/dev/null

cat <<STATUS
status=windows-public-artifact-metadata-prepared
windows_artifact_metadata_generator_ready=true
manifest=$manifest_file
checksum=$OUT_DIR/$checksum_file
provenance=$OUT_DIR/$provenance_file
release_body=$release_body_file
windows_public_artifact_ready=false
windows_installer_ready=false
windows_public_artifact_upload_allowed=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
STATUS

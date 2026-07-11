#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi
  fail "missing sha256 tool: expected shasum or sha256sum"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXECUTE="${AD_PREPARE_WINDOWS_PUBLIC_ARTIFACT_METADATA:-0}"
ARTIFACT="${AD_WINDOWS_ARTIFACT:-}"
RELEASE_CLASS="${AD_WINDOWS_RELEASE_CLASS:-unsigned-windows-beta}"
BUNDLE_TARGET="${AD_WINDOWS_BUNDLE_TARGET:-nsis}"
ARCHITECTURE="${AD_WINDOWS_ARTIFACT_ARCHITECTURE:-windows-x64}"
SIGNING_STATUS="${AD_WINDOWS_ARTIFACT_SIGNING_STATUS:-unsigned-hold}"
RUNTIME_MODE="${AD_WINDOWS_RUNTIME_MODE:-manual-e2ee}"
ONION_RUNTIME_COMPILED="${AD_WINDOWS_ONION_RUNTIME_COMPILED:-0}"
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
case "$RUNTIME_MODE" in
  shell-sidecar-pending|manual-e2ee|onion-runtime) ;;
  *) fail "unsupported AD_WINDOWS_RUNTIME_MODE" ;;
esac
case "$ONION_RUNTIME_COMPILED" in
  0|1|false|true) ;;
  *) fail "unsupported AD_WINDOWS_ONION_RUNTIME_COMPILED" ;;
esac
if [ "$ONION_RUNTIME_COMPILED" = "1" ] || [ "$ONION_RUNTIME_COMPILED" = "true" ]; then
  onion_runtime_compiled_json=true
else
  onion_runtime_compiled_json=false
fi
case "$BUNDLE_TARGET" in
  msi) default_artifact_extension=".msi" ;;
  nsis) default_artifact_extension=".exe" ;;
  portable-archive) default_artifact_extension=".zip" ;;
  msix) default_artifact_extension=".msix" ;;
esac

mkdir -p "$OUT_DIR"
artifact_name="$(basename "$ARTIFACT")"
sha256="$(sha256_file "$ARTIFACT")"
size_bytes="$(wc -c <"$ARTIFACT" | tr -d ' ')"
version="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
expected_artifact_prefix="another-dimension-chat-${version}-${RELEASE_CLASS}-${ARCHITECTURE}"
case "$artifact_name" in
  "$expected_artifact_prefix"-*|"$expected_artifact_prefix".*) ;;
  *)
    fail "AD_WINDOWS_ARTIFACT filename must start with $expected_artifact_prefix"
    ;;
esac
source_commit="$(git rev-parse HEAD)"
checksum_file="$artifact_name.sha256"
manifest_file="$OUT_DIR/WINDOWS_ARTIFACT_MANIFEST.json"
manifest_checksum_file="WINDOWS_ARTIFACT_MANIFEST.json.sha256"
release_body_file="$OUT_DIR/WINDOWS_RELEASE_BODY.md"
install_guide_file="$OUT_DIR/INSTALL_UNSIGNED_WINDOWS.md"
release_notes_file="$OUT_DIR/WINDOWS_RELEASE_NOTES.md"
runtime_status_file="$OUT_DIR/WINDOWS_RUNTIME_EVIDENCE_STATUS.md"
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
  "runtime_mode": "$RUNTIME_MODE",
  "onion_runtime_compiled": $onion_runtime_compiled_json,
  "engine_sidecar_required": true,
  "engine_sidecar_packaged": true,
  "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
  "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
  "engine_sidecar_contract_version": 1,
  "engine_sidecar_status_command": "status",
  "engine_sidecar_manual_self_test_command": "manual-self-test",
  "engine_sidecar_manual_self_test_required": true,
  "engine_sidecar_raw_path_returned": false,
  "engine_sidecar_stdout_returned": false,
  "engine_sidecar_stderr_returned": false,
  "engine_sidecar_app_launch_network_allowed": false,
  "engine_sidecar_room_open_network_allowed": false,
  "engine_sidecar_local_runtime_promoted_to_delivery_proof": false,
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
  "manifest_file": "WINDOWS_ARTIFACT_MANIFEST.json",
  "manifest_sha256_file": "$manifest_checksum_file",
  "default_bundle_target": "$BUNDLE_TARGET",
  "default_artifact_extension": "$default_artifact_extension",
  "runtime_mode": "$RUNTIME_MODE",
  "onion_runtime_compiled": $onion_runtime_compiled_json,
  "engine_sidecar_required": true,
  "engine_sidecar_packaged": true,
  "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
  "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
  "engine_sidecar_contract_version": 1,
  "engine_sidecar_status_command": "status",
  "engine_sidecar_manual_self_test_command": "manual-self-test",
  "engine_sidecar_manual_self_test_required": true,
  "engine_sidecar_raw_path_returned": false,
  "engine_sidecar_stdout_returned": false,
  "engine_sidecar_stderr_returned": false,
  "engine_sidecar_app_launch_network_allowed": false,
  "engine_sidecar_room_open_network_allowed": false,
  "engine_sidecar_local_runtime_promoted_to_delivery_proof": false,
  "webview2_runtime_required": true,
  "app_data_resolver": "tauri-app-data",
  "redacted_diagnostics_required": true,
  "auto_update": false,
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
      "artifact_basename": "$artifact_name",
      "sha256": "$sha256",
      "size_bytes": $size_bytes,
      "platform": "windows",
      "architecture": "$ARCHITECTURE",
      "bundle_target": "$BUNDLE_TARGET",
      "runtime_mode": "$RUNTIME_MODE",
      "onion_runtime_compiled": $onion_runtime_compiled_json,
      "engine_sidecar_required": true,
      "engine_sidecar_packaged": true,
      "engine_sidecar_runtime_mode": "manual-e2ee-engine-sidecar",
      "engine_sidecar_protocol": "ad-engine-json-stdio-v1",
      "engine_sidecar_contract_version": 1,
      "engine_sidecar_status_command": "status",
      "engine_sidecar_manual_self_test_command": "manual-self-test",
      "engine_sidecar_manual_self_test_required": true,
      "engine_sidecar_raw_path_returned": false,
      "engine_sidecar_stdout_returned": false,
      "engine_sidecar_stderr_returned": false,
      "engine_sidecar_app_launch_network_allowed": false,
      "engine_sidecar_room_open_network_allowed": false,
      "engine_sidecar_local_runtime_promoted_to_delivery_proof": false,
      "signing_status": "$SIGNING_STATUS",
      "checksum_file": "$checksum_file",
      "checksum_sidecar": "$checksum_file",
      "provenance_file": "$provenance_file",
      "provenance_path": "$provenance_file",
      "artifact_path_class": "generated-release-directory-relative-basename",
      "webview2_runtime_required": true,
      "app_data_resolver": "tauri-app-data",
      "encrypted_store_required": true,
      "redacted_diagnostics_required": true,
      "auto_update": false,
      "smartscreen_reputation_claim": false,
      "signing_trust_boundary": false
    }
  ]
}
JSON

(
  cd "$OUT_DIR"
  manifest_sha="$(sha256_file "$(basename "$manifest_file")")"
  printf '%s  %s\n' "$manifest_sha" "$(basename "$manifest_file")" >"$manifest_checksum_file"
)

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
- Expected artifact prefix: \`$expected_artifact_prefix\`
- SHA-256: \`$sha256\`
- Architecture: \`$ARCHITECTURE\`
- Bundle target: \`$BUNDLE_TARGET\`
- Runtime mode: \`$RUNTIME_MODE\`
- Engine sidecar runtime mode: \`manual-e2ee-engine-sidecar\`
- Engine sidecar manual self-test required: true
- Onion runtime compiled: \`$onion_runtime_compiled_json\`
- Signing status: \`$SIGNING_STATUS\`
- Manifest: \`$(basename "$manifest_file")\`
- Manifest SHA-256 sidecar: \`$manifest_checksum_file\`
- Install guide: \`$(basename "$install_guide_file")\`
- Release notes: \`$(basename "$release_notes_file")\`
- Runtime evidence status: \`$(basename "$runtime_status_file")\`
- WebView2 runtime required: true
- App data resolver: \`tauri-app-data\`
- Release upload authorized by this metadata script: false

The default Windows candidate is a thin shell slice while the engine sidecar is
split out of the Tauri package. It does not compile the Arti/Tor onion runtime
unless \`runtime_mode=onion-runtime\` and \`onion_runtime_compiled=true\` are
present in the same-release manifest.

Do not publish this Windows packet as a public release asset until a real
Windows runtime result packet for the declared runtime mode passes
\`scripts/validate_windows_public_artifact_results.mjs --require-current-head\`
and a separate maintainer release gate explicitly authorizes upload.
BODY

cat >"$install_guide_file" <<GUIDE
# Install Unsigned Windows Candidate

This Windows packet is an unsigned experimental candidate. It is not audited,
not production-ready, and sensitive communication prohibited.

1. Download the Windows artifact and matching \`.sha256\` from the same release
   packet.
2. Verify the checksum before running the installer:

   \`\`\`powershell
   Get-FileHash .\\$artifact_name -Algorithm SHA256
   \`\`\`

   The result must match:

   \`\`\`text
   $sha256
   \`\`\`

3. Expect SmartScreen or unsigned-publisher warnings because this artifact is
   unsigned. Code signing and SmartScreen reputation are distribution
   ergonomics, not the messenger security boundary.
4. Continue only for local testing. Do not use this candidate for real or
   sensitive communication.

This packet still requires a separate real-Windows runtime result for
\`runtime_mode=$RUNTIME_MODE\` before any public Windows artifact claim or
upload claim is allowed.
GUIDE

cat >"$release_notes_file" <<NOTES
# Windows $RELEASE_CLASS Candidate Notes

- Artifact: \`$artifact_name\`
- Architecture: \`$ARCHITECTURE\`
- Bundle target: \`$BUNDLE_TARGET\`
- Runtime mode: \`$RUNTIME_MODE\`
- Onion runtime compiled: \`$onion_runtime_compiled_json\`
- Signing status: \`$SIGNING_STATUS\`
- WebView2 runtime required: true
- Auto-update channel: absent
- App data resolver: \`tauri-app-data\`
- Redacted diagnostics required: true

Non-claims remain active: not audited, not production-ready, sensitive
communication prohibited, no production Windows claim, and no high-risk public
claim. The shell-sidecar Windows slice is separate from the engine and
onion-runtime High-Risk Mode builds.
NOTES

cat >"$runtime_status_file" <<STATUS
# Windows Runtime Evidence Status

real_windows_runtime_result_present=false
runtime_mode=$RUNTIME_MODE
onion_runtime_compiled=$onion_runtime_compiled_json
windows_real_runtime_smoke_passed=false
windows_public_artifact_ready=false
windows_installer_ready=false
windows_public_artifact_upload_allowed=false

This generated packet proves artifact/checksum/provenance/manifest consistency
only. It is not a substitute for a real Windows GUI/runtime result packet.
STATUS

node "$VALIDATOR" "$manifest_file" >/dev/null

cat <<STATUS
status=windows-public-artifact-metadata-prepared
windows_artifact_metadata_generator_ready=true
manifest=$manifest_file
checksum=$OUT_DIR/$checksum_file
provenance=$OUT_DIR/$provenance_file
release_body=$release_body_file
install_guide=$install_guide_file
release_notes=$release_notes_file
runtime_status=$runtime_status_file
windows_public_artifact_ready=false
windows_installer_ready=false
windows_public_artifact_upload_allowed=false
release_body_edit_authorized=false
generated_release_artifacts_commit_allowed=false
STATUS

#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
ENTITLEMENTS="apps/desktop-tauri/src-tauri/Entitlements.plist"
SIGN_NOTARY_SCRIPT="scripts/macos_signed_notarized_execution_path_once.sh"
SIGNED_BUILD_SCRIPT="scripts/build_signed_notarized_macos_release.sh"

for file in "$CONFIG" "$ENTITLEMENTS" "$SIGN_NOTARY_SCRIPT" "$SIGNED_BUILD_SCRIPT" \
  "reference/MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md" \
  "reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md"; do
  [ -f "$file" ] || fail "missing macOS signing config input: $file"
done

node <<'NODE'
const fs = require("node:fs");
const schema = JSON.parse(fs.readFileSync("apps/desktop-tauri/node_modules/@tauri-apps/cli/config.schema.json", "utf8"));
const config = JSON.parse(fs.readFileSync("apps/desktop-tauri/src-tauri/tauri.conf.json", "utf8"));
const macSchema = schema.definitions?.MacConfig?.properties ?? {};
for (const key of ["minimumSystemVersion", "hardenedRuntime", "entitlements", "signingIdentity", "providerShortName"]) {
  if (!Object.hasOwn(macSchema, key)) throw new Error(`tauri schema missing macOS.${key}`);
}
if (config.productName !== "Another Dimension Chat") throw new Error("unexpected productName");
if (config.identifier !== "chat.anotherdimension.prototype") throw new Error("unexpected bundle identifier");
if (config.app?.macOSPrivateApi === true) throw new Error("macOS private API must stay disabled");
if (config.bundle?.active !== true) throw new Error("bundle.active must be true");
const mac = config.bundle?.macOS;
if (!mac || typeof mac !== "object") throw new Error("bundle.macOS config missing");
if (mac.minimumSystemVersion !== "12.0") throw new Error("macOS minimumSystemVersion must be 12.0");
if (mac.hardenedRuntime !== true) throw new Error("macOS hardenedRuntime must be true");
if (mac.entitlements !== "Entitlements.plist") throw new Error("macOS entitlements path mismatch");
if (mac.exceptionDomain !== null) throw new Error("macOS exceptionDomain must be null");
if (mac.signingIdentity !== null) throw new Error("macOS signingIdentity must be supplied at release time, not stored in source");
if (mac.providerShortName !== null) throw new Error("macOS providerShortName must be supplied at release time, not stored in source");
NODE

if command -v plutil >/dev/null 2>&1; then
  plutil -lint "$ENTITLEMENTS" >/dev/null
fi

grep -Fq '<dict/>' "$ENTITLEMENTS" || fail "entitlements must remain an empty dict until code requires a specific entitlement"
for forbidden in \
  "com.apple.security.get-task-allow" \
  "com.apple.security.cs.allow-jit" \
  "com.apple.security.cs.disable-library-validation" \
  "com.apple.security.network.client" \
  "com.apple.security.files.user-selected"; do
  if grep -Fq "$forbidden" "$ENTITLEMENTS"; then
    fail "unexpected macOS entitlement: $forbidden"
  fi
done

grep -Fq -- '--entitlements "$ENTITLEMENTS"' "$SIGN_NOTARY_SCRIPT" ||
  fail "signing script must pass the configured entitlements to codesign"
grep -Fq "AD_BUILD_MACOS_SIGNED_RC" "$SIGNED_BUILD_SCRIPT" ||
  fail "signed release build script must require an explicit build gate"
grep -Fq "AD_DMG_REBUILD_AUTHORIZED" "$SIGNED_BUILD_SCRIPT" ||
  fail "signed release build script must require explicit DMG rebuild authorization"
grep -Fq -- "--bundles app" "$SIGNED_BUILD_SCRIPT" ||
  fail "signed release build script must build the app bundle before DMG creation"
grep -Fq "hdiutil create" "$SIGNED_BUILD_SCRIPT" ||
  fail "signed release build script must create the DMG from the signed app bundle"
grep -Fq "xcrun notarytool submit" "$SIGNED_BUILD_SCRIPT" ||
  fail "signed release build script must submit the generated DMG for notarization"

if git -C "$ROOT" diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

cat <<'STATUS'
status=macos-signing-config-preflight-pass
macos_tauri_signing_config_ready=true
macos_hardened_runtime_configured=true
macos_entitlements_configured=true
macos_entitlements_minimal=true
macos_signing_identity_source_stored=false
macos_notarization_provider_source_stored=false
macos_signed_notarized_release_build_script_ready=true
signed_app_build_path_ready=true
dmg_create_from_signed_app_path_ready=true
developer_id_signing_available=false
notarization_credential_available=false
release_upload_authorized=false
dmg_rebuild_authorized=false
STATUS

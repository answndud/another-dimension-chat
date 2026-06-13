#!/usr/bin/env bash
set -euo pipefail
set +x

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_ignored_path() {
  git check-ignore -q "$1" || fail "generated artifact path is not ignored: $1"
}

require_not_tracked() {
  if git ls-files "$1" | grep -q .; then
    fail "generated artifact path is tracked: $1"
  fi
}

require_no_xtrace() {
  case "${SHELLOPTS:-}" in
    *xtrace*) fail "xtrace must be disabled for release preparation so credentials are not logged" ;;
  esac
}

require_no_xtrace

CONFIG="apps/desktop-tauri/src-tauri/tauri.conf.json"
MACOS_SCRIPT="scripts/build_signed_notarized_macos_release.sh"
WINDOWS_SCRIPT="scripts/prepare_windows_public_artifact_metadata.sh"
READINESS_SCRIPT="scripts/public_release_readiness_preflight.sh"
UNSIGNED_SCRIPT="scripts/prepare_unsigned_public_beta_release.sh"

for file in "$CONFIG" "$MACOS_SCRIPT" "$WINDOWS_SCRIPT" "$READINESS_SCRIPT" "$UNSIGNED_SCRIPT"; do
  require_file "$file"
done

product_name="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.productName)')"
app_version="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.version)')"
identifier="$(node -e 'const c=require("./apps/desktop-tauri/src-tauri/tauri.conf.json"); process.stdout.write(c.identifier)')"
build_channel="${AD_PUBLIC_RELEASE_BUILD_CHANNEL:-beta-onion}"
macos_architecture="${AD_PUBLIC_RELEASE_MACOS_ARCHITECTURE:-macos-aarch64}"
windows_architecture="${AD_PUBLIC_RELEASE_WINDOWS_ARCHITECTURE:-windows-x64}"
windows_release_class="${AD_PUBLIC_RELEASE_WINDOWS_CLASS:-unsigned-windows-beta}"

[ "$product_name" = "Another Dimension Chat" ] || fail "unexpected productName: $product_name"
[ "$identifier" = "chat.anotherdimension.app" ] || fail "Tauri identifier must be public app identifier"

case "$macos_architecture" in
  macos-aarch64|macos-x64) ;;
  *) fail "AD_PUBLIC_RELEASE_MACOS_ARCHITECTURE must be macos-aarch64 or macos-x64" ;;
esac
case "$windows_architecture" in
  windows-x64|windows-arm64) ;;
  *) fail "AD_PUBLIC_RELEASE_WINDOWS_ARCHITECTURE must be windows-x64 or windows-arm64" ;;
esac
case "$windows_release_class" in
  unsigned-windows-beta|signed-windows-rc|stable) ;;
  *) fail "AD_PUBLIC_RELEASE_WINDOWS_CLASS is unsupported" ;;
esac

for path in \
  apps/desktop-tauri/public-release/ \
  apps/desktop-tauri/beta-artifacts/ \
  public-release/ \
  beta-artifacts/; do
  require_ignored_path "$path"
  require_not_tracked "$path"
done

if git diff --cached --name-only | grep -Eq '^(docs/|AGENTS.md|apps/desktop-tauri/(public-release|beta-artifacts)/|public-release/|beta-artifacts/)'; then
  fail "private docs, AGENTS.md, or generated artifact path is staged"
fi

if grep -R "set -x" "$MACOS_SCRIPT" "$WINDOWS_SCRIPT" "$UNSIGNED_SCRIPT" "$READINESS_SCRIPT" >/dev/null; then
  fail "release scripts must not enable xtrace"
fi

macos_signed_artifact="another-dimension-chat-${app_version}-${build_channel}-${macos_architecture}-signed-notarized.dmg"
macos_unsigned_artifact="another-dimension-chat-${app_version}-${build_channel}-${macos_architecture}-unsigned.dmg"
windows_artifact_prefix="another-dimension-chat-${app_version}-${windows_release_class}-${windows_architecture}"

cat <<STATUS
status=public-release-source-path-ready
product_name=$product_name
identifier=$identifier
version=$app_version
build_channel=$build_channel
macos_signed_artifact=$macos_signed_artifact
macos_unsigned_artifact=$macos_unsigned_artifact
windows_artifact_prefix=$windows_artifact_prefix
macos_distribution_script=$MACOS_SCRIPT
windows_distribution_script=$WINDOWS_SCRIPT
source_preflight_script=$READINESS_SCRIPT
checksum_verification=matching-sha256-before-open
provenance_required=true
install_guide_required=true
same_release_asset_authority_required=true
generated_artifacts_tracked=false
generated_artifacts_staged=false
private_docs_staged=false
credential_xtrace_allowed=false
release_upload_authorized=false
artifact_generation_executed=false
STATUS

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKLIST="$ROOT_DIR/reference/PUBLIC_SCREENSHOT_CHECKLIST.md"
GALLERY="$ROOT_DIR/reference/screenshots/README.md"
README="$ROOT_DIR/README.md"
GITIGNORE="$ROOT_DIR/.gitignore"
MAIN_JS="$ROOT_DIR/apps/desktop-tauri/src/main.js"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
INDEX_HTML="$ROOT_DIR/apps/desktop-tauri/index.html"
I18N_JS="$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
SCREENSHOT_DIR="$ROOT_DIR/reference/screenshots"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop screenshot input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop screenshot text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop screenshot text in $file: $text" >&2
    exit 1
  fi
}

for file in "$CHECKLIST" "$GALLERY" "$README" "$GITIGNORE" "$MAIN_JS" "$UI_SMOKE" "$INDEX_HTML" "$I18N_JS"; do
  require_file "$file"
done

require_text "$GITIGNORE" "apps/desktop-tauri/screenshot-candidates/"

for screenshot in \
  macos-public-beta-first-run-desktop.png \
  macos-public-beta-first-run-mobile.png \
  macos-public-beta-room-flow-desktop.png \
  macos-public-beta-manual-envelope-desktop.png \
  macos-public-beta-diagnostics-desktop.png \
  macos-public-beta-profile-lifecycle-desktop.png
do
  require_file "$SCREENSHOT_DIR/$screenshot"
  require_text "$GALLERY" "$screenshot"
done

require_text "$README" "reference/PUBLIC_SCREENSHOT_CHECKLIST.md"
require_text "$README" "reference/screenshots/README.md"
require_text "$README" "do not post screenshots that show private room data"

require_text "$CHECKLIST" "http://127.0.0.1:1420/?reset-preview=1&screenshot-safe=1"
require_text "$CHECKLIST" "apps/desktop-tauri/screenshot-candidates/"
require_text "$CHECKLIST" "reference/screenshots/"
require_text "$CHECKLIST" "not GitHub Release assets"
require_text "$CHECKLIST" "First-run warning and checklist"
require_text "$CHECKLIST" "Profile unlock panel before any profile or passphrase is typed"
require_text "$CHECKLIST" "Invite/manual envelope flow before any invite code, payload, endpoint, or"
require_text "$CHECKLIST" "Public diagnostics and recovery guide"
require_text "$CHECKLIST" "Local data lifecycle guide and blank confirmation inputs"
require_text "$CHECKLIST" "profile names"
require_text "$CHECKLIST" "passphrases"
require_text "$CHECKLIST" "invite codes"
require_text "$CHECKLIST" "delivery codes"
require_text "$CHECKLIST" "onion endpoints"
require_text "$CHECKLIST" "payloads"
require_text "$CHECKLIST" "safety phrases"
require_text "$CHECKLIST" "message text"
require_text "$CHECKLIST" "local paths"
require_text "$CHECKLIST" "raw logs or crash dumps"
require_text "$CHECKLIST" "private keys, key material, tokens, or secrets"
require_text "$CHECKLIST" "unsigned experimental public beta"
require_text "$CHECKLIST" "sensitive communication prohibited"
require_text "$CHECKLIST" "not audited"
require_text "$CHECKLIST" "not production-ready"
require_text "$CHECKLIST" "1440x1000"
require_text "$CHECKLIST" "390x844"
require_text "$CHECKLIST" "do not overlap or overflow"
require_text "$CHECKLIST" "Keep screenshots out of release assets unless a separate release task reviews"

require_text "$GALLERY" "unsigned experimental public beta"
require_text "$GALLERY" "Sensitive communication is prohibited"
require_text "$GALLERY" "not GitHub Release assets"
require_text "$GALLERY" "not production-ready evidence"
require_text "$GALLERY" "must not be uploaded to the existing GitHub Release without a separate"
require_text "$GALLERY" "external onion delivery success"
require_text "$GALLERY" "audit completion"
require_text "$GALLERY" "production readiness"
require_text "$GALLERY" "sensitive communication safety"

require_text "$MAIN_JS" "function screenshotSafePreviewModeEnabled"
require_text "$MAIN_JS" "screenshot-safe"
require_text "$MAIN_JS" "[\"localhost\", \"127.0.0.1\", \"::1\"]"
require_text "$MAIN_JS" "function applyScreenshotSafePreviewMode"
require_text "$MAIN_JS" "is-screenshot-safe-preview"
require_text "$MAIN_JS" "fields.productionProfileName"
require_text "$MAIN_JS" "fields.productionProfilePassphrase"
require_text "$MAIN_JS" "fields.productionPairingEndpoint"
require_text "$MAIN_JS" "fields.productionMessageBody"
require_text "$MAIN_JS" "fields.productionTwoProfileMessage"
require_text "$MAIN_JS" "fields.createdInviteCodeDisplay"
require_text "$MAIN_JS" "fields.receivedInviteCode"
require_text "$MAIN_JS" "fields.localPrivateRouteCode"
require_text "$MAIN_JS" "fields.peerPrivateRouteCode"
require_text "$MAIN_JS" "fields.fieldTestReport"
require_text "$MAIN_JS" "fields.publicBetaDiagnostics"
require_text "$MAIN_JS" "private_fields_blank=true"
require_text "$MAIN_JS" "window.setTimeout(applyScreenshotSafePreviewMode, 50)"

require_text "$UI_SMOKE" "screenshot-safe browser preview blanks public screenshot fields"
require_text "$UI_SMOKE" "first launch public beta warning keeps release and network boundaries visible"
require_text "$UI_SMOKE" "manual encrypted envelope guide keeps local default flow visible"
require_text "$UI_SMOKE" "public diagnostics recovery guide keeps support-safe next actions visible"
require_text "$UI_SMOKE" "local data lifecycle actions expose destructive local-only boundaries"

for file in "$CHECKLIST" "$GALLERY" "$README" "$INDEX_HTML" "$I18N_JS"; do
  reject_text "$file" "external onion delivery succeeded"
  reject_text "$file" "external onion delivery works"
  reject_text "$file" "production-ready public beta"
  reject_text "$file" "safe for sensitive communication"
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "audited secure messenger"
  reject_text "$file" "is Briar-equivalent"
  reject_text "$file" "is Cwtch-equivalent"
  reject_text "$file" "censorship-resistant"
done

printf 'status=desktop-screenshot-safety-ready\n'
printf 'screenshot_safe_preview_mode=localhost-only\n'
printf 'public_screenshot_assets_committed=true\n'
printf 'public_screenshot_assets=reference/screenshots\n'
printf 'screenshot_candidates_committed=false\n'
printf 'generated_screenshot_dir_ignored=apps/desktop-tauri/screenshot-candidates\n'
printf 'private_screenshot_data_allowed=false\n'
printf 'release_asset_screenshots_requires_separate_review=true\n'

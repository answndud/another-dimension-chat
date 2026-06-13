#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_HTML="$ROOT_DIR/apps/desktop-tauri/index.html"
I18N_JS="$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
PRIVATE_DELIVERY_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"
PRIVATE_DELIVERY_TEST="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js"
INTAKE="$ROOT_DIR/reference/PUBLIC_INTAKE_POLICY.md"
README="$ROOT_DIR/README.md"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop error/recovery input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop error/recovery text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop error/recovery text in $file: $text" >&2
    exit 1
  fi
}

for file in "$INDEX_HTML" "$I18N_JS" "$UI_SMOKE" "$PRIVATE_DELIVERY_STATE" "$PRIVATE_DELIVERY_TEST" "$INTAKE" "$README"; do
  require_file "$file"
done

require_text "$INDEX_HTML" "public-recovery-guide"
require_text "$INDEX_HTML" "publicRecoveryInstall"
require_text "$INDEX_HTML" "publicRecoveryProfileLocked"
require_text "$INDEX_HTML" "publicRecoveryPayloadReplay"
require_text "$INDEX_HTML" "publicRecoveryTransportPolicy"
require_text "$INDEX_HTML" "publicRecoveryLifecycle"

require_text "$I18N_JS" "Install/checksum failure: stop, verify the same-release .sha256"
require_text "$I18N_JS" "Profile locked: retry the passphrase or create a new local profile"
require_text "$I18N_JS" "Malformed payload or replay rejected: ask for a fresh envelope"
require_text "$I18N_JS" "Transport unavailable or policy blocked: stay on manual envelope exchange"
require_text "$I18N_JS" "Lifecycle confirmation required: confirm the local-only delete or wipe scope"

for term in \
  "checksum-install-failure" \
  "profile-locked" \
  "malformed-payload" \
  "replay-rejected" \
  "transport-unavailable" \
  "policy-blocked" \
  "lifecycle-confirmation-required"; do
  require_text "$INTAKE" "$term"
done

require_text "$PRIVATE_DELIVERY_STATE" "payload_boundary=status-build-failure-class-recovery-action-desktop-acceptance-only"
require_text "$PRIVATE_DELIVERY_STATE" "diagnostics_copy_boundary=redacted-status-build-failure-class-recovery-action-only"
require_text "$PRIVATE_DELIVERY_STATE" "failure_class="
require_text "$PRIVATE_DELIVERY_STATE" "recovery_next_action="
require_text "$PRIVATE_DELIVERY_TEST" "public beta diagnostics keeps only support-safe status, build, failure class, and next action"
require_text "$PRIVATE_DELIVERY_TEST" "public diagnostics failure class maps detailed blockers to broad support classes"
require_text "$UI_SMOKE" "public diagnostics recovery guide keeps support-safe next actions visible"
if ! grep -Fq "failure class, and recovery next action" "$README"; then
  require_text "$ROOT_DIR/SECURITY.md" "failure class, and recovery next action"
fi
if ! grep -Fq "Do not post invite codes, payloads" "$README"; then
  require_text "$INTAKE" "invite codes, payloads"
fi

for file in "$INDEX_HTML" "$I18N_JS" "$INTAKE" "$PRIVATE_DELIVERY_STATE" "$PRIVATE_DELIVERY_TEST" "$README"; do
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "safe for sensitive communication"
done

printf 'status=desktop-error-recovery-copy-ready\n'
printf 'diagnostics_payload=status-build-failure-class-recovery-action\n'
printf 'recovery_vocabulary=checksum-install-failure#profile-locked#malformed-payload#replay-rejected#transport-unavailable#policy-blocked#lifecycle-confirmation-required\n'
printf 'raw_logs_allowed=false\n'
printf 'local_paths_allowed=false\n'
printf 'endpoints_allowed=false\n'
printf 'secrets_allowed=false\n'

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_HTML="$ROOT_DIR/apps/desktop-tauri/index.html"
I18N_JS="$ROOT_DIR/apps/desktop-tauri/src/i18n.js"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
ACTION_STATE_TEST="$ROOT_DIR/apps/desktop-tauri/src/action-state.test.js"
PRIVATE_DELIVERY_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"
MATRIX="$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop manual flow input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop manual flow text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop manual flow text in $file: $text" >&2
    exit 1
  fi
}

for file in "$INDEX_HTML" "$I18N_JS" "$UI_SMOKE" "$ACTION_STATE_TEST" "$PRIVATE_DELIVERY_STATE" "$MATRIX"; do
  require_file "$file"
done

require_text "$INDEX_HTML" "manual-flow-guide"
require_text "$INDEX_HTML" "manualFlowGuideStepInvite"
require_text "$INDEX_HTML" "manualFlowGuideStepExport"
require_text "$INDEX_HTML" "manualFlowGuideStepImport"
require_text "$INDEX_HTML" "manualFlowGuideStepRecovery"
require_text "$INDEX_HTML" "manualFlowGuideBoundary"
require_text "$INDEX_HTML" "Receive attempts start after this explicit action; external delivery is not claimed."
reject_text "$INDEX_HTML" "New messages arrive after you turn this on."

require_text "$I18N_JS" "Default path is local/manual encrypted envelope exchange"
require_text "$I18N_JS" "export, carry through your existing channel, import, then reply"
require_text "$I18N_JS" "Create or join an invite room, then compare the safety phrase."
require_text "$I18N_JS" "Write a message and export the encrypted envelope from this device."
require_text "$I18N_JS" "Import the remote envelope, show plaintext locally, then write the reply."
require_text "$I18N_JS" "Use the selected row to retry or cancel pending sends; delete only local conversation records."
require_text "$I18N_JS" "Manual local/default path: no network I/O, no automatic delivery, and no external delivery claim."

require_text "$UI_SMOKE" "manual encrypted envelope guide keeps local default flow visible"
require_text "$UI_SMOKE" "manual message actions ignore stale inputs before updating current UI"
require_text "$UI_SMOKE" "message send retry and cancel results stay scoped to the current room"
require_text "$UI_SMOKE" "conversation rows show manual lifecycle summary without stronger delivery claims"
require_text "$ACTION_STATE_TEST" "manual check keeps imported message review before reply writing"
require_text "$ACTION_STATE_TEST" "failed outbound messages stay retryable or cancelable from the active device"
require_text "$PRIVATE_DELIVERY_STATE" "default_transport_path=local-manual-encrypted-envelope-exchange"
require_text "$PRIVATE_DELIVERY_STATE" "default_transport_network_io=false"
require_text "$PRIVATE_DELIVERY_STATE" "external_delivery_claim=false"
require_text "$MATRIX" "invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim"

for file in "$INDEX_HTML" "$I18N_JS" "$UI_SMOKE" "$ACTION_STATE_TEST" "$PRIVATE_DELIVERY_STATE"; do
  reject_text "$file" "external onion delivery succeeded"
  reject_text "$file" "external onion delivery works"
  reject_text "$file" "Message delivered. You can continue the conversation."
  reject_text "$file" "Message sent."
  reject_text "$file" "sensitive communication allowed"
  reject_text "$file" "production-ready public beta"
done

printf 'status=desktop-manual-flow-usability-ready\n'
printf 'manual_default_path=local-manual-encrypted-envelope-exchange\n'
printf 'network_io=false\n'
printf 'automatic_delivery=false\n'
printf 'external_delivery_claim=false\n'
printf 'flow=invite#create#join#verify#send#export#import#reply#retry#cancel#delete\n'

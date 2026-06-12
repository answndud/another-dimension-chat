#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop beta acceptance matrix input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop beta acceptance matrix text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop beta acceptance matrix text in $file: $text" >&2
    exit 1
  fi
}

MAIN_JS="$ROOT_DIR/apps/desktop-tauri/src/main.js"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
ACTION_STATE_TEST="$ROOT_DIR/apps/desktop-tauri/src/action-state.test.js"
PRIVATE_DELIVERY_TEST="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js"
PRIVATE_DELIVERY_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"

for file in \
  "$MAIN_JS" \
  "$UI_SMOKE" \
  "$ACTION_STATE_TEST" \
  "$PRIVATE_DELIVERY_TEST" \
  "$PRIVATE_DELIVERY_STATE" \
  "$ROOT_DIR/README.md" \
  "$ROOT_DIR/SECURITY.md" \
  "$ROOT_DIR/apps/desktop-tauri/README.md" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"; do
  require_file "$file"
done

ACCEPTED_ITEMS="invite#verify#send#receive#retry#cancel#import#delete#unlock#diagnostics#release-non-claim"
EXCLUDED_ITEMS="android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication"
ACCEPTANCE_LABEL="desktop local/manual beta readiness"

require_text "$ROOT_DIR/README.md" "Desktop-only v0.1 acceptance matrix"
require_text "$ROOT_DIR/README.md" "$ACCEPTANCE_LABEL"
require_text "$ROOT_DIR/README.md" "$ACCEPTED_ITEMS"
require_text "$ROOT_DIR/README.md" "$EXCLUDED_ITEMS"
require_text "$ROOT_DIR/SECURITY.md" "Desktop-only v0.1 acceptance matrix"
require_text "$ROOT_DIR/SECURITY.md" "$ACCEPTANCE_LABEL"
require_text "$ROOT_DIR/SECURITY.md" "$ACCEPTED_ITEMS"
require_text "$ROOT_DIR/SECURITY.md" "$EXCLUDED_ITEMS"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "Desktop-only v0.1 acceptance matrix"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "$ACCEPTANCE_LABEL"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "$ACCEPTED_ITEMS"
require_text "$ROOT_DIR/apps/desktop-tauri/README.md" "$EXCLUDED_ITEMS"

require_text "$MAIN_JS" "function saveInviteRoomOutboundMessage"
require_text "$MAIN_JS" "function renderTwoProfileSafetyConfirm"
require_text "$MAIN_JS" "async function runProductionTwoProfileMessageRoundtrip"
require_text "$MAIN_JS" "async function startProductionTwoProfileOnionReceive"
require_text "$MAIN_JS" "async function retryTwoProfileOutboundEntry"
require_text "$MAIN_JS" "async function cancelTwoProfileOutboundEntry"
require_text "$MAIN_JS" "async function importProductionMessageEnvelope"
require_text "$MAIN_JS" "async function deleteProductionConversation"
require_text "$MAIN_JS" "async function unlockProductionProfile"
require_text "$MAIN_JS" "function refreshPublicBetaDiagnostics"
require_text "$MAIN_JS" "function copyPublicBetaDiagnostics"
require_text "$MAIN_JS" "release_non_claims=unsigned-experimental-public-beta#not-audited#not-production-ready#sensitive-communication-prohibited"

require_text "$UI_SMOKE" "main chat surface keeps invite, message, receive, and retry entry points"
require_text "$UI_SMOKE" "message send retry and cancel results stay scoped to the current room"
require_text "$UI_SMOKE" "public diagnostics summary includes desktop completion without production claims"
require_text "$UI_SMOKE" "deleteProductionConversation"
require_text "$UI_SMOKE" "unlockProductionProfile"
require_text "$UI_SMOKE" "importProductionMessageEnvelope"
require_text "$ACTION_STATE_TEST" "failed outbound messages stay retryable or cancelable from the active device"
require_text "$PRIVATE_DELIVERY_TEST" "public beta diagnostics keeps only support-safe status, build, failure class, and next action"
require_text "$PRIVATE_DELIVERY_TEST" "desktop-first completion reports local private flow readiness without security claims"

require_text "$PRIVATE_DELIVERY_STATE" "scope: \"desktop-local-private-flow\""
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_external_delivery_claim=false"
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_production_claim=false"
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_sensitive_use_claim=false"

for file in "$ROOT_DIR/README.md" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/apps/desktop-tauri/README.md"; do
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  require_text "$file" "External onion delivery is outside the v0.1 public product claim"
  reject_text "$file" "desktop acceptance proves external onion delivery"
  reject_text "$file" "desktop acceptance proves production readiness"
  reject_text "$file" "desktop acceptance proves security readiness"
  reject_text "$file" "desktop acceptance allows sensitive communication"
done

echo "status=desktop-beta-acceptance-matrix-source-ready"
echo "acceptance_scope=desktop-local-manual-beta-readiness"
echo "accepted_items=$ACCEPTED_ITEMS"
echo "excluded_items=$EXCLUDED_ITEMS"
echo "external_delivery_claim=false"
echo "production_ready_claim=false"
echo "security_ready_claim=false"
echo "sensitive_communication_allowed=false"
echo "next=use this matrix as source-level v0.1 desktop acceptance; do not extend it to mobile runtime or external peer evidence"

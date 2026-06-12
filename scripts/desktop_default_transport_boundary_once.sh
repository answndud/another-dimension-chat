#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop default transport boundary input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop default transport boundary text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop default transport boundary text in $file: $text" >&2
    exit 1
  fi
}

PUBLIC_FILES=(
  "$ROOT_DIR/README.md"
  "$ROOT_DIR/SECURITY.md"
  "$ROOT_DIR/apps/desktop-tauri/README.md"
)

for file in \
  "${PUBLIC_FILES[@]}" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/main.js" \
  "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" \
  "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" \
  "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"; do
  require_file "$file"
done

for file in "${PUBLIC_FILES[@]}"; do
  require_text "$file" "Desktop Default Practical Transport Boundary"
  require_text "$file" "local manual encrypted envelope exchange"
  require_text "$file" "boundary for v0.1"
  require_text "$file" "network_io=false"
  require_text "$file" "automatic_delivery=false"
  require_text "$file" "central_message_server=false"
  require_text "$file" "push_notification_dependency=false"
  require_text "$file" "central_contact_discovery=false"
  require_text "$file" "high-risk onion/Tor path is separate"
  require_text "$file" "explicit-user-triggered"
  require_text "$file" "fail-closed"
  require_text "$file" "onion-only"
  require_text "$file" "direct_fallback=false"
  require_text "$file" "unsigned experimental public beta"
  require_text "$file" "not audited"
  require_text "$file" "not production-ready"
  require_text "$file" "sensitive communication prohibited"
  reject_text "$file" "default transport proves external delivery"
  reject_text "$file" "default transport is production-ready"
  reject_text "$file" "default transport is audited"
  reject_text "$file" "default transport allows sensitive communication"
done

require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_path=local-manual-encrypted-envelope-exchange"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_network_io=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_automatic_delivery=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_central_message_server=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_push_dependency=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "default_transport_central_contact_discovery=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "high_risk_onion_path=explicit-user-triggered-fail-closed"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "high_risk_onion_direct_fallback=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js" "automatic_network_on_launch=false"
require_text "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" "default transport boundary keeps the public diagnostic path manual and non-centralized"
require_text "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" "private delivery stays explicit before network work starts"
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "function enablePrivateDeliveryPermission"
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "function ensurePrivateDeliveryRuntimeReady"
require_text "$ROOT_DIR/apps/desktop-tauri/src/main.js" "function twoProfileComposerPrimaryIntent"

require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "desktop_default_transport_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_network_io=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_automatic_delivery=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_central_message_server=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_push_dependency=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "default_transport_central_contact_discovery=false"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "high_risk_onion_path=explicit-user-triggered-fail-closed"
require_text "$ROOT_DIR/scripts/public_release_readiness_preflight.sh" "high_risk_onion_direct_fallback=false"
require_text "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh" "desktop_default_transport_boundary_once.sh"
require_text "$ROOT_DIR/scripts/public_claim_acceptance_once.sh" "desktop_default_transport_boundary_once.sh"

bash -n "$ROOT_DIR/scripts/public_release_readiness_preflight.sh"
bash -n "$ROOT_DIR/scripts/public_beta_gap_acceptance_once.sh"
bash -n "$ROOT_DIR/scripts/public_claim_acceptance_once.sh"

echo "status=desktop-default-transport-boundary-source-ready"
echo "default_transport_boundary=local-manual-envelope-default-high-risk-onion-explicit"
echo "default_transport_path=local-manual-encrypted-envelope-exchange"
echo "default_transport_network_io=false"
echo "default_transport_automatic_delivery=false"
echo "default_transport_central_message_server=false"
echo "default_transport_push_dependency=false"
echo "default_transport_central_contact_discovery=false"
echo "automatic_network_on_launch=false"
echo "high_risk_onion_path=explicit-user-triggered-fail-closed"
echo "high_risk_onion_direct_fallback=false"
echo "external_delivery_claim=false"
echo "production_ready_claim=false"
echo "security_ready_claim=false"
echo "sensitive_communication_allowed=false"
echo "next_development_axis=production-e2ee-session-lifecycle-hardening#local-storage-lifecycle-completion"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing desktop single-machine acceptance input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing desktop single-machine acceptance text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden desktop single-machine acceptance text in $file: $text" >&2
    exit 1
  fi
}

run_and_require() {
  local name="$1"
  local expected="$2"
  shift 2
  local output
  output="$("$@")"
  printf '%s\n' "$output" | grep -Fq -- "$expected" || {
    echo "FAIL desktop single-machine acceptance step $name missing: $expected" >&2
    printf '%s\n' "$output" >&2
    exit 1
  }
  echo "step_${name}=pass"
}

MAIN_JS="$ROOT_DIR/apps/desktop-tauri/src/main.js"
UI_SMOKE="$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js"
ACTION_STATE_TEST="$ROOT_DIR/apps/desktop-tauri/src/action-state.test.js"
PRIVATE_DELIVERY_TEST="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js"
PRIVATE_DELIVERY_STATE="$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.js"
PACKAGE_JSON="$ROOT_DIR/apps/desktop-tauri/package.json"

for file in \
  "$MAIN_JS" \
  "$UI_SMOKE" \
  "$ACTION_STATE_TEST" \
  "$PRIVATE_DELIVERY_TEST" \
  "$PRIVATE_DELIVERY_STATE" \
  "$PACKAGE_JSON" \
  "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh" \
  "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh" \
  "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh"; do
  require_file "$file"
done

ACCEPTED_ITEMS="invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#lifecycle#manual-envelope#pending-state#default-transport#local-manual-e2ee-boundary#release-non-claim"
EXCLUDED_ITEMS="android-ios-runtime#mobile-wrapper-scaffold#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication#release-upload#dmg-rebuild#generated-artifact-commit"

require_text "$PACKAGE_JSON" "\"test:desktop-single-machine\": \"../../scripts/desktop_single_machine_acceptance_once.sh\""
require_text "$UI_SMOKE" "main chat surface keeps invite, message, receive, and retry entry points"
require_text "$UI_SMOKE" "manual message envelope slots are scoped to the room fingerprint"
require_text "$UI_SMOKE" "destructive lifecycle actions clear stale room retry state before rebuild"
require_text "$UI_SMOKE" "public diagnostics summary includes desktop completion without production claims"
require_text "$ACTION_STATE_TEST" "manual check keeps imported message review before reply writing"
require_text "$ACTION_STATE_TEST" "failed outbound messages stay retryable or cancelable from the active device"
require_text "$PRIVATE_DELIVERY_TEST" "public beta diagnostics keeps only support-safe status, build, failure class, and next action"
require_text "$PRIVATE_DELIVERY_TEST" "desktop-first completion reports local private flow readiness without security claims"
require_text "$PRIVATE_DELIVERY_STATE" "default_transport_path=local-manual-encrypted-envelope-exchange"
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_external_delivery_claim=false"
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_production_claim=false"
require_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_sensitive_use_claim=false"
require_text "$MAIN_JS" "public_intake_policy_fields_aligned="
require_text "$MAIN_JS" "clearActiveRoomInteractionStateAfterLocalLifecycle"
require_text "$MAIN_JS" "currentComposerPendingOutboundAction"
require_text "$MAIN_JS" "release_non_claims=unsigned-experimental-public-beta#not-audited#not-production-ready#sensitive-communication-prohibited"

reject_text "$MAIN_JS" "external onion delivery verified by single-machine acceptance"
reject_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_external_delivery_claim=true"
reject_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_production_claim=true"
reject_text "$PRIVATE_DELIVERY_STATE" "desktop_acceptance_sensitive_use_claim=true"

run_and_require beta_matrix "status=desktop-beta-acceptance-matrix-source-ready" \
  "$ROOT_DIR/scripts/desktop_beta_acceptance_matrix_once.sh"
run_and_require diagnostics_intake "status=desktop-real-user-test-prep-source-ready" \
  "$ROOT_DIR/scripts/desktop_real_user_test_prep_once.sh"
run_and_require default_transport "status=desktop-default-transport-boundary-source-ready" \
  "$ROOT_DIR/scripts/desktop_default_transport_boundary_once.sh"

node --test \
  "$ROOT_DIR/apps/desktop-tauri/src/private-delivery-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/action-state.test.js" \
  "$ROOT_DIR/apps/desktop-tauri/src/ui-smoke.test.js" >/dev/null
echo "step_targeted_desktop_node_tests=pass"

echo "status=desktop-single-machine-acceptance-ready"
echo "acceptance_scope=desktop-single-machine-local-manual-private-flow"
echo "accepted_items=$ACCEPTED_ITEMS"
echo "excluded_items=$EXCLUDED_ITEMS"
echo "release_upload_performed=false"
echo "dmg_rebuild_performed=false"
echo "generated_artifacts_committed=false"
echo "external_peer_evidence_required=false"
echo "external_onion_delivery_claim=false"
echo "production_ready_claim=false"
echo "security_ready_claim=false"
echo "sensitive_communication_allowed=false"
echo "current_limited_desktop_completion=99"
echo "next=final desktop 100 source acceptance recheck"

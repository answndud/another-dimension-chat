#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/desktop-tauri"
TAURI_DIR="$APP_DIR/src-tauri"

require_contains() {
  local file="$1"
  local pattern="$2"

  if ! grep -q -- "$pattern" "$file"; then
    echo "missing expected Tauri scaffold pattern in $file: $pattern" >&2
    exit 1
  fi
}

require_status_field() {
  local field="$1"
  local value="$2"

  require_contains "$TAURI_DIR/src/status.rs" "$field: \"$value\""
  require_contains "$APP_DIR/src/main.js" "status.$field"
}

require_status_copy() {
  local value="$1"

  require_contains "$APP_DIR/index.html" "$value"
}

required_files=(
  "$APP_DIR/README.md"
  "$APP_DIR/.npmrc"
  "$APP_DIR/package.json"
  "$APP_DIR/package-lock.json"
  "$TAURI_DIR/Cargo.lock"
  "$APP_DIR/index.html"
  "$APP_DIR/src/action-state.js"
  "$APP_DIR/src/action-state.test.js"
  "$APP_DIR/src/main.js"
  "$APP_DIR/src/styles.css"
  "$APP_DIR/vite.config.js"
  "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh"
  "$TAURI_DIR/Cargo.toml"
  "$TAURI_DIR/build.rs"
  "$TAURI_DIR/src/lib.rs"
  "$TAURI_DIR/src/main.rs"
  "$TAURI_DIR/src/status.rs"
  "$TAURI_DIR/icons/icon.png"
  "$TAURI_DIR/tauri.conf.json"
)

for file in "${required_files[@]}"; do
  test -f "$file"
done

require_contains "$TAURI_DIR/tauri.conf.json" '"frontendDist": "../dist"'
require_contains "$TAURI_DIR/tauri.conf.json" '"devUrl": "http://localhost:1420"'
require_contains "$TAURI_DIR/src/lib.rs" 'prototype_status'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_demo'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_message_loop'
require_contains "$TAURI_DIR/src/lib.rs" 'DevLocalMessageLoopResult'
require_contains "$TAURI_DIR/src/lib.rs" 'parse_loop_messages'
require_contains "$TAURI_DIR/src/lib.rs" 'sanitize_loop_messages'
require_contains "$TAURI_DIR/src/lib.rs" 'steps: Vec<DevLocalDemoStep>'
require_contains "$TAURI_DIR/src/lib.rs" 'simulation: DevLocalSimulation'
require_contains "$TAURI_DIR/src/lib.rs" 'build_demo_simulation'
require_contains "$TAURI_DIR/src/lib.rs" 'DevLocalPeer'
require_contains "$TAURI_DIR/src/lib.rs" 'safety_number'
require_contains "$TAURI_DIR/src/lib.rs" 'message_body'
require_contains "$TAURI_DIR/src/lib.rs" 'first_run_hint'
require_contains "$TAURI_DIR/src/lib.rs" 'parse_demo_steps'
require_contains "$TAURI_DIR/src/lib.rs" 'status: "completed"'
require_contains "$TAURI_DIR/src/lib.rs" 'mod status;'
require_contains "$TAURI_DIR/src/lib.rs" 'pub use status::PrototypeStatus;'
require_contains "$TAURI_DIR/src/lib.rs" 'redacted_prototype_status()'
require_contains "$TAURI_DIR/src/lib.rs" 'dev_local_message_loop'
require_contains "$TAURI_DIR/src/lib.rs" 'production_profile_unlock'
require_contains "$TAURI_DIR/src/lib.rs" 'production_profile_list'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_profile_unlock'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_profile_list'
require_contains "$TAURI_DIR/src/lib.rs" 'app_data_dir()'
require_contains "$TAURI_DIR/src/lib.rs" 'production_pairing_payload_export'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_pairing_payload_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_pairing_session_draft_save'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_pairing_session_draft_save'
require_contains "$TAURI_DIR/src/lib.rs" 'production_session_state_check'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_session_state_check'
require_contains "$TAURI_DIR/src/lib.rs" 'production_handshake_init_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_handshake_reply_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_handshake_finish_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_handshake_finish_import'
require_contains "$TAURI_DIR/src/lib.rs" 'production_message_envelope_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_message_envelope_import'
require_contains "$TAURI_DIR/src/lib.rs" 'production_message_received_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_message_transcript_export'
require_contains "$TAURI_DIR/src/lib.rs" 'production_local_roundtrip'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_local_roundtrip'
require_contains "$TAURI_DIR/src/lib.rs" 'cargo'
require_contains "$TAURI_DIR/src/lib.rs" 'demo'
require_contains "$TAURI_DIR/src/lib.rs" 'local'
require_contains "$TAURI_DIR/src/lib.rs" 'local-loop'
require_contains "$TAURI_DIR/src/status.rs" 'pub fn redacted_prototype_status() -> PrototypeStatus'
require_contains "$TAURI_DIR/src/status.rs" 'secure_release: false'
require_contains "$TAURI_DIR/src/status.rs" 'usable_messaging: false'
require_status_field 'core_status' 'core boundary only'
require_status_field 'profile_status' 'profile boundary only'
require_status_field 'pairing_status' 'pairing boundary only'
require_status_field 'production_session_status' 'snow Noise XX synchronous evaluation boundary only'
require_status_field 'production_self_test_status' 'CLI production boundary self-test only'
require_contains "$TAURI_DIR/src/status.rs" 'production_session_non_readiness:'
require_contains "$TAURI_DIR/src/status.rs" 'no production E2EE claim network transport durable persistence or async messaging'
require_contains "$APP_DIR/src/main.js" 'status.production_session_non_readiness'
require_status_field 'production_preflight_status' 'read-only production skeleton blockers copy'
require_contains "$TAURI_DIR/src/status.rs" 'production_preflight_blockers:'
require_contains "$TAURI_DIR/src/status.rs" 'session E2EE false transport send receive false storage rollback not-provided messaging false'
require_contains "$APP_DIR/src/main.js" 'status.production_preflight_blockers'
require_status_field 'session_durable_state_status' 'store-write adapter boundary; product unlock disabled'
require_status_field 'session_unlock_policy_status' 'high-risk passphrase required OS-keystore-only rejected'
require_contains "$TAURI_DIR/src/status.rs" 'session_unlock_non_readiness:'
require_contains "$TAURI_DIR/src/status.rs" 'product unlock durable persistence rollback runtime messaging disabled'
require_contains "$APP_DIR/src/main.js" 'status.session_unlock_non_readiness'
require_status_field 'session_unlock_cli_rejection_status' 'redacted product-unlock-disabled boundary copy'
require_contains "$TAURI_DIR/src/status.rs" 'session_unlock_cli_rejection_flags:'
require_contains "$TAURI_DIR/src/status.rs" 'storage_opened=false session_records_written=false key_material_exposed=false runtime_messaging=false'
require_contains "$APP_DIR/src/main.js" 'status.session_unlock_cli_rejection_flags'
require_status_field 'transport_status' 'pre-network fail-closed only'
require_status_field 'network_execution_status' 'network execution disabled'
require_status_field 'experimental_transport_status' 'manual bootstrap gate summary only'
require_contains "$TAURI_DIR/src/status.rs" 'bootstrap_status_classification:'
require_contains "$TAURI_DIR/src/status.rs" 'network-disabled; censorship-or-bridge-required; timeout-or-transient-network-failure'
require_contains "$APP_DIR/src/main.js" 'status.bootstrap_status_classification'
require_contains "$APP_DIR/src/main.js" 'status.production_session_status'
require_contains "$APP_DIR/src/main.js" 'status.production_self_test_status'
require_status_field 'transport_io_status' 'hosting stream envelope messaging disabled'
require_status_field 'storage_status' 'ADREC1 storage spike only'
require_status_field 'verification_status' 'lightweight checks only'
require_contains "$APP_DIR/src/main.js" 'invoke("prototype_status")'
require_contains "$APP_DIR/src/main.js" 'invoke("production_profile_unlock"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_profile_list"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_pairing_payload_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_pairing_session_draft_save"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_session_state_check"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_handshake_init_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_handshake_reply_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_handshake_finish_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_handshake_finish_import"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_message_envelope_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_message_envelope_import"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_message_received_export"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_message_transcript_export"'
require_contains "$APP_DIR/src/main.js" 'loadProductionTwoProfileTranscript'
require_contains "$APP_DIR/src/main.js" 'refreshTwoProfileConversationAfterManualImport'
require_contains "$APP_DIR/src/main.js" 'replyToLatestTwoProfileMessage'
require_contains "$APP_DIR/src/main.js" 'selectTwoProfileConversationEntryForReview'
require_contains "$APP_DIR/src/main.js" 'selectReplyAfterDeliveredReview'
require_contains "$APP_DIR/src/main.js" 'selectedTwoProfileNextActionMessage'
require_contains "$APP_DIR/src/main.js" 'selectedTwoProfileManualFocusTarget'
require_contains "$APP_DIR/src/main.js" 'reviewPendingTwoProfileMessage'
require_contains "$APP_DIR/src/main.js" 'applyPendingConversationToManualMessageReview'
require_contains "$APP_DIR/src/main.js" 'invoke("production_local_roundtrip"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_two_profile_roundtrip"'
require_contains "$APP_DIR/src/main.js" 'invoke("production_two_profile_message_roundtrip"'
require_contains "$APP_DIR/src/main.js" 'invoke("dev_local_demo")'
require_contains "$APP_DIR/src/main.js" 'invoke("dev_local_message_loop"'
require_contains "$TAURI_DIR/src/lib.rs" 'production_two_profile_roundtrip'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_two_profile_roundtrip'
require_contains "$TAURI_DIR/src/lib.rs" 'production_two_profile_message_roundtrip'
require_contains "$TAURI_DIR/src/lib.rs" 'run_production_two_profile_message_roundtrip'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'Run two-profile roundtrip'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'Tauri two-profile runtime smoke passed'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'plaintext_returned=false'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'key_material=false'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'network_io=false'
require_contains "$ROOT_DIR/scripts/smoke_tauri_two_profile.sh" 'transport_io=false'
require_contains "$APP_DIR/src/main.js" 'unlockProductionProfile'
require_contains "$APP_DIR/src/main.js" 'loadProductionProfileList'
require_contains "$APP_DIR/src/main.js" 'renderProductionProfileSelector'
require_contains "$APP_DIR/src/main.js" 'applyProductionActionState'
require_contains "$APP_DIR/src/action-state.js" 'productionManualNextActions'
require_contains "$APP_DIR/src/action-state.js" 'then manually select'
require_contains "$APP_DIR/src/action-state.js" 'then import for'
require_contains "$APP_DIR/src/action-state.js" 'productionActionAvailability'
require_contains "$APP_DIR/src/action-state.js" 'productionProfilePreset'
require_contains "$APP_DIR/src/action-state.js" 'productionCounterpartProfile'
require_contains "$APP_DIR/src/action-state.js" 'productionProfileUnlockView'
require_contains "$APP_DIR/src/action-state.js" 'productionPairingPayloadView'
require_contains "$APP_DIR/src/action-state.js" 'productionSessionDraftView'
require_contains "$APP_DIR/src/action-state.js" 'productionSessionStateView'
require_contains "$APP_DIR/src/action-state.js" 'productionHandshakePayloadView'
require_contains "$APP_DIR/src/action-state.js" 'productionHandshakeFinishImportView'
require_contains "$APP_DIR/src/action-state.js" 'productionMessageEnvelopeExportView'
require_contains "$APP_DIR/src/action-state.js" 'productionMessageEnvelopeImportView'
require_contains "$APP_DIR/src/action-state.js" 'productionReceivedMessageExportView'
require_contains "$APP_DIR/src/action-state.test.js" 'node:test'
require_contains "$APP_DIR/package.json" 'test:state'
require_contains "$APP_DIR/src/main.js" 'productionSessionReadyForMessages'
require_contains "$APP_DIR/src/main.js" 'applyProductionProfilePreset'
require_contains "$APP_DIR/src/main.js" 'moveLocalPayload'
require_contains "$APP_DIR/src/main.js" 'storeProductionPayloadSlot'
require_contains "$APP_DIR/src/main.js" 'loadProductionPayloadSlot'
require_contains "$APP_DIR/src/main.js" 'moveLocalMessageEnvelope'
require_contains "$APP_DIR/src/main.js" 'storeProductionMessageEnvelope'
require_contains "$APP_DIR/src/main.js" 'loadProductionMessageEnvelope'
require_contains "$APP_DIR/src/main.js" 'exportProductionPairingPayload'
require_contains "$APP_DIR/src/main.js" 'saveProductionSessionDraft'
require_contains "$APP_DIR/src/main.js" 'checkProductionSessionState'
require_contains "$APP_DIR/src/main.js" 'exportProductionHandshakeInit'
require_contains "$APP_DIR/src/main.js" 'exportProductionHandshakeReply'
require_contains "$APP_DIR/src/main.js" 'exportProductionHandshakeFinish'
require_contains "$APP_DIR/src/main.js" 'importProductionHandshakeFinish'
require_contains "$APP_DIR/src/main.js" 'exportProductionMessageEnvelope'
require_contains "$APP_DIR/src/main.js" 'importProductionMessageEnvelope'
require_contains "$APP_DIR/src/main.js" 'exportProductionReceivedMessage'
require_contains "$APP_DIR/src/main.js" 'runProductionTwoProfileRoundtrip'
require_contains "$APP_DIR/src/main.js" 'runProductionRoundtrip'
require_contains "$APP_DIR/src/main.js" 'runLocalLoop'
require_contains "$APP_DIR/index.html" 'data-theme="dark"'
require_contains "$APP_DIR/index.html" '<button id="theme-toggle" type="button" aria-pressed="true">Dark mode</button>'
require_contains "$APP_DIR/src/main.js" 'themeStorageKey'
require_contains "$APP_DIR/src/main.js" 'toggleTheme'
require_contains "$APP_DIR/src/main.js" 'renderAppStateSummary'
require_contains "$APP_DIR/src/main.js" 'Blocked: runtime transport disabled'
require_contains "$APP_DIR/src/action-state.js" 'productionTwoProfileReadiness'
require_contains "$APP_DIR/src/main.js" 'renderProductionTwoProfileResult'
require_contains "$APP_DIR/src/action-state.js" 'productionTwoProfileResultView'
require_contains "$APP_DIR/src/main.js" 'setProductionFollowupActions'
require_contains "$APP_DIR/src/main.js" 'swapTwoProfileDirection'
require_contains "$APP_DIR/src/main.js" 'openManualProductionTools'
require_contains "$APP_DIR/src/main.js" 'renderManualStatus'
require_contains "$APP_DIR/src/main.js" 'renderManualMessageStatus'
require_contains "$APP_DIR/src/main.js" 'setActionButtonState'
require_contains "$APP_DIR/src/main.js" 'checkProductionTwoProfileSessionStatus'
require_contains "$APP_DIR/src/main.js" 'latestTwoProfileSessionStatusForCurrentInput'
require_contains "$APP_DIR/src/main.js" 'syncProductionProfilePassphraseFromTwoProfile'
require_contains "$APP_DIR/src/main.js" 'preserveTwoProfileStatus'
require_contains "$APP_DIR/src/action-state.js" 'productionManualStatusView'
require_contains "$APP_DIR/src/action-state.js" 'productionManualMessageStatusView'
require_contains "$APP_DIR/src/action-state.js" 'productionManualRelayAvailability'
require_contains "$APP_DIR/src/action-state.js" 'productionTwoProfileSessionStatusView'
require_contains "$APP_DIR/src/action-state.js" 'productionProfileMessageReadiness'
require_contains "$APP_DIR/src/action-state.js" 'Next: reply direction is selected'
require_contains "$APP_DIR/src/action-state.js" 'Blocked: passphrase required'
require_contains "$APP_DIR/src/action-state.js" 'Ready: local encrypted roundtrip can run'
require_contains "$APP_DIR/src/action-state.js" 'no plaintext, key material, store path, network I/O, transport I/O, or runtime messaging exposure'
require_contains "$APP_DIR/src/styles.css" '[data-theme="light"]'
require_contains "$APP_DIR/src/styles.css" '.status-summary'
require_contains "$APP_DIR/src/styles.css" '.boundary-details'
require_contains "$APP_DIR/src/styles.css" '.action-readiness'
require_contains "$APP_DIR/src/styles.css" '.followup-actions'
require_contains "$APP_DIR/index.html" 'class="production-workflow"'
require_contains "$APP_DIR/index.html" '<details class="advanced-panel">'
require_contains "$APP_DIR/index.html" '<summary>Manual production payload tools</summary>'
require_contains "$APP_DIR/index.html" 'production-manual-route'
require_contains "$APP_DIR/index.html" 'production-manual-direction'
require_contains "$APP_DIR/index.html" 'production-manual-slots'
require_contains "$APP_DIR/src/action-state.js" 'active_slot(${profile})'
require_contains "$APP_DIR/src/action-state.js" 'counterpart_slot(${remoteProfile})'
require_contains "$APP_DIR/index.html" 'production-manual-policy'
require_contains "$APP_DIR/src/action-state.js" 'manual_only=true auto_send=false auto_import=false auto_profile_switch=false network_io=false'
require_contains "$APP_DIR/index.html" 'production-message-active-status'
require_contains "$APP_DIR/index.html" 'production-message-manual-check'
require_contains "$APP_DIR/index.html" 'check-production-two-profile-session-status'
require_contains "$APP_DIR/src/action-state.js" 'pasted envelope is not from the stored remote slot'
require_contains "$APP_DIR/src/action-state.js" 'load the remote envelope manually before import'
require_contains "$APP_DIR/src/styles.css" '.manual-relay-summary'
require_contains "$APP_DIR/src/styles.css" '.is-current-action'
require_contains "$APP_DIR/index.html" 'use-alice-production-profile'
require_contains "$APP_DIR/index.html" 'use-bob-production-profile'
require_contains "$APP_DIR/index.html" 'store-production-pairing-payload'
require_contains "$APP_DIR/index.html" 'load-production-pairing-payload'
require_contains "$APP_DIR/index.html" 'store-production-handshake-init'
require_contains "$APP_DIR/index.html" 'load-production-handshake-init'
require_contains "$APP_DIR/index.html" 'store-production-handshake-reply'
require_contains "$APP_DIR/index.html" 'load-production-handshake-reply'
require_contains "$APP_DIR/index.html" 'store-production-handshake-finish'
require_contains "$APP_DIR/index.html" 'load-production-handshake-finish'
require_contains "$APP_DIR/index.html" 'store-production-message-envelope'
require_contains "$APP_DIR/index.html" 'load-production-message-envelope'
require_contains "$APP_DIR/src-tauri/src/lib.rs" 'production_two_profile_session_status'
require_contains "$APP_DIR/src/styles.css" '.production-workflow'
require_contains "$APP_DIR/src/styles.css" '.advanced-panel'
require_contains "$APP_DIR/src/main.js" 'localLoopMessages'
require_contains "$APP_DIR/src/main.js" 'renderLoopResults'
require_contains "$APP_DIR/src/main.js" 'Loop completed'
require_contains "$APP_DIR/src/main.js" 'result.replay_summary'
require_contains "$APP_DIR/src/main.js" 'result.storage_guard'
require_contains "$APP_DIR/src/main.js" 'Demo running'
require_contains "$APP_DIR/src/main.js" 'Demo completed'
require_contains "$APP_DIR/src/main.js" 'Demo failed'
require_contains "$APP_DIR/src/main.js" 'renderDemoSteps'
require_contains "$APP_DIR/src/main.js" 'renderFlowControls'
require_contains "$APP_DIR/src/main.js" 'applySimulationStage'
require_contains "$APP_DIR/src/main.js" 'Reset local view'
require_contains "$APP_DIR/src/main.js" 'result.simulation'
require_contains "$APP_DIR/src/main.js" 'result.first_run_hint'
require_contains "$APP_DIR/src/main.js" 'result.steps'
require_contains "$APP_DIR/src/main.js" 'First run may take longer while Cargo builds the dev-insecure local demo.'
require_contains "$APP_DIR/src/main.js" 'result.warning.trim()'
require_contains "$APP_DIR/src/main.js" 'result.transcript.trim()'
require_contains "$APP_DIR/src/main.js" 'Unexpected release claim'
require_contains "$APP_DIR/src/main.js" 'Unexpected messaging status'
require_contains "$APP_DIR/README.md" 'not a secure-release messaging UI'
require_contains "$APP_DIR/README.md" 'dev_local_demo'
require_contains "$APP_DIR/README.md" 'not production messaging'
require_contains "$APP_DIR/README.md" 'Run the visible local demo shell'
require_contains "$APP_DIR/README.md" 'first run may take longer while Cargo builds the `dev-insecure` CLI demo'
require_contains "$APP_DIR/README.md" 'structured local flow steps'
require_contains "$APP_DIR/README.md" 'Alice/Bob peer panels'
require_contains "$APP_DIR/README.md" 'Reset local view'
require_contains "$APP_DIR/README.md" 'repeatable local loop'
require_contains "$APP_DIR/README.md" 'demo local-loop'
require_contains "$APP_DIR/README.md" 'dev store plaintext guard'
require_contains "$APP_DIR/README.md" 'core, profile'
require_contains "$APP_DIR/README.md" 'does not link or call production core protocol'
require_contains "$APP_DIR/README.md" 'static pre-network fail-closed copy'
require_contains "$APP_DIR/README.md" 'production-session status'
require_contains "$APP_DIR/README.md" 'static evaluation copy for the `snow` Noise XX synchronous boundary'
require_contains "$APP_DIR/README.md" 'message actions stay local encrypted-store harnesses and do not open transport'
require_contains "$APP_DIR/README.md" 'production-self-test status'
require_contains "$APP_DIR/README.md" 'does not execute from the Tauri shell or mark messaging usable'
require_contains "$APP_DIR/README.md" 'production-session limits copy'
require_contains "$APP_DIR/README.md" 'production-preflight'
require_contains "$APP_DIR/README.md" 'mirrors the CLI `production preflight` blockers as static read-only copy'
require_contains "$APP_DIR/README.md" 'does not execute the CLI command, bootstrap transport, or mark messaging usable'
require_contains "$APP_DIR/README.md" 'session durable-state status'
require_contains "$APP_DIR/README.md" 'store-write adapter boundary as static copy'
require_contains "$APP_DIR/README.md" 'session unlock-policy status'
require_contains "$APP_DIR/README.md" 'does not expose a product unlock command'
require_contains "$APP_DIR/README.md" 'session unlock-limits copy'
require_contains "$APP_DIR/README.md" 'product unlock, durable session persistence, rollback protection, and runtime messaging disabled'
require_contains "$APP_DIR/README.md" 'session unlock-rejection status'
require_contains "$APP_DIR/README.md" 'mirrors the CLI `production unlock` redacted disabled taxonomy as static copy'
require_contains "$APP_DIR/README.md" 'does not execute the CLI command, expose profile/passphrase input, open storage, write session records, expose key material, or enable runtime messaging'
require_contains "$APP_DIR/README.md" 'network-execution'
require_contains "$APP_DIR/README.md" 'static disabled copy'
require_contains "$APP_DIR/README.md" 'experimental-transport'
require_contains "$APP_DIR/README.md" 'static manual-gate summary copy'
require_contains "$APP_DIR/README.md" 'bootstrap-status classification'
require_contains "$APP_DIR/README.md" 'network-disabled'
require_contains "$APP_DIR/README.md" 'timeout-or-transient-network-failure'
require_contains "$APP_DIR/README.md" 'does not expose raw Arti errors, paths, endpoints, bridge lines, descriptors, profile names, contact ids, or key material'
require_contains "$APP_DIR/README.md" 'transport-I/O'
require_contains "$APP_DIR/README.md" 'static disabled copy for onion hosting, stream I/O, envelope I/O, and messaging'
require_contains "$APP_DIR/README.md" 'static `ADREC1` spike copy'
require_contains "$APP_DIR/README.md" 'does not claim complete production key management'
require_contains "$APP_DIR/README.md" 'verification boundaries'
require_contains "$APP_DIR/index.html" 'Local secure messaging console'
require_contains "$APP_DIR/index.html" 'Another Dimension Chat'
require_contains "$APP_DIR/index.html" 'Current app state'
require_contains "$APP_DIR/index.html" 'app-release-summary'
require_contains "$APP_DIR/index.html" 'local-capability-summary'
require_contains "$APP_DIR/index.html" 'main-blocker-summary'
require_contains "$APP_DIR/index.html" 'production-two-profile-direction'
require_contains "$APP_DIR/index.html" 'production-two-profile-flow'
require_contains "$APP_DIR/index.html" 'production-two-profile-readiness'
require_contains "$APP_DIR/index.html" 'check-production-two-profile-session-status-inline'
require_contains "$APP_DIR/index.html" 'Post-roundtrip actions'
require_contains "$APP_DIR/index.html" 'open-manual-production-tools'
require_contains "$APP_DIR/index.html" 'Review diagnostic'
require_contains "$APP_DIR/index.html" 'Safety boundary'
require_contains "$APP_DIR/index.html" 'Boundary details'
require_contains "$APP_DIR/index.html" 'Session durable state'
require_contains "$APP_DIR/index.html" 'Session unlock policy'
require_contains "$APP_DIR/index.html" 'Session unlock limits'
require_contains "$APP_DIR/index.html" 'Session unlock rejection'
require_contains "$APP_DIR/index.html" 'Unlock rejection flags'
require_contains "$APP_DIR/index.html" 'Local diagnostic only'
require_contains "$APP_DIR/index.html" 'Alice/Bob dev-insecure flow'
require_contains "$APP_DIR/index.html" 'Run local demo'
require_contains "$APP_DIR/index.html" 'Demo idle'
require_contains "$APP_DIR/index.html" 'First run may take longer while Cargo builds the dev-insecure local demo.'
require_contains "$APP_DIR/index.html" 'Warning has not run yet.'
require_contains "$APP_DIR/index.html" 'Local demo flow steps'
require_contains "$APP_DIR/index.html" 'Steps have not run yet.'
require_contains "$APP_DIR/index.html" 'Local peer simulation'
require_contains "$APP_DIR/index.html" 'Alice and Bob state'
require_contains "$APP_DIR/index.html" 'Local flow controls'
require_contains "$APP_DIR/index.html" 'Local peer panels'
require_contains "$APP_DIR/index.html" 'Safety number'
require_contains "$APP_DIR/index.html" 'Replay check'
require_contains "$APP_DIR/index.html" 'Production session'
require_contains "$APP_DIR/index.html" 'Snow Noise XX synchronous evaluation boundary only'
require_contains "$APP_DIR/index.html" 'Production self-test'
require_contains "$APP_DIR/index.html" 'CLI production boundary self-test only'
require_contains "$APP_DIR/index.html" 'Production session limits'
require_contains "$APP_DIR/index.html" 'No production E2EE claim network transport durable persistence or async messaging'
require_contains "$APP_DIR/index.html" 'Production preflight'
require_contains "$APP_DIR/index.html" 'Read-only production skeleton blockers copy'
require_contains "$APP_DIR/index.html" 'Preflight blockers'
require_contains "$APP_DIR/index.html" 'session E2EE false transport send receive false storage rollback not-provided messaging false'
require_contains "$APP_DIR/index.html" 'Production profile'
require_contains "$APP_DIR/index.html" 'Persistent local store'
require_contains "$APP_DIR/index.html" 'production-profile-selector'
require_contains "$APP_DIR/index.html" 'Unlock profile'
require_contains "$APP_DIR/index.html" 'Production pairing'
require_contains "$APP_DIR/index.html" 'Public payload export'
require_contains "$APP_DIR/index.html" 'Export pairing'
require_contains "$APP_DIR/index.html" 'Fill local'
require_contains "$APP_DIR/index.html" 'Fill remote'
require_contains "$APP_DIR/src/action-state.js" 'Fill local copies the active output field'
require_contains "$APP_DIR/src/action-state.js" 'manually select the counterpart profile'
require_contains "$APP_DIR/src/action-state.js" 'manually select Alice or Bob'
require_contains "$APP_DIR/src/main.js" 'expected_counterpart='
require_contains "$APP_DIR/src/main.js" 'loaded_from='
require_contains "$APP_DIR/src/main.js" 'Filled remote field from active='
require_contains "$APP_DIR/src/main.js" 'manualMissingCounterpartWarning'
require_contains "$APP_DIR/src/main.js" 'manualLoadedCounterpartWarning'
require_contains "$APP_DIR/index.html" 'Remote payload'
require_contains "$APP_DIR/index.html" 'Save draft'
require_contains "$APP_DIR/index.html" 'Handshake init'
require_contains "$APP_DIR/index.html" 'Remote handshake init'
require_contains "$APP_DIR/index.html" 'Handshake reply'
require_contains "$APP_DIR/index.html" 'Remote handshake reply'
require_contains "$APP_DIR/index.html" 'Handshake finish'
require_contains "$APP_DIR/index.html" 'Remote handshake finish'
require_contains "$APP_DIR/index.html" 'Export init'
require_contains "$APP_DIR/index.html" 'Import finish'
require_contains "$APP_DIR/index.html" 'Check session'
require_contains "$APP_DIR/index.html" 'Production message'
require_contains "$APP_DIR/index.html" 'Encrypted envelope path'
require_contains "$APP_DIR/index.html" 'Export envelope'
require_contains "$APP_DIR/index.html" 'Remote envelope'
require_contains "$APP_DIR/index.html" 'Import envelope'
require_contains "$APP_DIR/index.html" 'Show received'
require_contains "$APP_DIR/index.html" 'Received message'
require_contains "$APP_DIR/index.html" 'Production core local roundtrip'
require_contains "$APP_DIR/index.html" 'Run core roundtrip'
require_contains "$APP_DIR/index.html" 'Repeatable local loop'
require_contains "$APP_DIR/index.html" 'Local message loop'
require_contains "$APP_DIR/index.html" 'Run local loop'
require_contains "$APP_DIR/index.html" 'Reset loop view'
require_contains "$APP_DIR/index.html" 'Local loop message results'
require_contains "$APP_DIR/index.html" 'Storage guard'
require_contains "$APP_DIR/index.html" 'Release claim'
require_status_copy 'No secure-release claim'
require_status_copy 'No runtime messaging path'
require_status_copy 'Core boundary only'
require_status_copy 'Profile boundary only'
require_status_copy 'Pairing boundary only'
require_status_copy 'Snow Noise XX synchronous evaluation boundary only'
require_status_copy 'CLI production boundary self-test only'
require_status_copy 'No production E2EE claim network transport durable persistence or async messaging'
require_status_copy 'Read-only production skeleton blockers copy'
require_status_copy 'session E2EE false transport send receive false storage rollback not-provided messaging false'
require_status_copy 'Pre-network fail-closed only'
require_status_copy 'Network execution disabled'
require_status_copy 'Manual bootstrap gate summary only'
require_status_copy 'network-disabled; censorship-or-bridge-required;'
require_status_copy 'timeout-or-transient-network-failure'
require_status_copy 'Hosting stream envelope messaging disabled'
require_status_copy 'ADREC1 storage spike only'
require_status_copy 'Lightweight checks only'
require_contains "$APP_DIR/.npmrc" '^workspaces=false$'
require_contains "$APP_DIR/package-lock.json" '"lockfileVersion": 3'
require_contains "$APP_DIR/package-lock.json" '"vite": "^6.0.0"'
require_contains "$TAURI_DIR/Cargo.lock" 'name = "tauri"'

command_count="$(grep -R '^\s*#\[tauri::command\]' "$TAURI_DIR/src" | wc -l | tr -d ' ')"
test "$command_count" = "20"

invoke_count="$(grep -R 'invoke(' "$APP_DIR/src" | wc -l | tr -d ' ')"
test "$invoke_count" = "25"

status_false_count="$(grep -E '^\s*[a-z_]+: false,' "$TAURI_DIR/src/status.rs" | wc -l | tr -d ' ')"
test "$status_false_count" = "2"

if grep -n '\btrue\b' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not expose true readiness flags" >&2
  exit 1
fi

if grep -n -E 'secure_release:|usable_messaging:|core_status:|profile_status:|pairing_status:|production_session_status:|production_self_test_status:|production_session_non_readiness:|production_preflight_status:|production_preflight_blockers:|transport_status:|network_execution_status:|storage_status:|verification_status:' "$TAURI_DIR/src/lib.rs" >/dev/null; then
  echo "Tauri command wrapper must delegate status construction to status.rs" >&2
  exit 1
fi

if grep -n -E '"available"|"ready"|"connected"|"bootstrapped"|"secure release"|"usable messaging"' "$TAURI_DIR/src/status.rs" >/dev/null; then
  echo "status adapter must not imply readiness or secure-release state" >&2
  exit 1
fi

if grep -R 'invoke(' "$APP_DIR/src" \
  | grep -v 'invoke("prototype_status")' \
  | grep -v 'invoke("production_profile_unlock"' \
  | grep -v 'invoke("production_profile_list"' \
  | grep -v 'invoke("production_pairing_payload_export"' \
  | grep -v 'invoke("production_pairing_session_draft_save"' \
  | grep -v 'invoke("production_session_state_check"' \
  | grep -v 'invoke("production_handshake_init_export"' \
  | grep -v 'invoke("production_handshake_reply_export"' \
  | grep -v 'invoke("production_handshake_finish_export"' \
  | grep -v 'invoke("production_handshake_finish_import"' \
  | grep -v 'invoke("production_message_envelope_export"' \
  | grep -v 'invoke("production_message_envelope_import"' \
  | grep -v 'invoke("production_message_received_export"' \
  | grep -v 'invoke("production_message_transcript_export"' \
  | grep -v 'invoke("production_local_roundtrip"' \
  | grep -v 'invoke("production_two_profile_roundtrip"' \
  | grep -v 'invoke("production_two_profile_message_roundtrip"' \
  | grep -v 'invoke("production_two_profile_session_status"' \
  | grep -v 'invoke("dev_local_demo")' \
  | grep -v 'invoke("dev_local_message_loop"' >/dev/null; then
  echo "unexpected frontend Tauri command invocation" >&2
  exit 1
fi

if grep -R -E 'send_message|receive_message|transport_bootstrap|bootstrap_transport|launch_onion|publish_descriptor|accept_stream|dial_stream|send_envelope|receive_envelope|create_profile|pair_contact|cloud_backup|push_notification|group_chat|file_transfer|multi_device' "$APP_DIR/src" "$TAURI_DIR/src" >/dev/null; then
  echo "unexpected production command surface in Tauri scaffold" >&2
  exit 1
fi

if grep -R -E '<button|<input|<textarea|contenteditable|Available|Start chat|Send message|Connect|Pair contact|Bootstrap|Launch onion|Not a secure release|Not available' "$APP_DIR/index.html" "$APP_DIR/src" \
  | grep -v '<button id="run-demo" type="button">Run local demo</button>' \
  | grep -v '<button id="theme-toggle" type="button" aria-pressed="true">Dark mode</button>' \
  | grep -v '<input id="production-profile-name" type="text" value="alice" autocomplete="username" />' \
  | grep -v '<input$' \
  | grep -v '<button id="use-alice-production-profile" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="use-bob-production-profile" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="unlock-production-profile" type="button">Unlock profile</button>' \
  | grep -v '<input id="production-pairing-endpoint" type="text" value="alice.onion" />' \
  | grep -v '<button id="export-production-pairing" type="button">Export pairing</button>' \
  | grep -v '<button id="use-production-pairing-payload" type="button">Fill local</button>' \
  | grep -v '<button id="store-production-pairing-payload" type="button">Store pairing</button>' \
  | grep -v '<button id="load-production-pairing-payload" type="button">Fill remote</button>' \
  | grep -v '<textarea id="production-pairing-payload" rows="5" readonly></textarea>' \
  | grep -v '<textarea id="production-remote-pairing-payload" rows="5"></textarea>' \
  | grep -v '<button id="save-production-session-draft" type="button">Save draft</button>' \
  | grep -v '<textarea id="production-handshake-init-payload" rows="3" readonly></textarea>' \
  | grep -v '<button id="use-production-handshake-init" type="button">Fill local</button>' \
  | grep -v '<button id="store-production-handshake-init" type="button">Store init</button>' \
  | grep -v '<button id="load-production-handshake-init" type="button">Fill remote</button>' \
  | grep -v '<textarea id="production-remote-handshake-init-payload" rows="3"></textarea>' \
  | grep -v '<textarea id="production-handshake-reply-payload" rows="3" readonly></textarea>' \
  | grep -v '<button id="use-production-handshake-reply" type="button">Fill local</button>' \
  | grep -v '<button id="store-production-handshake-reply" type="button">Store reply</button>' \
  | grep -v '<button id="load-production-handshake-reply" type="button">Fill remote</button>' \
  | grep -v '<textarea id="production-remote-handshake-reply-payload" rows="3"></textarea>' \
  | grep -v '<textarea id="production-handshake-finish-payload" rows="3" readonly></textarea>' \
  | grep -v '<button id="use-production-handshake-finish" type="button">Fill local</button>' \
  | grep -v '<button id="store-production-handshake-finish" type="button">Store finish</button>' \
  | grep -v '<button id="load-production-handshake-finish" type="button">Fill remote</button>' \
  | grep -v '<textarea id="production-remote-handshake-finish-payload" rows="3"></textarea>' \
  | grep -v '<button id="export-production-handshake-init" type="button">Export init</button>' \
  | grep -v '<button id="export-production-handshake-reply" type="button">Export reply</button>' \
  | grep -v '<button id="export-production-handshake-finish" type="button">Export finish</button>' \
  | grep -v '<button id="import-production-handshake-finish" type="button">Import finish</button>' \
  | grep -v '<button id="check-production-session-state" type="button">Check session</button>' \
  | grep -v '<button id="check-production-two-profile-session-status" type="button">' \
  | grep -v '<input id="production-message-auto-number" type="checkbox" checked />' \
  | grep -v '<input id="production-message-number" type="number" min="1" value="1" />' \
  | grep -v '<textarea id="production-message-body" rows="3">hello over stored transport</textarea>' \
  | grep -v '<button id="export-production-message-envelope" type="button">Export envelope</button>' \
  | grep -v '<textarea id="production-message-envelope" rows="5" readonly></textarea>' \
  | grep -v '<button id="use-production-message-envelope" type="button">Fill local</button>' \
  | grep -v '<button id="store-production-message-envelope" type="button">Store envelope</button>' \
  | grep -v '<button id="load-production-message-envelope" type="button">Fill remote</button>' \
  | grep -v '<button id="relay-production-message-envelope" type="button">Relay to peer</button>' \
  | grep -v '<textarea id="production-remote-message-envelope" rows="5"></textarea>' \
  | grep -v '<button id="import-production-message-envelope" type="button">Import envelope</button>' \
  | grep -v '<button id="export-production-received-message" type="button">Show received</button>' \
  | grep -v '<textarea id="production-received-message" rows="3" readonly></textarea>' \
  | grep -v '<button id="load-production-message-transcript" type="button">Load transcript</button>' \
  | grep -v '<button id="load-production-two-profile-transcript" type="button">Load conversation</button>' \
  | grep -v '<button id="reply-latest-two-profile-message" type="button">Reply to latest</button>' \
  | grep -v '<button id="review-pending-two-profile-message" type="button">Review pending</button>' \
  | grep -v '<input id="production-two-profile-a" type="text" value="alice" autocomplete="username" />' \
  | grep -v '<input id="production-two-profile-b" type="text" value="bob" autocomplete="username" />' \
  | grep -v '<textarea id="production-two-profile-message" rows="3" placeholder="Message from alice to bob">hello between app-data profiles</textarea>' \
  | grep -v '<button id="run-production-two-profile-roundtrip" type="button">Run two-profile roundtrip</button>' \
  | grep -v '<button id="check-production-two-profile-session-status-inline" type="button">' \
  | grep -v '<button id="run-production-two-profile-message-roundtrip" type="button">' \
  | grep -v '<button id="open-manual-production-tools" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="focus-local-diagnostic" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="swap-two-profile-direction" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="edit-two-profile-message" type="button" class="flow-control is-secondary">' \
  | grep -v '<button id="run-production-roundtrip" type="button">Run core roundtrip</button>' \
  | grep -v '<textarea id="production-roundtrip-message" rows="3">hello from production core</textarea>' \
  | grep -v '<button id="run-loop" type="button">Run local loop</button>' \
  | grep -v '<button id="reset-loop" type="button" class="flow-control is-secondary">' \
  | grep -v '<textarea id="loop-messages" rows="4">first local loop message' >/dev/null; then
  echo "unexpected interactive or readiness-implying UI copy in Tauri scaffold" >&2
  exit 1
fi

cargo metadata --manifest-path "$TAURI_DIR/Cargo.toml" --no-deps --format-version 1 >/dev/null

printf 'tauri scaffold static verification passed\n'

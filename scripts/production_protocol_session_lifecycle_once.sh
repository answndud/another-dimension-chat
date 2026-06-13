#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
README="$ROOT_DIR/README.md"
SECURITY="$ROOT_DIR/SECURITY.md"
CRYPTO="$ROOT_DIR/reference/CRYPTO_DECISION.md"
REVIEW="$ROOT_DIR/reference/INDEPENDENT_REVIEW_PACKET.md"
CORE="$ROOT_DIR/crates/core/src/lib.rs"
PROTOCOL="$ROOT_DIR/crates/protocol/src/lib.rs"
STATUS="$ROOT_DIR/apps/desktop-tauri/src-tauri/src/status.rs"

require_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL missing production protocol/session lifecycle input: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "FAIL missing production protocol/session lifecycle text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "FAIL forbidden production protocol/session lifecycle text in $file: $text" >&2
    exit 1
  fi
}

for file in "$DOC" "$README" "$SECURITY" "$CRYPTO" "$REVIEW" "$CORE" "$PROTOCOL" "$STATUS"; do
  require_file "$file"
done

require_text "$README" "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
require_text "$SECURITY" "reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
require_text "$CRYPTO" "PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
require_text "$REVIEW" "PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"

require_text "$DOC" "Status: OPS-2 and RB-1 source gates closed for review input."
require_text "$DOC" "Shared Semantics"
require_text "$DOC" "State Machine"
require_text "$DOC" "Edge-Case Rules"
require_text "$DOC" "Existing Test Anchors"
require_text "$DOC" "External Review Questions"
require_text "$DOC" "signed pairwise identity payload before session setup"
require_text "$DOC" "canonical safety transcript before user trust"
require_text "$DOC" "Noise XX session setup boundary"
require_text "$DOC" "replay rejection before commit"
require_text "$DOC" "tamper failure must not advance replay state"
require_text "$DOC" "terminal cancel state"
require_text "$DOC" "conversation-deleted"
require_text "$DOC" "session-deleted"
require_text "$DOC" "Remote acknowledgement protocol is not ready"
require_text "$DOC" "External onion delivery verification is false"
require_text "$DOC" "dev-insecure behavior remains visibly separate"
require_text "$DOC" "production_session_readiness_gate_lists_blockers_without_opening_runtime"
require_text "$DOC" "production_async_delivery_semantics_are_reviewed_without_network_claim"
require_text "$DOC" "production_local_manual_e2ee_runtime_gate_closes_session_failure_model_without_claims"
require_text "$DOC" "tampered_receive_does_not_persist_replay_before_valid_same_number"
require_text "$DOC" "cancelled_pending_pairing_cannot_be_confirmed"
require_text "$DOC" "ReplayWindow::accept_after_decrypt"
require_text "$DOC" "ProductionEnvelopeSession"
require_text "$DOC" "protocol_session_lifecycle_gate_reviewed=true"
require_text "$DOC" "c100_1_e2ee_blocker_closed=true"
require_text "$DOC" "production_e2ee_policy_waiver_authorized=true"
require_text "$DOC" "production_e2ee_external_review_required_for_claims=true"
require_text "$DOC" "production_e2ee_field_evidence_required_for_claims=true"
require_text "$DOC" "local_manual_and_future_transport_semantics_shared=true"
require_text "$DOC" "replay_duplicate_retry_cancel_edges_documented=true"
require_text "$DOC" "dev_insecure_surface_blocked_from_production_claim=true"
require_text "$DOC" "d100_1_e2ee_source_gate_reviewed=true"
require_text "$DOC" "protocol_session_e2ee_source_ready=true"
require_text "$DOC" "protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete"
require_text "$DOC" "remote_ack_protocol_ready=false"
require_text "$DOC" "external_onion_delivery_verified=false"
require_text "$DOC" "runtime_messaging_ready=false"
require_text "$DOC" "production_e2ee_ready=false"
require_text "$DOC" "security_ready_claimed=false"
require_text "$DOC" "next_required_phase=Phase O100-1 - Operations, Incident, And Vulnerability Readiness"

require_text "$CORE" "fn production_session_readiness_gate_lists_blockers_without_opening_runtime"
require_text "$CORE" "fn production_async_delivery_semantics_are_reviewed_without_network_claim"
require_text "$CORE" "fn production_local_manual_e2ee_runtime_gate_closes_session_failure_model_without_claims"
require_text "$CORE" "fn tampered_receive_does_not_persist_replay_before_valid_same_number"
require_text "$CORE" "fn cancelled_pending_pairing_cannot_be_confirmed"
require_text "$CORE" "pub fn production_session_readiness_gate()"
require_text "$CORE" "pub fn production_async_delivery_semantics_summary()"
require_text "$CORE" "pub fn production_local_manual_e2ee_runtime_summary()"
require_text "$CORE" "remote_ack_protocol"
require_text "$CORE" "tamper_failure_non_advance"
require_text "$CORE" "explicit_envelope_export_import"
require_text "$CORE" "production_e2ee_ready: false"
require_text "$CORE" "security_ready_claimed: false"

require_text "$PROTOCOL" "pub fn accept_after_decrypt"
require_text "$PROTOCOL" "next.accept(message_number)?"
require_text "$PROTOCOL" "let plaintext = decrypt()?"
require_text "$PROTOCOL" "*self = next"
require_text "$PROTOCOL" "ProtocolError::ReplayMessage"
require_text "$PROTOCOL" "ProtocolError::OldMessage"
require_text "$PROTOCOL" "ProtocolError::InvalidMessageNumber"

require_text "$STATUS" "production_local_manual_e2ee_runtime"
require_text "$STATUS" "production_e2ee_ready={}"
require_text "$STATUS" "security_ready_claimed={}"
require_text "$STATUS" "remote_ack_protocol"

for file in "$README" "$SECURITY" "$DOC"; do
  reject_text "$file" "production E2EE ready=true"
  reject_text "$file" "runtime messaging ready=true"
  reject_text "$file" "external onion delivery verified=true"
  reject_text "$file" "is a secure messenger release"
  reject_text "$file" "safe for sensitive communication"
done

scripts/production_local_manual_e2ee_claim_closure_once.sh >/dev/null

printf 'status=production-protocol-session-lifecycle-ready\n'
printf 'protocol_session_lifecycle_gate_reviewed=true\n'
printf 'c100_1_e2ee_blocker_closed=true\n'
printf 'production_e2ee_policy_waiver_authorized=true\n'
printf 'production_e2ee_waiver_scope=active-queue-unblock-only\n'
printf 'production_e2ee_external_review_required_for_claims=true\n'
printf 'production_e2ee_field_evidence_required_for_claims=true\n'
printf 'd100_1_e2ee_source_gate_reviewed=true\n'
printf 'protocol_session_e2ee_source_ready=true\n'
printf 'protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete\n'
printf 'local_manual_and_future_transport_semantics_shared=true\n'
printf 'replay_duplicate_retry_cancel_edges_documented=true\n'
printf 'remote_ack_protocol_ready=false\n'
printf 'external_onion_delivery_verified=false\n'
printf 'runtime_messaging_ready=false\n'
printf 'production_e2ee_ready=false\n'
printf 'security_ready_claimed=false\n'
printf 'next_required_phase=Phase-O100-1-Operations-Incident-And-Vulnerability-Readiness\n'

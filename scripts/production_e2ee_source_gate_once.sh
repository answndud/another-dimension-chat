#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "error=$*" >&2
  exit 1
}

must_contain() {
  local file="$1"
  local needle="$2"
  grep -Fq "$needle" "$file" || fail "$file missing required text: $needle"
}

must_not_match() {
  local file="$1"
  local pattern="$2"
  if grep -Eq "$pattern" "$file"; then
    fail "$file contains forbidden production E2EE source-gate pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_E2EE_SOURCE_GATE.md"
PROTOCOL_DOC="reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
LOCAL_E2EE_DOC="reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"
PAIRWISE_DOC="reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"
KEY_DOC="reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md"
MATRIX="reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"
GAP_REGISTER="reference/DEPLOYMENT_READINESS_GAP_REGISTER.md"
REVIEW_PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
CORE="crates/core/src/lib.rs"
PROTOCOL="crates/protocol/src/lib.rs"
TAURI_LIB="apps/desktop-tauri/src-tauri/src/lib.rs"

for file in "$DOC" "$PROTOCOL_DOC" "$LOCAL_E2EE_DOC" "$PAIRWISE_DOC" \
  "$KEY_DOC" "$MATRIX" "$GAP_REGISTER" "$REVIEW_PACKET" "$CORE" "$PROTOCOL" \
  "$TAURI_LIB" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing D100-1 production E2EE source gate input: $file"
done

for file in "$MATRIX" "$GAP_REGISTER" "$REVIEW_PACKET" "README.md" "SECURITY.md"; do
  must_contain "$file" "PRODUCTION_E2EE_SOURCE_GATE.md"
done

for flag in \
  "production_e2ee_source_gate_reviewed=true" \
  "c100_1_e2ee_blocker_closed=true" \
  "production_e2ee_policy_waiver_authorized=true" \
  "production_e2ee_waiver_scope=active-queue-unblock-only" \
  "production_e2ee_external_review_required_for_claims=true" \
  "production_e2ee_field_evidence_required_for_claims=true" \
  "production_e2ee_source_ready=true" \
  "d100_1_e2ee_source_gate_reviewed=true" \
  "protocol_session_e2ee_source_ready=true" \
  "protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete" \
  "supported_local_manual_e2ee_ready=true" \
  "supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only" \
  "signed_pairwise_identity_payload_required=true" \
  "canonical_safety_transcript_required=true" \
  "noise_xx_session_boundary_present=true" \
  "message_number_nonce_binding_present=true" \
  "replay_commit_after_decrypt=true" \
  "tamper_failure_non_advance=true" \
  "retry_cancel_local_only=true" \
  "local_delete_semantics_split=true" \
  "durable_session_record_boundary_reviewed=true" \
  "dev_insecure_surface_blocked_from_production_claim=true" \
  "production_e2ee_ready=false" \
  "production_e2ee_claim_allowed=false" \
  "audited_e2ee_claim_allowed=false" \
  "secure_messenger_claim_allowed=false" \
  "sensitive_communication_allowed=false" \
  "remote_ack_protocol_ready=false" \
  "automatic_network_messaging_ready=false" \
  "external_onion_delivery_verified=false" \
  "external_review_completed=false" \
  "audit_completed=false" \
  "security_ready_claimed=false"; do
  must_contain "$DOC" "$flag"
done

for text in \
  "signed pairwise identity payload before session setup" \
  "canonical safety transcript before user trust" \
  "Noise XX session setup boundary" \
  "channel/message-number/nonce binding before envelope export/import" \
  "replay state commits only after successful decrypt" \
  "tampered ciphertext does not advance receive replay state" \
  "retry and cancel remain local state" \
  "conversation delete and session delete have separate local semantics" \
  "durable session record boundaries remain encrypted local storage boundaries" \
  "ReplayWindow::accept_after_decrypt" \
  "ProductionEnvelopeSession" \
  "production_local_manual_e2ee_runtime_summary"; do
  must_contain "$DOC" "$text"
done

must_contain "$PROTOCOL_DOC" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "$PROTOCOL_DOC" "production_e2ee_source_gate_reviewed=true"
must_contain "$PROTOCOL_DOC" "c100_1_e2ee_blocker_closed=true"
must_contain "$PROTOCOL_DOC" "production_e2ee_policy_waiver_authorized=true"
must_contain "$PROTOCOL_DOC" "production_e2ee_external_review_required_for_claims=true"
must_contain "$PROTOCOL_DOC" "production_e2ee_field_evidence_required_for_claims=true"
must_contain "$PROTOCOL_DOC" "production_e2ee_source_ready=true"
must_contain "$PROTOCOL_DOC" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$PROTOCOL_DOC" "protocol_session_e2ee_source_ready=true"
must_contain "$PROTOCOL_DOC" "protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete"
must_contain "$PROTOCOL_DOC" "production_e2ee_ready=false"
must_contain "$LOCAL_E2EE_DOC" "supported_local_manual_e2ee_ready=true"
must_contain "$LOCAL_E2EE_DOC" "production_e2ee_ready=false"
must_contain "$PAIRWISE_DOC" "canonical safety transcript"
must_contain "$KEY_DOC" "Session lifecycle delete"
must_contain "$KEY_DOC" "session records"

must_contain "$MATRIX" "PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "$MATRIX" "c100_1_e2ee_blocker_closed=true"
must_contain "$MATRIX" "production_e2ee_policy_waiver_authorized=true"
must_contain "$MATRIX" "production_e2ee_external_review_required_for_claims=true"
must_contain "$MATRIX" "production_e2ee_field_evidence_required_for_claims=true"
must_contain "$MATRIX" "production_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "production_e2ee_source_ready=true"
must_contain "$MATRIX" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$MATRIX" "protocol_session_e2ee_source_ready=true"
must_contain "$MATRIX" "production_e2ee_ready=false"
must_contain "$GAP_REGISTER" "production_e2ee_source_gate_reviewed=true"
must_contain "$GAP_REGISTER" "c100_1_e2ee_blocker_closed=true"
must_contain "$GAP_REGISTER" "production_e2ee_policy_waiver_authorized=true"
must_contain "$GAP_REGISTER" "production_e2ee_source_ready=true"
must_contain "$GAP_REGISTER" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$GAP_REGISTER" "protocol_session_e2ee_source_ready=true"
must_contain "$GAP_REGISTER" "production_e2ee_ready=false"

must_contain "$PROTOCOL" "pub fn accept_after_decrypt"
must_contain "$PROTOCOL" "let plaintext = decrypt()?"
must_contain "$PROTOCOL" "*self = next"
must_contain "$PROTOCOL" "fn replay_window_accept_after_decrypt_does_not_commit_on_decrypt_error"
must_contain "$PROTOCOL" "fn replay_window_rejects_duplicates_and_old_messages"

must_contain "$CORE" "pub struct ProductionEnvelopeSession"
must_contain "$CORE" "pub fn production_local_manual_e2ee_runtime_summary()"
must_contain "$CORE" "message_number_nonce_binding_required: true"
must_contain "$CORE" "replay_commit_after_decrypt: storage.replay_commit_after_decrypt()"
must_contain "$CORE" "tamper_failure_non_advance: true"
must_contain "$CORE" "supported_local_manual_e2ee_ready: local_manual_e2ee_runtime_ready"
must_contain "$CORE" "production_e2ee_ready: false"
must_contain "$CORE" "fn production_local_manual_e2ee_runtime_gate_closes_session_failure_model_without_claims"
must_contain "$CORE" "fn tampered_receive_does_not_persist_replay_before_valid_same_number"
must_contain "$CORE" "fn cancelled_pending_pairing_cannot_be_confirmed"
must_contain "$TAURI_LIB" "fn production_session_lifecycle_status_and_delete_are_redacted"

for file in "$DOC" "$PROTOCOL_DOC" "$LOCAL_E2EE_DOC" "$MATRIX" "$GAP_REGISTER" \
  "README.md" "SECURITY.md" "$REVIEW_PACKET"; do
  must_not_match "$file" "production_e2ee_ready=true"
  must_not_match "$file" "production_e2ee_claim_allowed=true"
  must_not_match "$file" "audited_e2ee_claim_allowed=true"
  must_not_match "$file" "secure_messenger_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "remote_ack_protocol_ready=true"
  must_not_match "$file" "automatic_network_messaging_ready=true"
  must_not_match "$file" "external_onion_delivery_verified=true"
  must_not_match "$file" "external_review_completed=true"
  must_not_match "$file" "audit_completed=true"
  must_not_match "$file" "security_ready_claimed=true"
done

scripts/production_protocol_session_lifecycle_once.sh >/dev/null
scripts/production_local_manual_e2ee_claim_closure_once.sh >/dev/null

cat <<'STATUS'
status=production-e2ee-source-gate-ready
production_e2ee_source_gate_reviewed=true
c100_1_e2ee_blocker_closed=true
production_e2ee_policy_waiver_authorized=true
production_e2ee_waiver_scope=active-queue-unblock-only
production_e2ee_external_review_required_for_claims=true
production_e2ee_field_evidence_required_for_claims=true
production_e2ee_source_ready=true
d100_1_e2ee_source_gate_reviewed=true
protocol_session_e2ee_source_ready=true
protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
supported_local_manual_e2ee_ready=true
supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only
signed_pairwise_identity_payload_required=true
canonical_safety_transcript_required=true
noise_xx_session_boundary_present=true
message_number_nonce_binding_present=true
replay_commit_after_decrypt=true
tamper_failure_non_advance=true
retry_cancel_local_only=true
local_delete_semantics_split=true
durable_session_record_boundary_reviewed=true
production_e2ee_ready=false
production_e2ee_claim_allowed=false
audited_e2ee_claim_allowed=false
secure_messenger_claim_allowed=false
sensitive_communication_allowed=false
remote_ack_protocol_ready=false
automatic_network_messaging_ready=false
external_onion_delivery_verified=false
external_review_completed=false
audit_completed=false
security_ready_claimed=false
next_required_phase=Phase-O100-1-Operations-Incident-And-Vulnerability-Readiness
STATUS

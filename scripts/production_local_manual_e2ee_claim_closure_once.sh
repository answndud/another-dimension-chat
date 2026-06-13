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
    fail "$file contains forbidden E2EE claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"
CORE="crates/core/src/lib.rs"
STATUS="apps/desktop-tauri/src-tauri/src/status.rs"
PRIVATE_STATE="apps/desktop-tauri/src/private-delivery-state.js"
MAIN_JS="apps/desktop-tauri/src/main.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"
PROTOCOL_DOC="reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"

for file in "$DOC" "$CORE" "$STATUS" "$PRIVATE_STATE" "$MAIN_JS" "$UI_SMOKE" \
  "$PROTOCOL_DOC" "$STABLE_GATE" "$PACKET" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing RB-1 E2EE closure input: $file"
done

must_contain "$DOC" "rb_1_local_manual_e2ee_claim_closure_reviewed=true"
must_contain "$DOC" "supported_local_manual_e2ee_ready=true"
must_contain "$DOC" "supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only"
must_contain "$DOC" "message_content_encrypted_before_manual_export=true"
must_contain "$DOC" "replay_commit_after_decrypt=true"
must_contain "$DOC" "tamper_failure_non_advance=true"
must_contain "$DOC" "retry_cancel_local_only=true"
must_contain "$DOC" "remote_ack_protocol_ready=false"
must_contain "$DOC" "automatic_network_messaging_ready=false"
must_contain "$DOC" "external_onion_delivery_verified=false"
must_contain "$DOC" "production_e2ee_ready=false"
must_contain "$DOC" "audited_e2ee_claim_allowed=false"
must_contain "$DOC" "secure_messenger_claim_allowed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=RB-2 production key management rollback and deletion closure"

must_contain "$CORE" "supported_local_manual_e2ee_ready: bool"
must_contain "$CORE" "pub fn supported_local_manual_e2ee_ready"
must_contain "$CORE" "supported_local_manual_e2ee_ready: local_manual_e2ee_runtime_ready"
must_contain "$CORE" "assert!(gate.supported_local_manual_e2ee_ready())"
must_contain "$CORE" "production_e2ee_ready: false"
must_contain "$STATUS" "supported_local_manual_e2ee_ready={}"
must_contain "$STATUS" "supported_local_manual_e2ee_ready=true"
must_contain "$PRIVATE_STATE" "supportedLocalManualE2eeReady: true"
must_contain "$PRIVATE_STATE" "supportedLocalManualE2eeScope: \"1:1-local-manual-envelope-message-content-only\""
must_contain "$PRIVATE_STATE" "supported_local_manual_e2ee_ready=\${desktopCompletion.supportedLocalManualE2eeReady === true}"
must_contain "$PRIVATE_STATE" "supported_local_manual_e2ee_scope=\${fieldTestReportValue(desktopCompletion.supportedLocalManualE2eeScope, \"unknown\")}"
must_contain "$MAIN_JS" "supported_local_manual_e2ee_ready=\${supportedLocalManualE2eeReady}"
must_contain "$MAIN_JS" "supported_local_manual_e2ee_scope=\${supportedLocalManualE2eeScope}"
must_contain "$UI_SMOKE" "supported_local_manual_e2ee_ready="

must_contain "$PROTOCOL_DOC" "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"
must_contain "$PROTOCOL_DOC" "reference/PRODUCTION_E2EE_SOURCE_GATE.md"
must_contain "$PROTOCOL_DOC" "d100_1_e2ee_source_gate_reviewed=true"
must_contain "$PROTOCOL_DOC" "protocol_session_e2ee_source_ready=true"
must_contain "$PROTOCOL_DOC" "supported_local_manual_e2ee_ready=true"
must_contain "$PROTOCOL_DOC" "production_e2ee_ready=false"
must_contain "$STABLE_GATE" "supported_local_manual_e2ee_ready=true"
must_contain "$STABLE_GATE" "production_e2ee_ready=false"
must_contain "$PACKET" "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"
must_contain "README.md" "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"
must_contain "SECURITY.md" "reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md"

for file in "$DOC" "$PROTOCOL_DOC" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "production_e2ee_ready=true"
  must_not_match "$file" "audited_e2ee_claim_allowed=true"
  must_not_match "$file" "secure_messenger_claim_allowed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "external_onion_delivery_verified=true"
done

cat <<'STATUS'
status=production-local-manual-e2ee-claim-closure-ready
rb_1_local_manual_e2ee_claim_closure_reviewed=true
supported_local_manual_e2ee_ready=true
supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only
message_content_encrypted_before_manual_export=true
replay_commit_after_decrypt=true
tamper_failure_non_advance=true
retry_cancel_local_only=true
remote_ack_protocol_ready=false
automatic_network_messaging_ready=false
external_onion_delivery_verified=false
production_e2ee_ready=false
audited_e2ee_claim_allowed=false
secure_messenger_claim_allowed=false
sensitive_communication_allowed=false
security_ready_claimed=false
next_required_phase=RB-2-production-key-management-rollback-deletion-closure
STATUS

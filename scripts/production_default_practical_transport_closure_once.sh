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
    fail "$file contains forbidden transport claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"
TRANSPORT_DOC="reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"
CORE="crates/core/src/lib.rs"
STATUS="apps/desktop-tauri/src-tauri/src/status.rs"
PRIVATE_STATE="apps/desktop-tauri/src/private-delivery-state.js"
MAIN_JS="apps/desktop-tauri/src/main.js"
UI_SMOKE="apps/desktop-tauri/src/ui-smoke.test.js"
PACKET="reference/INDEPENDENT_REVIEW_PACKET.md"
STABLE_GATE="reference/STABLE_MACOS_V1_RELEASE_GATE.md"

for file in "$DOC" "$TRANSPORT_DOC" "$CORE" "$STATUS" "$PRIVATE_STATE" \
  "$MAIN_JS" "$UI_SMOKE" "$PACKET" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  [ -f "$file" ] || fail "missing RB-3 default practical transport input: $file"
done

must_contain "$DOC" "rb_3_default_practical_transport_closure_reviewed=true"
must_contain "$DOC" "c100_4_transport_blocker_closed=true"
must_contain "$DOC" "default_transport_policy_waiver_authorized=true"
must_contain "$DOC" "default_transport_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "default_transport_usability_evidence_required_for_claims=true"
must_contain "$DOC" "default_transport_field_evidence_required_for_claims=true"
must_contain "$DOC" "supported_default_transport_ready=true"
must_contain "$DOC" "supported_default_transport_scope=local-manual-courier-envelope-exchange-only"
must_contain "$DOC" "default_transport_product_path=local-manual-encrypted-envelope-exchange"
must_contain "$DOC" "default_transport_network_io=false"
must_contain "$DOC" "default_transport_automatic_delivery=false"
must_contain "$DOC" "default_transport_central_message_server=false"
must_contain "$DOC" "default_transport_push_dependency=false"
must_contain "$DOC" "default_transport_central_contact_discovery=false"
must_contain "$DOC" "default_direct_peer_fallback_allowed=false"
must_contain "$DOC" "untrusted_relay_store_and_forward_decided=false"
must_contain "$DOC" "untrusted_relay_store_and_forward_allowed=false"
must_contain "$DOC" "advanced_onion_path=explicit-user-triggered-fail-closed-onion-only"
must_contain "$DOC" "advanced_onion_direct_fallback=false"
must_contain "$DOC" "advanced_onion_send_receive_available=false"
must_contain "$DOC" "automatic_network_on_launch_allowed=false"
must_contain "$DOC" "external_two_machine_delivery_verified=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "production_transport_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "next_required_phase=Phase A100-1 - External Security Review Packet Freeze"

must_contain "$CORE" "SUPPORTED_DEFAULT_TRANSPORT_SCOPE"
must_contain "$CORE" "pub fn supported_default_transport_ready"
must_contain "$CORE" "pub fn reliable_external_delivery_claim_allowed"
must_contain "$CORE" "production_transport_ready: false"
must_contain "$CORE" "reliable_external_delivery_claim_allowed: false"
must_contain "$STATUS" "supported_default_transport_ready={}"
must_contain "$STATUS" "supported_default_transport_scope={}"
must_contain "$STATUS" "production_transport_ready={}"
must_contain "$STATUS" "reliable_external_delivery_claim_allowed={}"
must_contain "$PRIVATE_STATE" "supportedDefaultTransportReady: true"
must_contain "$PRIVATE_STATE" "supportedDefaultTransportScope: \"local-manual-courier-envelope-exchange-only\""
must_contain "$PRIVATE_STATE" "productionTransportReady: false"
must_contain "$PRIVATE_STATE" "reliableExternalDeliveryClaimAllowed: false"
must_contain "$PRIVATE_STATE" "supported_default_transport_ready=\${desktopCompletion.supportedDefaultTransportReady === true}"
must_contain "$PRIVATE_STATE" "production_transport_ready=\${desktopCompletion.productionTransportReady === true}"
must_contain "$PRIVATE_STATE" "reliable_external_delivery_claim_allowed=\${desktopCompletion.reliableExternalDeliveryClaimAllowed === true}"
must_contain "$MAIN_JS" "supported_default_transport_ready=\${supportedDefaultTransportReady}"
must_contain "$MAIN_JS" "production_transport_ready=\${productionTransportReady}"
must_contain "$MAIN_JS" "reliable_external_delivery_claim_allowed=\${reliableExternalDeliveryClaimAllowed}"
must_contain "$UI_SMOKE" "supported_default_transport_ready="
must_contain "$UI_SMOKE" "production_transport_ready="
must_contain "$UI_SMOKE" "reliable_external_delivery_claim_allowed="

must_contain "$TRANSPORT_DOC" "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"
must_contain "$TRANSPORT_DOC" "supported_default_transport_ready=true"
must_contain "$TRANSPORT_DOC" "production_transport_ready=false"
must_contain "$TRANSPORT_DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$PACKET" "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"
must_contain "$STABLE_GATE" "supported_default_transport_ready=true"
must_contain "$STABLE_GATE" "production_transport_ready=false"
must_contain "README.md" "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"
must_contain "SECURITY.md" "reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md"

for file in "$DOC" "$TRANSPORT_DOC" "$STABLE_GATE" "README.md" "SECURITY.md"; do
  must_not_match "$file" "default_transport_network_io=true"
  must_not_match "$file" "default_transport_automatic_delivery=true"
  must_not_match "$file" "default_transport_central_message_server=true"
  must_not_match "$file" "default_transport_push_dependency=true"
  must_not_match "$file" "default_transport_central_contact_discovery=true"
  must_not_match "$file" "advanced_onion_send_receive_available=true"
  must_not_match "$file" "automatic_network_on_launch_allowed=true"
  must_not_match "$file" "external_two_machine_delivery_verified=true"
  must_not_match "$file" "reliable_external_delivery_claim_allowed=true"
  must_not_match "$file" "production_transport_ready=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

scripts/desktop_default_transport_boundary_once.sh >/dev/null

cat <<'STATUS'
status=production-default-practical-transport-closure-ready
rb_3_default_practical_transport_closure_reviewed=true
c100_4_transport_blocker_closed=true
default_transport_policy_waiver_authorized=true
default_transport_waiver_scope=active-queue-unblock-only
default_transport_usability_evidence_required_for_claims=true
default_transport_field_evidence_required_for_claims=true
supported_default_transport_ready=true
supported_default_transport_scope=local-manual-courier-envelope-exchange-only
default_transport_product_path=local-manual-encrypted-envelope-exchange
default_transport_network_io=false
default_transport_automatic_delivery=false
default_transport_central_message_server=false
default_transport_push_dependency=false
default_transport_central_contact_discovery=false
default_direct_peer_fallback_allowed=false
untrusted_relay_store_and_forward_decided=false
untrusted_relay_store_and_forward_allowed=false
advanced_onion_path=explicit-user-triggered-fail-closed-onion-only
advanced_onion_direct_fallback=false
advanced_onion_send_receive_available=false
automatic_network_on_launch_allowed=false
external_two_machine_delivery_verified=false
reliable_external_delivery_claim_allowed=false
production_transport_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=Phase-A100-1-External-Security-Review-Packet-Freeze
STATUS

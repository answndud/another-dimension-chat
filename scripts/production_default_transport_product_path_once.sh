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
    fail "$file contains forbidden claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"

must_contain "$DOC" "production_default_transport_path_reviewed=true"
must_contain "$DOC" "c100_4_transport_blocker_closed=true"
must_contain "$DOC" "default_transport_policy_waiver_authorized=true"
must_contain "$DOC" "default_transport_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "default_transport_usability_evidence_required_for_claims=true"
must_contain "$DOC" "default_transport_field_evidence_required_for_claims=true"
must_contain "$DOC" "default_transport_product_path=local-manual-encrypted-envelope-exchange"
must_contain "$DOC" "default_transport_network_io=false"
must_contain "$DOC" "default_transport_automatic_delivery=false"
must_contain "$DOC" "default_transport_central_message_server=false"
must_contain "$DOC" "default_transport_push_dependency=false"
must_contain "$DOC" "default_transport_central_contact_discovery=false"
must_contain "$DOC" "default_direct_peer_fallback_allowed=false"
must_contain "$DOC" "untrusted_relay_store_and_forward_decided=false"
must_contain "$DOC" "advanced_onion_path=explicit-user-triggered-fail-closed-onion-only"
must_contain "$DOC" "advanced_onion_direct_fallback=false"
must_contain "$DOC" "advanced_onion_send_receive_available=false"
must_contain "$DOC" "automatic_network_on_launch_allowed=false"
must_contain "$DOC" "external_two_machine_delivery_verified=false"
must_contain "$DOC" "reliable_external_delivery_claim_allowed=false"
must_contain "$DOC" "production_transport_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "next_required_phase=Phase F100-1 - External Two-Machine Field Evidence Program"

must_contain "README.md" "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"
must_contain "SECURITY.md" "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"
must_contain "reference/TRANSPORT_DECISION.md" "PRODUCTION_DEFAULT_TRANSPORT_PATH.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "ops_4_default_transport_product_path_reviewed=true"
must_contain "reference/PRODUCTION_READINESS_CLAIM_GATE.md" "production_transport_ready=false"

must_contain "scripts/desktop_default_transport_boundary_once.sh" "status=desktop-default-transport-boundary-source-ready"
must_contain "apps/desktop-tauri/src/private-delivery-state.js" "default_transport_path=local-manual-encrypted-envelope-exchange"
must_contain "apps/desktop-tauri/src/private-delivery-state.js" "default_transport_network_io=false"
must_contain "apps/desktop-tauri/src/private-delivery-state.js" "high_risk_onion_direct_fallback=false"
must_contain "apps/desktop-tauri/src/private-delivery-state.test.js" "default transport boundary keeps the public diagnostic path manual and non-centralized"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "private delivery stays explicit before network work starts"
must_contain "apps/desktop-tauri/src/main.js" "function ensurePrivateDeliveryRuntimeReady"
must_contain "apps/desktop-tauri/src/main.js" "function enablePrivateDeliveryPermission"
must_contain "crates/core/src/lib.rs" "production_practical_transport_split_summary"
must_contain "crates/core/src/lib.rs" "production_practical_transport_split_keeps_default_manual_and_onion_advanced"
must_contain "crates/core/src/lib.rs" "production_transport_envelope_io_boundary_summary"
must_contain "crates/core/src/lib.rs" "production_transport_envelope_io_boundary_closes_without_external_evidence_claim"

for file in "$DOC" "README.md" "SECURITY.md" "reference/TRANSPORT_DECISION.md"; do
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
done

scripts/desktop_default_transport_boundary_once.sh >/dev/null

cat <<'STATUS'
status=production-default-transport-product-path-ready
production_default_transport_path_reviewed=true
c100_4_transport_blocker_closed=true
default_transport_policy_waiver_authorized=true
default_transport_waiver_scope=active-queue-unblock-only
default_transport_usability_evidence_required_for_claims=true
default_transport_field_evidence_required_for_claims=true
default_transport_product_path=local-manual-encrypted-envelope-exchange
default_transport_network_io=false
default_transport_automatic_delivery=false
default_transport_central_message_server=false
default_transport_push_dependency=false
default_transport_central_contact_discovery=false
default_direct_peer_fallback_allowed=false
untrusted_relay_store_and_forward_decided=false
advanced_onion_path=explicit-user-triggered-fail-closed-onion-only
advanced_onion_direct_fallback=false
advanced_onion_send_receive_available=false
automatic_network_on_launch_allowed=false
external_two_machine_delivery_verified=false
reliable_external_delivery_claim_allowed=false
production_transport_ready=false
security_ready_claimed=false
next_required_phase=Phase-F100-1-External-Two-Machine-Field-Evidence-Program
STATUS

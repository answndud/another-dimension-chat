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
    fail "$file contains forbidden pairwise identity claim pattern: $pattern"
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC="reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"

for file in "$DOC" \
  "README.md" \
  "SECURITY.md" \
  "reference/INDEPENDENT_REVIEW_PACKET.md" \
  "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" \
  "crates/identity/src/lib.rs" \
  "crates/pairing/src/lib.rs" \
  "crates/pairing/tests/pairing_fixtures.rs" \
  "crates/core/src/lib.rs" \
  "crates/storage/src/lib.rs" \
  "apps/desktop-tauri/src/main.js" \
  "apps/desktop-tauri/src/i18n.js" \
  "apps/desktop-tauri/src/action-state.test.js" \
  "apps/desktop-tauri/src/ui-smoke.test.js"; do
  [ -f "$file" ] || fail "missing pairwise identity closure input: $file"
done

must_contain "$DOC" "pairwise_identity_safety_product_closure_reviewed=true"
must_contain "$DOC" "c100_2_identity_blocker_closed=true"
must_contain "$DOC" "pairwise_identity_policy_waiver_authorized=true"
must_contain "$DOC" "pairwise_identity_waiver_scope=active-queue-unblock-only"
must_contain "$DOC" "pairwise_identity_external_audit_required_for_claims=true"
must_contain "$DOC" "pairwise_identity_field_evidence_required_for_claims=true"
must_contain "$DOC" "local_identity_persistence_source_present=true"
must_contain "$DOC" "signed_pairing_payload_source_present=true"
must_contain "$DOC" "canonical_safety_transcript_source_present=true"
must_contain "$DOC" "duplicate_pending_contact_rejected=true"
must_contain "$DOC" "duplicate_active_contact_rejected=true"
must_contain "$DOC" "same_pairwise_identity_rejected=true"
must_contain "$DOC" "identity_change_warning_boundary_reviewed=true"
must_contain "$DOC" "re_pairing_boundary_reviewed=true"
must_contain "$DOC" "safety_mismatch_revokes_saved_verification=true"
must_contain "$DOC" "accountless_contact_discovery_preserved=true"
must_contain "$DOC" "phone_number_identity_required=false"
must_contain "$DOC" "email_identity_required=false"
must_contain "$DOC" "global_account_required=false"
must_contain "$DOC" "searchable_username_required=false"
must_contain "$DOC" "central_contact_discovery_allowed=false"
must_contain "$DOC" "global_identity_claim_allowed=false"
must_contain "$DOC" "production_identity_audit_ready=false"
must_contain "$DOC" "security_ready_claimed=false"
must_contain "$DOC" "sensitive_communication_allowed=false"
must_contain "$DOC" "next_required_phase=Phase C100-4 - Default Practical Transport Product Path"

must_contain "README.md" "reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"
must_contain "SECURITY.md" "reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"
must_contain "reference/INDEPENDENT_REVIEW_PACKET.md" "reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"
must_contain "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md" "PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md"

must_contain "crates/identity/src/lib.rs" "pub struct PairwiseIdentity"
must_contain "crates/identity/src/lib.rs" "pub fn sign_pairing_payload"
must_contain "crates/identity/src/lib.rs" "pairwise_identity_signs_and_verifies_pairing_payload_bytes"
must_contain "crates/pairing/src/lib.rs" "sign_pairing_payload"
must_contain "crates/pairing/src/lib.rs" "safety_transcript_has_stable_test_vector"
must_contain "crates/pairing/src/lib.rs" "safety_transcript_changes_when_capability_or_prekey_changes"
must_contain "crates/pairing/tests/pairing_fixtures.rs" "safety_transcript_fixture_is_stable_and_order_independent"
must_contain "crates/core/src/lib.rs" "ProductionSessionError::SamePairwiseIdentity"
must_contain "crates/core/src/lib.rs" "CoreError::PairingAlreadyPending"
must_contain "crates/core/src/lib.rs" "CoreError::ContactAlreadyActive"
must_contain "crates/core/src/lib.rs" "PairwiseIdentityPrivateKey"
must_contain "crates/core/src/lib.rs" "safety_transcript_confirm"
must_contain "crates/storage/src/lib.rs" "ProductionRecordKind::PairwiseIdentityPrivateKey"
must_contain "crates/storage/src/lib.rs" "ProductionRecordKind::PairingPayload"
must_contain "crates/storage/src/lib.rs" "pub fn save_pending_contact"
must_contain "apps/desktop-tauri/src/i18n.js" "This device stores only its pairwise local identity."
must_contain "apps/desktop-tauri/src/i18n.js" "Use a fresh pairwise invite code to rebuild this room."
must_contain "apps/desktop-tauri/src/main.js" "Verification mismatch"
must_contain "apps/desktop-tauri/src/main.js" "renderManualInviteRoomRebuildFlow"
must_contain "apps/desktop-tauri/src/action-state.test.js" "pairwise invite guidance keeps discovery and messaging gates explicit"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "safety mismatch revokes the saved room verification"
must_contain "apps/desktop-tauri/src/ui-smoke.test.js" "manual invite room rebuild flow stays local-only across setup steps"

for file in "$DOC" "README.md" "SECURITY.md" "reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md"; do
  must_contain "$file" "not production-ready"
  must_contain "$file" "sensitive communication prohibited"
  must_not_match "$file" "production_identity_audit_ready=true"
  must_not_match "$file" "global_identity_claim_allowed=true"
  must_not_match "$file" "central_contact_discovery_allowed=true"
  must_not_match "$file" "security_ready_claimed=true"
  must_not_match "$file" "sensitive_communication_allowed=true"
done

cat <<'STATUS'
status=pairwise-identity-safety-product-closure-ready
pairwise_identity_safety_product_closure_reviewed=true
c100_2_identity_blocker_closed=true
pairwise_identity_policy_waiver_authorized=true
pairwise_identity_waiver_scope=active-queue-unblock-only
pairwise_identity_external_audit_required_for_claims=true
pairwise_identity_field_evidence_required_for_claims=true
local_identity_persistence_source_present=true
signed_pairing_payload_source_present=true
canonical_safety_transcript_source_present=true
duplicate_pending_contact_rejected=true
duplicate_active_contact_rejected=true
same_pairwise_identity_rejected=true
identity_change_warning_boundary_reviewed=true
re_pairing_boundary_reviewed=true
safety_mismatch_revokes_saved_verification=true
accountless_contact_discovery_preserved=true
production_identity_audit_ready=false
security_ready_claimed=false
sensitive_communication_allowed=false
next_required_phase=Phase-C100-4-Default-Practical-Transport-Product-Path
STATUS

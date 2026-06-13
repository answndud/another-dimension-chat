# Pairwise Identity And Safety Product Closure

Status: C100-2 source gate closed for product review input, not production
identity audit ready. This record connects the existing pairwise identity,
invite, safety transcript, duplicate-contact, and re-pairing boundaries to a
focused verifier without upgrading public claims.

## Product Boundary

The supported product direction is accountless pairwise contact setup:

1. A local profile owns pairwise identity material.
2. Invite payloads are signed by pairwise identity material.
3. Safety material is derived from the canonical transcript before message
   actions are unlocked.
4. Duplicate pending or active contacts are rejected instead of silently
   merging state.
5. A local rebuild or re-pairing path remains explicit and local-only.
6. A safety mismatch revokes saved verification and returns the user to
   verification before messaging.

This closure does not claim audited identity management, safe sensitive-use
identity handling, global identity discovery, directory search, or Briar/Cwtch
equivalence. Public wording remains not production-ready, not audited, and
sensitive communication prohibited.

## Evidence Anchors

- `crates/identity/src/lib.rs`: `PairwiseIdentity`, signing, verification, and
  production Ed25519 wrapper tests.
- `crates/pairing/src/lib.rs`: signed pairing payloads, canonical payload
  bytes, and canonical safety transcript fixtures.
- `crates/pairing/tests/pairing_fixtures.rs`: stable, order-independent safety
  transcript fixture coverage.
- `crates/core/src/lib.rs`: duplicate pending/active contact rejection,
  same-identity rejection, pairwise identity private-key storage boundary, and
  safety transcript confirmation gates.
- `crates/storage/src/lib.rs`: encrypted-at-rest record kinds for pairing
  payloads and pairwise identity private keys plus pending contact storage.
- `apps/desktop-tauri/src/main.js`: invite room, safety confirmation,
  mismatch/rebuild, and saved-room verification revocation surfaces.
- `apps/desktop-tauri/src/ui-smoke.test.js`: focused UI state coverage for
  pairwise invite guidance, safety mismatch revocation, duplicate receive
  blocking, and local rebuild flow.

## Current Flags

- pairwise_identity_safety_product_closure_reviewed=true
- local_identity_persistence_source_present=true
- signed_pairing_payload_source_present=true
- canonical_safety_transcript_source_present=true
- duplicate_pending_contact_rejected=true
- duplicate_active_contact_rejected=true
- same_pairwise_identity_rejected=true
- identity_change_warning_boundary_reviewed=true
- re_pairing_boundary_reviewed=true
- safety_mismatch_revokes_saved_verification=true
- accountless_contact_discovery_preserved=true
- phone_number_identity_required=false
- email_identity_required=false
- global_account_required=false
- searchable_username_required=false
- central_contact_discovery_allowed=false
- global_identity_claim_allowed=false
- production_identity_audit_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=C100-3 key management rollback prevention storage lifecycle

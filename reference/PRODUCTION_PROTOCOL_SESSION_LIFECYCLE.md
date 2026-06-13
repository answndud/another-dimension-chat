# Production Protocol And Session Lifecycle

Status: OPS-2 and RB-1 source gates closed for review input. The supported
local/manual envelope message-content E2EE scope is ready, but broad
production_e2ee_ready remains false. This document describes the current 1:1
protocol/session state machine used for claim review. It does not authorize a
secure messenger, audited, production-ready, sensitive communication, automatic
network messaging, remote acknowledgement, or reliable external onion delivery
claim.

C100-1 is closed for active-queue progress by explicit owner policy waiver
only. External review, audit, real field evidence, production E2EE, secure
messenger, security-ready, reliable delivery, and sensitive-use claims remain
false or hold.

## Shared Semantics

The local manual envelope path and any future transport path must share the same
message/session semantics:

- signed pairwise identity payload before session setup
- canonical safety transcript before user trust
- Noise XX session setup boundary for the current synchronous 1:1 invite path
- channel/message-number/nonce binding before envelope export/import
- replay rejection before commit
- tamper failure must not advance replay state
- explicit outbound envelope export
- explicit inbound envelope import
- retryable local failure state
- terminal cancel state
- received transcript state
- local conversation delete and session delete with separate scopes

Future transport may carry the same encrypted envelope, but it must not define a
different message number, replay, retry, cancel, or deletion model.

## State Machine

1. `unpaired`: no pairwise session exists.
2. `invite-created`: local signed production pairing payload exists; invite
   payload includes the Noise prekey bundle and capability commitments.
3. `invite-accepted`: remote signed production pairing payload is decoded and
   checked; mixed dev/production schemes and invalid Noise prekey bundles are
   rejected.
4. `safety-transcript-ready`: pairwise identity, endpoint/capability material,
   and setup material are bound into the safety transcript.
5. `session-draft-ready`: local Noise static private key, pairing draft,
   endpoint state, replay window, and transport state are prepared for encrypted
   local storage.
6. `session-unlocked`: passphrase-first local profile unlock allows session
   records to be used; no OS-keystore-only unlock is required or claimed.
7. `outbound-pending`: a message is locally queued with a message number and
   explicit user action requirement.
8. `envelope-exported`: encrypted envelope is exported manually; no automatic
   network delivery starts.
9. `inbound-imported`: imported envelope decrypts and replay commits only after
   successful decrypt.
10. `received-transcript`: plaintext is shown locally after successful import;
    public diagnostics must not export message text.
11. `retryable-failure`: failed export/import/delivery attempt remains local and
    can be retried without changing the protocol semantics.
12. `send-canceled-terminal`: user cancel marks the selected pending send as
    terminal and must not point composer/follow-up copy at the wrong row.
13. `conversation-deleted`: local conversation message records are deleted while
    session resume records are preserved.
14. `session-deleted`: local session resume records are deleted while message
    records are preserved.

## Edge-Case Rules

- Message number zero is invalid.
- Duplicate message numbers in the replay window are rejected.
- Old message numbers outside the replay window are rejected.
- Tampered ciphertext must fail without advancing replay state.
- Retry uses the selected local pending row and must not create a remote success
  claim.
- Cancel is terminal for the selected local pending row.
- Remote acknowledgement protocol is not ready and must not be implied.
- External onion delivery verification is false.
- Runtime messaging remains false until the transport product gate is complete.
- dev-insecure behavior remains visibly separate from default production
  surfaces and must not be exposed as production messaging.

## RB-1 Supported Local Manual E2EE Scope

The RB-1 claim boundary is recorded in
`reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`.

Allowed wording is limited to supported 1:1 local/manual encrypted envelope
message-content encryption in the current app flow. Message content is encrypted
before manual export, replay commits only after successful decrypt, tamper
failure does not advance receive state, and retry/cancel remain local state.

This boundary still keeps automatic network messaging, remote delivery
acknowledgement, reliable external delivery, audited E2EE, secure messenger,
sensitive-use, and broad production E2EE claims false.

## D100-1 Source Gate

The pass-capable source gate for this supported protocol/session surface is
recorded in `reference/PRODUCTION_E2EE_SOURCE_GATE.md`. It joins the existing
state machine, local/manual E2EE claim boundary, pairwise identity/safety
transcript gate, and encrypted local session-record boundary without upgrading
production, audit, reliable-delivery, or sensitive-use claims.

## Existing Test Anchors

The source gate relies on the following targeted tests and code boundaries:

- `production_session_readiness_gate_lists_blockers_without_opening_runtime`
- `production_async_delivery_semantics_are_reviewed_without_network_claim`
- `production_local_manual_e2ee_runtime_gate_closes_session_failure_model_without_claims`
- `tampered_receive_does_not_persist_replay_before_valid_same_number`
- `cancelled_pending_pairing_cannot_be_confirmed`
- `ReplayWindow::accept_after_decrypt`
- `ProductionEnvelopeSession`
- `production_local_manual_e2ee_runtime_summary`
- `production_async_delivery_semantics_summary`
- `production_session_readiness_gate`

## External Review Questions

These questions remain unresolved and must stay in the external review packet:

- Is the current Noise XX synchronous 1:1 invite boundary sufficient for the
  first stable release, or is a reviewed ratchet required before any E2EE claim?
- What forward secrecy and post-compromise recovery properties are required
  before public wording may change?
- How should Noise static private keys be rotated, deleted, and migrated?
- What exact remote static verification and safety transcript UX is sufficient
  for non-expert users?
- How should remote acknowledgement, retry, and cancel semantics interact with
  future transport delivery without creating false delivery success claims?
- What rollback/key-management evidence is required before replay/session state
  persistence can support stronger claims?

## Current Decision

- protocol_session_lifecycle_gate_reviewed=true
- c100_1_e2ee_blocker_closed=true
- production_e2ee_policy_waiver_authorized=true
- production_e2ee_waiver_scope=active-queue-unblock-only
- production_e2ee_external_review_required_for_claims=true
- production_e2ee_field_evidence_required_for_claims=true
- local_manual_and_future_transport_semantics_shared=true
- replay_duplicate_retry_cancel_edges_documented=true
- dev_insecure_surface_blocked_from_production_claim=true
- production_e2ee_source_gate_reviewed=true
- production_e2ee_source_ready=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
- rb_1_local_manual_e2ee_claim_closure_reviewed=true
- supported_local_manual_e2ee_ready=true
- supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only
- remote_ack_protocol_ready=false
- automatic_network_messaging_ready=false
- external_onion_delivery_verified=false
- runtime_messaging_ready=false
- production_e2ee_ready=false
- security_ready_claimed=false
- next_required_phase=Phase C100-5 - Advanced Onion/Tor Evidence Boundary

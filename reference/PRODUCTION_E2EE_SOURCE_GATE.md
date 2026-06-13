# Production E2EE Source Gate

Status: D100-1 source gate is ready for the supported local/manual 1:1
envelope message-content scope. C100-1 is closed for active-queue progress by
explicit owner policy waiver only. This is a source-readiness gate only. It is
not a secure messenger claim, not a broad production E2EE readiness claim, not
an audit result, not reliable external delivery evidence, and not permission for
sensitive communication.

## Source-Ready Scope

This gate treats the following source-backed scope as pass-capable:

- supported local/manual 1:1 envelope message-content encryption,
- signed pairwise identity payload before session setup,
- canonical safety transcript before user trust,
- Noise XX session setup boundary for the current synchronous 1:1 invite path,
- channel/message-number/nonce binding before envelope export/import,
- replay state commits only after successful decrypt,
- tampered ciphertext does not advance receive replay state,
- retry and cancel remain local state with no remote acknowledgement claim,
- conversation delete and session delete have separate local semantics,
- durable session record boundaries remain encrypted local storage boundaries.

The gate is deliberately narrower than `production_e2ee_ready`. It confirms that
the current source has a coherent pass/fail boundary for review; it does not
claim the product is ready for sensitive communication or production use.

The selected workaround is an explicit owner policy waiver for C100-1 only:
missing external protocol review, audit, and field evidence no longer keep
C100-1 in the active queue, but production E2EE, secure messenger, audited,
security-ready, reliable delivery, and sensitive-use claims remain blocked
until real evidence or a later explicit claim-policy decision exists.

## Required Anchors

- `reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md`
- `reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`
- `reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md`
- `reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md`
- `crates/protocol/src/lib.rs`: `ReplayWindow::accept_after_decrypt`
- `crates/core/src/lib.rs`: `ProductionEnvelopeSession`
- `crates/core/src/lib.rs`: `production_local_manual_e2ee_runtime_summary`

## Focused Test Anchors

- `replay_window_accept_after_decrypt_does_not_commit_on_decrypt_error`
- `replay_window_rejects_duplicates_and_old_messages`
- `production_local_manual_e2ee_runtime_gate_closes_session_failure_model_without_claims`
- `tampered_receive_does_not_persist_replay_before_valid_same_number`
- `cancelled_pending_pairing_cannot_be_confirmed`
- `production_session_lifecycle_status_and_delete_are_redacted`

## Remaining Holds

These remain false or hold until separate evidence exists:

- remote acknowledgement protocol,
- automatic network messaging,
- reliable external onion delivery,
- external review or audit completion,
- production-ready E2EE wording,
- secure messenger wording,
- sensitive communication safe or allowed wording,
- production key-management completion,
- rollback prevention and secure media deletion claims.

## Current Gate Flags

- production_e2ee_source_gate_reviewed=true
- c100_1_e2ee_blocker_closed=true
- production_e2ee_policy_waiver_authorized=true
- production_e2ee_waiver_scope=active-queue-unblock-only
- production_e2ee_external_review_required_for_claims=true
- production_e2ee_field_evidence_required_for_claims=true
- production_e2ee_source_ready=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
- supported_local_manual_e2ee_ready=true
- supported_local_manual_e2ee_scope=1:1-local-manual-envelope-message-content-only
- signed_pairwise_identity_payload_required=true
- canonical_safety_transcript_required=true
- noise_xx_session_boundary_present=true
- message_number_nonce_binding_present=true
- replay_commit_after_decrypt=true
- tamper_failure_non_advance=true
- retry_cancel_local_only=true
- local_delete_semantics_split=true
- durable_session_record_boundary_reviewed=true
- dev_insecure_surface_blocked_from_production_claim=true
- production_e2ee_ready=false
- production_e2ee_claim_allowed=false
- audited_e2ee_claim_allowed=false
- secure_messenger_claim_allowed=false
- sensitive_communication_allowed=false
- remote_ack_protocol_ready=false
- automatic_network_messaging_ready=false
- external_onion_delivery_verified=false
- external_review_completed=false
- audit_completed=false
- security_ready_claimed=false
- next_required_phase=Phase C100-4 - Default Practical Transport Product Path

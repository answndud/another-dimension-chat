# Production Default Transport Product Path

Status: OPS-4 and RB-3 source-side product path gates closed. C100-4 is closed
for active-queue progress by explicit owner policy waiver only. The supported
default practical transport scope is local/manual courier envelope exchange
only. This is a default product flow decision and review input, not a claim of
reliable external onion delivery, automatic network messaging, production
readiness, audited security, or sensitive-use safety.

The practical default path for the desktop-first 1:1 flow is local manual
encrypted envelope exchange. The advanced high-risk onion/Tor path remains
separate, explicit-user-triggered, onion-only, direct-fallback-rejected, and
fail-closed until later implementation and field evidence phases.

## Product Decision

- Default path: local manual encrypted envelope exchange.
- Supported default scope:
  `reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md`.
- Advanced path: high-risk onion/Tor, explicit user action only.
- No central trusted server is introduced.
- No phone number, email, global account, searchable username, central contact
  discovery, central message server, push-notification dependency, or cloud
  backup dependency is introduced.
- Direct P2P/WebRTC/STUN/TURN/ICE-style fallback is not allowed for high-risk
  default transport.
- Untrusted relay/store-and-forward is not selected in OPS-4. It remains a
  separate future decision because it needs retention, abuse, metadata, replay,
  and no-central-trusted-server analysis.

## User Flow

1. Two users create or open local profiles.
2. One user creates an invite room and shares the invite code through a channel
   they choose outside the app.
3. The other user joins with the invite code.
4. Both users compare the safety phrase before messaging.
5. The sender writes a message, exports the encrypted envelope, and transfers it
   through an explicit user-mediated channel.
6. The receiver imports the envelope, sees the received transcript entry, and
   can reply by exporting a new encrypted envelope.
7. Retry and cancel remain local lifecycle actions. They do not imply remote
   receipt or external delivery success.

This flow is intentionally slower than automatic network delivery. It is the
only currently selected default because it is understandable, accountless,
central-server-free, and compatible with the current source evidence.

## Advanced Onion/Tor Boundary

The advanced onion/Tor path is not the default user path. It can only be exposed
as explicit user action behind fail-closed checks. Current source boundaries
keep automatic network on launch false, direct fallback false, send/receive
availability false, and external two-machine delivery verification false.

Any future change that opens real onion send/receive must keep:

- explicit user consent before network work,
- no direct fallback,
- no central account or contact discovery,
- no raw endpoint, bridge line, path, profile, payload, passphrase, or key
  material in diagnostics,
- a field evidence trail before reliability wording changes.

## Evidence Order

The allowed evidence order is:

1. same-machine two-profile rehearsal,
2. local two-instance rehearsal,
3. external two-machine rehearsal on different networks,
4. repeated redacted field reports,
5. external review before reliability or sensitive-use wording changes.

OPS-4 only fixes the product path and source gate. It does not fabricate or
replace external two-machine evidence.

The selected workaround is an explicit owner policy waiver for C100-4 only:
missing representative usability and real field evidence no longer keep C100-4
in the active queue, but production transport, reliable external delivery,
automatic delivery, remote acknowledgement, security-ready, and sensitive-use
claims remain blocked until real evidence or a later explicit claim-policy
decision exists.

## Evidence Anchors

- Practical transport split: `production_practical_transport_split_summary`
  in `crates/core/src/lib.rs`
- Onion envelope I/O non-claim boundary:
  `production_transport_envelope_io_boundary_summary` in
  `crates/core/src/lib.rs`
- Default transport beta verifier:
  `scripts/desktop_default_transport_boundary_once.sh`
- Manual courier envelope recovery verifier:
  `scripts/desktop_manual_courier_envelope_recovery_once.sh`
- Manual courier envelope recovery contract:
  `reference/MANUAL_COURIER_ENVELOPE_RECOVERY.md`
- Desktop diagnostics default transport status:
  `apps/desktop-tauri/src/private-delivery-state.js`
- UI explicit private delivery gate:
  `apps/desktop-tauri/src/main.js`
- Transport policy decision history: `reference/TRANSPORT_DECISION.md`

Targeted tests that anchor this gate:

- `production_practical_transport_split_keeps_default_manual_and_onion_advanced`
- `production_transport_envelope_io_boundary_closes_without_external_evidence_claim`
- `manual message envelope slots are import-ready only for active lifecycle rows`
- `manual message envelope slots are scoped to the room fingerprint`
- `private delivery stays explicit before network work starts`
- `default transport boundary keeps the public diagnostic path manual and non-centralized`

## Current Gate Flags

- production_default_transport_path_reviewed=true
- c100_4_transport_blocker_closed=true
- default_transport_policy_waiver_authorized=true
- default_transport_waiver_scope=active-queue-unblock-only
- default_transport_usability_evidence_required_for_claims=true
- default_transport_field_evidence_required_for_claims=true
- rb_3_default_practical_transport_closure_reviewed=true
- supported_default_transport_ready=true
- supported_default_transport_scope=local-manual-courier-envelope-exchange-only
- default_transport_product_path=local-manual-encrypted-envelope-exchange
- manual_courier_envelope_recovery_available=true
- legacy_unscoped_envelope_import_ready=false
- wrong_room_envelope_import_ready=false
- stale_envelope_import_ready=false
- stale_envelope_recovery_hint_ready=true
- default_transport_network_io=false
- default_transport_automatic_delivery=false
- default_transport_central_message_server=false
- default_transport_push_dependency=false
- default_transport_central_contact_discovery=false
- default_direct_peer_fallback_allowed=false
- untrusted_relay_store_and_forward_decided=false
- untrusted_relay_store_and_forward_allowed=false
- advanced_onion_path=explicit-user-triggered-fail-closed-onion-only
- advanced_onion_direct_fallback=false
- advanced_onion_send_receive_available=false
- automatic_network_on_launch_allowed=false
- external_two_machine_delivery_verified=false
- reliable_external_delivery_claim_allowed=false
- production_transport_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- next_required_phase=Phase O100-1 - Operations, Incident, And Vulnerability Readiness

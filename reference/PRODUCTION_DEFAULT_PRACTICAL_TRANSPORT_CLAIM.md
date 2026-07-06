# Production Default Practical Transport Claim Closure

Status: RB-3 source-side default practical transport closure is complete for
the supported local/manual courier envelope exchange scope. This is not reliable
external delivery, not automatic network messaging, not production transport
readiness, not a secure messenger claim, and not permission for sensitive
communication.

RB-3 resolves the default transport blocker by choosing the stable desktop
default path that is implemented and recoverable today: explicit local/manual
encrypted envelope export/import carried by a user-chosen external channel. The
advanced onion/Tor path remains separate, explicit-user-triggered, onion-only,
fail-closed, and non-default until real field evidence and review close later
phases.

## Allowed Claim Scope

Allowed public-safe wording:

- the supported default desktop transport is local/manual encrypted envelope
  exchange,
- users explicitly export and import encrypted envelopes through a user-chosen
  courier channel,
- default transport performs no app-start network I/O, no automatic background
  delivery, and no push delivery,
- no phone, email, global account, searchable username, central contact
  discovery, or central message server is required,
- high-risk onion/Tor is an advanced explicit path and is not the default.

## Still Forbidden

Do not claim:

- reliable external onion delivery,
- external two-machine delivery success,
- production transport readiness,
- automatic network send/receive,
- background retry, push notification delivery, or remote acknowledgement,
- untrusted relay/store-and-forward readiness,
- central message server delivery,
- secure messenger, production-ready, audited, or sensitive-use safe status.

## Code And Runtime Anchors

- `production_practical_transport_split_summary`
- `production_transport_envelope_io_boundary_summary`
- desktop public diagnostics:
  `supported_default_transport_ready=true`
- desktop public diagnostics:
  `supported_default_transport_scope=local-manual-courier-envelope-exchange-only`
- desktop public diagnostics:
  `production_transport_ready=false`
- desktop public diagnostics:
  `reliable_external_delivery_claim_allowed=false`

## Current Gate Flags

- rb_3_default_practical_transport_closure_reviewed=true
- supported_default_transport_ready=true
- supported_default_transport_scope=local-manual-courier-envelope-exchange-only
- default_transport_product_path=local-manual-encrypted-envelope-exchange
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
- next_required_phase=RB-4 macOS UX usability and recovery closure

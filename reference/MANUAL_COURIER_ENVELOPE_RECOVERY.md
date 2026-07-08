# Manual Courier Envelope Recovery

Status: source-ready manual courier envelope recovery boundary for the default
desktop transport path. This is not external delivery evidence, not reliable
onion delivery, not automatic network messaging, not production transport
readiness, and not permission for sensitive communication.

The default transport remains local/manual encrypted envelope exchange. Manual
envelope import must be scoped to the active pending row so wrong-room, stale,
legacy unscoped, canceled, or already received envelope slots cannot be treated
as import-ready.

## Recovery Contract

- A stored envelope slot must be created by an explicit manual envelope export
  action and carry the local/manual transport boundary.
- A stored envelope slot must match sender, receiver, room fingerprint, message
  number, and message text for the selected pending row.
- Legacy string-only slots are treated as unscoped and require re-export before
  import.
- Slots without the explicit manual export marker require re-export before
  import.
- Wrong-room envelope slots return a recovery hint to reopen the matching room
  or export the selected pending message again.
- Stale message number or message-body slots return a recovery hint to export
  the selected pending message again.
- Canceled or already received rows are not import-ready and show lifecycle
  recovery hints instead of treating the envelope as usable.
- Stale slot pruning may remove unscoped legacy slots.

## Current Gate Flags

- manual_courier_envelope_recovery_available=true
- manual_envelope_active_pending_row_required=true
- manual_envelope_explicit_user_export_required=true
- manual_envelope_slot_network_io=false
- manual_envelope_slot_automatic_delivery=false
- manual_envelope_sender_receiver_match_required=true
- manual_envelope_room_fingerprint_match_required=true
- manual_envelope_message_number_match_required=true
- manual_envelope_message_body_match_required=true
- legacy_unscoped_envelope_import_ready=false
- implicit_envelope_import_ready=false
- wrong_room_envelope_import_ready=false
- stale_envelope_import_ready=false
- canceled_envelope_import_ready=false
- duplicate_received_envelope_import_ready=false
- canceled_envelope_recovery_hint_ready=true
- duplicate_received_envelope_recovery_hint_ready=true
- stale_envelope_recovery_hint_ready=true
- default_transport_network_io=false
- default_transport_automatic_delivery=false
- automatic_network_on_launch_allowed=false
- reliable_external_delivery_claim_allowed=false
- production_transport_ready=false
- security_ready_claimed=false
- sensitive_communication_allowed=false

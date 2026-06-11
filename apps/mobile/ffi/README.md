# Mobile Shared-Core FFI Inventory Boundary

This is a documentation-only naming and API inventory for future mobile wrapper
bindings.

It is not a UniFFI definition, not generated bindings, not Kotlin or Swift
runtime source, and not a buildable mobile app.

The FFI direction is placeholder-only: Android and iOS wrappers may call a thin
shared Rust core boundary later, but this file does not create that boundary or
claim it is implemented.

Allowed API groups mirror the shared core wrapper boundary:

- `shared_core_status_surface`
- `profile_unlock_lock_status`
- `invite_code_create_join`
- `pairing_payload_export_import`
- `safety_transcript_confirm`
- `manual_envelope_export_import`
- `message_transcript_view`
- `local_data_lifecycle`
- `redacted_support_diagnostics`

These names are inventory labels, not exported functions. A later binding phase
must still define concrete signatures, error taxonomy, serialization, memory
ownership, and platform packaging.

This inventory must not export raw storage open calls, local paths, passphrases,
private keys, key material, plaintext messages, automatic network bootstrap,
background delivery loops, push delivery, central contact discovery, central
message server behavior, wrapper-specific protocol/storage/transport semantics,
or security-ready claims.

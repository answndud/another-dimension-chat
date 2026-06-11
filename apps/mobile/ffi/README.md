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

## Signature Placeholder Boundary

The first concrete signature pass must remain documentation-only until a
separate binding implementation phase exists.

All future mobile-callable signatures must use a narrow handle-and-bytes shape:

- opaque `ProfileHandle` or explicit locked/unlocked status handles, not raw
  filesystem paths or secrets
- UTF-8 strings or canonical byte buffers for invite, pairing, envelope,
  transcript, lifecycle, and diagnostics inputs
- redacted structured result objects for status and diagnostics outputs
- explicit error codes for locked profile, malformed payload, replay rejected,
  policy blocked, transport unavailable, and unsupported mobile surface
- caller-owned input buffers and core-owned returned buffers with explicit release
  in the binding layer
- explicit user action tokens for destructive lifecycle or transport-adjacent
  operations

This placeholder does not define a `.udl` file, generated bindings, FFI symbols,
callable mobile FFI, stable ABI, memory ownership contract, serialization
contract, thread model, mobile packaging, binding generation, or mobile app readiness.
It also does not allow passphrases, private keys, key material,
plaintext message history, local database handles, raw filesystem paths,
background delivery loops, push notification delivery, central discovery, or
central message server behavior to cross the boundary.

## Status Command DTO Boundary

The future mobile wrapper status command DTO is a documentation-only redacted
status object, not a callable command surface.

Allowed DTO vocabulary is limited to schema version, platform, profile lock
state, runtime command surface, mobile command surface, local data lifecycle
state, backup-exclusion state, install/update integrity state, diagnostics
redaction state, and public non-claims.

The DTO must not contain profile paths, database paths, store paths,
passphrases, private keys, key material, plaintext messages, onion addresses,
network endpoints, delivery runtime handles, push tokens, cloud backup
identifiers, central account identifiers, or security-ready toggles.

## DTO Serialization Placeholder Boundary

The future mobile status DTO serialization is documentation-only until a
separate implementation phase defines concrete code.

Allowed serialization vocabulary is limited to deterministic UTF-8 JSON object
shape, explicit schema version, sorted keys, string enums, booleans, redacted
diagnostic strings, bounded arrays of status labels, canonical byte buffers only
where a later binding explicitly requires bytes, and reject-unknown-fields
parsing.

The placeholder does not define a serializer, parser, schema file, generated
model, stable wire format, cross-version migration, ABI, or mobile packaging.
It must not serialize profile paths, database paths, store paths, passphrases,
private keys, key material, plaintext messages, onion addresses, network
endpoints, delivery runtime handles, push tokens, cloud backup identifiers,
central account identifiers, raw logs, support bundles, crash dumps, or
security-ready toggles.

This inventory must not export raw storage open calls, local paths, passphrases,
private keys, key material, plaintext messages, automatic network bootstrap,
background delivery loops, push delivery, central contact discovery, central
message server behavior, wrapper-specific protocol/storage/transport semantics,
or security-ready claims.

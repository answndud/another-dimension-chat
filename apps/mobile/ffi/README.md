# Mobile Shared-Core FFI Inventory Boundary

This is a documentation-only naming and API inventory for future mobile wrapper
bindings.

It is not a UniFFI definition, not generated bindings, not Kotlin or Swift
runtime source, and not a buildable mobile app.

The FFI direction is placeholder-only: Android and iOS wrappers may call a thin
shared Rust core boundary later, but this file does not create that boundary or
claim it is implemented.

## Shared-Core API Freeze Boundary

The mobile API freeze is a Phase HO source-boundary record. It defines the
wrapper-neutral contract that Android and iOS must share, but it does not define
callable FFI, generated bindings, stable ABI, Kotlin source, Swift source,
Gradle source, Xcode source, or runtime mobile implementation.

The shared-core API freeze closes these source-boundary items before mobile
wrapper implementation:

- mobile-callable API groups and command names
- redacted DTO vocabulary and public non-claim fields
- error taxonomy for locked profile, malformed payload, replay rejected, policy
  blocked, transport unavailable, unsupported mobile surface, and lifecycle
  confirmation required
- serialization contract with deterministic UTF-8 JSON object shape, explicit
  schema version, sorted keys, string enums, bounded status arrays, and
  reject-unknown-fields parsing
- local data lifecycle command contract for conversation delete, session delete,
  profile delete, and full local wipe
- diagnostics redaction contract for status/build/failure/recovery only
- memory ownership and buffer release model for any later binding layer
- explicit user action token requirement for destructive or transport-adjacent
  calls

The core source summary is `production_mobile_shared_core_api_freeze_boundary_summary`.
It keeps callable FFI implemented false, generated bindings claimed false,
wrapper-specific semantics allowed false, mobile readiness claimed false, and
security-ready claimed false.

Wrappers must not add independent protocol, storage, transport, pairing,
lifecycle, diagnostics, account, discovery, delivery, backup, or security-ready
semantics.

## Native Binding Implementation Gate

The first binding implementation unit is
`status_and_redacted_diagnostics_read_only_adapter`. It may expose only
`shared_core_status_surface` and `redacted_support_diagnostics` through a native
adapter. It must keep profile unlock, invite, pairing, safety transcript,
manual envelope, transcript view, lifecycle commands, network I/O, runtime
messaging, and destructive lifecycle operations blocked until later phases.

The source contract is `shared_core_mobile_api_contract.json`. Android and iOS
placeholder adapters must match its API group names, DTO fields, command result
fields, error taxonomy, serialization contract, diagnostics fields, forbidden
semantics, and first binding unit gate before any generated binding is added.

This gate keeps binding generation implemented false, callable FFI implemented
false, generated bindings claimed false, mobile readiness claimed false, and
security-ready claimed false.

## Source Boundary Cleanup Summary

`source_boundary_cleanup.json` is the canonical cleanup record for repeated
false and blocked mobile source-boundary wording. It keeps verifier output and
README language aligned after the callable FFI authorization hold.

Canonical false state:

- binding generation implemented false
- callable FFI implemented false
- generated bindings claimed false
- owner authorization for callable FFI false
- explicit callable FFI implementation request false
- callable FFI may start false
- generated binding may start false
- native runtime messaging may start false
- network delivery may start false
- release packaging may start false
- mobile readiness claimed false
- security-ready claimed false

Canonical blocked state: generated bindings, callable FFI, native runtime
messaging, native network delivery, background delivery, push notification
delivery, release packaging, store distribution, mobile readiness claim, and
security-ready claim remain blocked.

Canonical allowed state while blocked: source boundary docs, static verifiers,
read-only status adapter source, blocked command adapter source, and operator
handoff docs.

## Authorization Hold Regression Matrix

`authorization_hold_regression_matrix.json` records the forbidden implementation
patterns that must stay absent while owner authorization for callable FFI is
false and explicit callable FFI implementation request is false.

The regression matrix checks for generated binding artifacts, callable FFI
definition files, Android native bridge calls, iOS native bridge calls, native
network/runtime messaging entry points, mobile release packaging artifacts, and
forbidden readiness/security claims.

Expected matrix output:

- forbidden file extensions absent
- forbidden path fragments absent
- forbidden Android source patterns absent
- forbidden iOS source patterns absent
- forbidden claim patterns absent

## Owner Authorization Transition Runbook

`owner_authorization_transition_runbook.json` records the source-level sequence
required before any later phase may turn owner authorization for callable FFI
from false to true. The current state remains authorization false implementation
blocked.

Required transition inputs:

- explicit owner authorization for native binding
- explicit callable FFI implementation request
- named first callable FFI scope
- accepted memory release contract
- accepted serialization vectors
- accepted error mapping table
- accepted diagnostics redaction boundary
- accepted Android/iOS adapter parity
- accepted authorization hold regression matrix

Required transition order: record owner authorization, record explicit callable
FFI implementation request, name first callable FFI scope, update authorization
hold contract, update shared core mobile API contract, update regression matrix
for allowed first scope, add minimal callable FFI verifier, and run source
handoff verifier before implementation.

Rollback checks: owner authorization for callable FFI can return false, explicit
callable FFI implementation request can return false, callable FFI may start can
return false, generated binding may start can return false, source handoff
returns to blocked state, no generated artifacts after rollback, no release
packaging after rollback, and no mobile readiness or security-ready claim after
rollback.

## Pre-Implementation Handoff Packet

`pre_implementation_handoff_packet.json` is the handoff packet for any future
mobile implementer before owner authorization is granted. The current state is
authorization false implementation blocked.

The packet references:

- binding prerequisite closure
- callable FFI authorization hold
- source boundary cleanup
- authorization hold regression matrix
- owner authorization transition runbook
- `scripts/verify_mobile_source_handoff.sh`

Required packet outputs include
`status=mobile-binding-prerequisite-closure-verified`,
`status=mobile-callable-ffi-authorization-hold-verified`,
`status=mobile-source-boundary-cleanup-verified`,
`status=mobile-authorization-hold-regression-matrix-verified`,
`status=mobile-owner-authorization-transition-verified`, and
`status=mobile-source-handoff-verified`.

Handoff instructions: do not create generated bindings, do not create callable
FFI, do not create native runtime messaging, do not create native network
delivery, do not create release packaging, do not claim mobile readiness, do not
claim security ready, and run `scripts/verify_mobile_source_handoff.sh` before
any transition.

## Read-Only Native Status Adapter Boundary

Android and iOS now carry a source-only read-only adapter path for the first
binding unit, `status_and_redacted_diagnostics_read_only_adapter`.

That adapter may return only the redacted `shared_core_status_surface` and
`redacted_support_diagnostics` status DTOs. It must not unlock profiles, create
or join invites, import or export pairing payloads, confirm safety transcripts,
import or export manual envelopes, view message transcripts, run lifecycle
commands, open native network I/O, run runtime messaging, or perform destructive
lifecycle operations.

The read-only adapter path keeps binding generation implemented false, callable
FFI implemented false, generated bindings claimed false, wrapper-specific
protocol/storage/transport semantics false, mobile readiness claimed false, and
security-ready claimed false.

## Blocked Command Adapter Boundary

Android and iOS also carry a source-only blocked command adapter path for every
non-read-only mobile command surface. That adapter must return only
`SharedCoreCommandResult(status = "blocked", ...)` style results using the
shared error taxonomy: `locked_profile`, `policy_blocked`, and
`ffi_unavailable` for the current source boundary.

The blocked adapter covers `profile_unlock_lock_status`,
`invite_code_create_join`, `pairing_payload_export_import`,
`safety_transcript_confirm`, `manual_envelope_export_import`,
`message_transcript_view`, and `local_data_lifecycle`. It must not implement
unlock, invite, pairing, safety transcript confirmation, envelope import/export,
message transcript loading, lifecycle mutation, native network I/O, runtime
messaging, or destructive lifecycle execution.

The blocked adapter path keeps binding generation implemented false, callable
FFI implemented false, generated bindings claimed false, wrapper-specific
protocol/storage/transport semantics false, mobile readiness claimed false, and
security-ready claimed false.

## Operator Handoff Verification Boundary

Use `scripts/verify_mobile_source_handoff.sh` to check the current mobile source
scaffold state. It aggregates the targeted source-boundary verifiers for the
read-only status adapter, blocked command adapter, shell presentation,
redacted diagnostics copy, local lifecycle confirmation, no-network launch
boundary, Android shell boundary, iOS shell boundary, binding gate, and mobile
skeleton boundary. It also includes the callable FFI authorization hold, source
boundary cleanup, authorization hold regression matrix, and owner authorization
transition runbook verifiers. It also includes the pre-implementation handoff
packet verifier.

This handoff verifier is not a release build, not generated binding validation,
not APK/AAB/IPA packaging, not store distribution, not runtime messaging
validation, not network delivery evidence, and not a mobile readiness claim.

It is not runtime messaging validation.

## Native Binding Readiness Gate

Native binding implementation remains blocked until an explicit later phase
records that all readiness prerequisites are met. This gate is source-level
only: it does not create generated bindings, callable FFI, native runtime
messaging, network delivery, release packaging, or store distribution.

Callable FFI may not start until all of these are true:

- explicit owner authorization for native binding
- memory ownership and release contract finalized
- canonical serialization test vectors finalized
- FFI error mapping table finalized
- redacted diagnostics payload reviewed
- Android/iOS adapter parity verified
- `scripts/verify_mobile_source_handoff.sh` passing

Blocked until a later phase:

- unlock callable FFI
- invite callable FFI
- pairing callable FFI
- envelope callable FFI
- transcript callable FFI
- lifecycle callable FFI
- native network runtime
- background delivery
- push notification delivery
- release packaging

This readiness gate keeps callable FFI implemented false, generated binding
may start false, native runtime messaging may start false, network delivery may
start false, release packaging may start false, mobile readiness claimed false,
and security-ready claimed false.

Readiness flags: callable FFI implemented false; generated binding may start
false; native runtime messaging may start false; network delivery may start
false; release packaging may start false; mobile readiness claimed false;
security-ready claimed false.

- generated binding may start false
- native runtime messaging may start false
- network delivery may start false
- release packaging may start false

## FFI Error Mapping Table Boundary

The mobile FFI error mapping table is source-level only. It finalizes the
current shared error vocabulary for a future binding layer, but it does not
create callable FFI, generated bindings, native runtime messaging, native
network delivery, or release packaging.

Every mapped error returns the same command result shape on Kotlin and Swift:
`SharedCoreCommandResult(status, failure_class, recovery_next_action)`.

| failure_class | status | ffi_result_kind | recovery_next_action |
| --- | --- | --- | --- |
| locked_profile | blocked | blocked | enter passphrase |
| malformed_payload | blocked | rejected_input | show redacted parse failure |
| replay_rejected | blocked | rejected_state | show redacted replay rejection |
| policy_blocked | blocked | blocked | explicit user action required |
| transport_unavailable | blocked | unavailable | manual transport action required |
| unsupported_mobile_surface | blocked | unsupported | use desktop source boundary |
| lifecycle_confirmation_required | blocked | confirmation_required | confirm lifecycle intent before any shared Rust core binding for local_data_lifecycle |
| ffi_unavailable | blocked | unavailable | connect shared Rust core binding |

The table blocks raw exception bridges, platform-specific error taxonomies,
panic string exposure, private payloads in errors, and callable FFI
implementation in this phase.

This error mapping boundary does not create callable FFI.

## Canonical Serialization Test Vector Boundary

The mobile canonical serialization vectors are source-level only. They define
deterministic UTF-8 JSON object examples for future FFI/Kotlin/Swift parity, but
they do not create callable FFI, generated bindings, native runtime messaging,
native network delivery, or release packaging.

The vector file is `serialization_vectors.json`.

The canonical status DTO key order is sorted lexicographically:
`backup_exclusion_state`, `diagnostics_redaction_state`,
`install_update_integrity_state`, `local_data_lifecycle_state`,
`mobile_command_surface`, `platform`, `profile_lock_state`,
`public_non_claims`, `runtime_command_surface`, `schema_version`.

The canonical command result key order is sorted lexicographically:
`failure_class`, `recovery_next_action`, `status`.

The source vectors cover `shared_core_status_surface`,
`redacted_support_diagnostics`, `blocked_command_result`,
`lifecycle_confirmation_required_result`, and `reject_unknown_fields_vector`.

Unknown fields must be rejected by any future parser. String enums must remain
strings, status label arrays must stay bounded, and schema version must be
explicit.
The schema version must be explicit.

Serialization contract enum names:
`deterministic_utf8_json_object`, `explicit_schema_version`, `sorted_keys`,
`string_enums`, `bounded_status_label_arrays`, `reject_unknown_fields`.

## Memory Ownership Release Contract Boundary

The mobile memory ownership release contract is source-level only. It defines
the future FFI ownership vocabulary, but it does not create callable FFI,
generated bindings, native runtime messaging, native network delivery, or
release packaging.

The contract file is `memory_ownership_contract.json`.

Ownership model:

- caller-owned input buffers
- core-owned returned buffers
- explicit release required
- release function required before callable FFI
- double release must be rejected
- use after release must be rejected
- zero-length buffer is valid
- null pointer is invalid

Ownership contract enum names: caller_owned_input_buffers,
core_owned_returned_buffers, explicit_release_required,
release_function_required_before_callable_ffi, double_release_must_be_rejected,
use_after_release_must_be_rejected, zero_length_buffer_is_valid,
null_pointer_is_invalid.

Allowed returned payloads are `SharedCoreStatusDto`, `SharedCoreCommandResult`,
and `redacted_diagnostics_payload`.

Forbidden boundary exposure includes raw pointer exposed to Kotlin, raw pointer
exposed to Swift, passphrase buffer returned, private key buffer returned, key
material buffer returned, plaintext message buffer returned, local path buffer
returned, panic string returned, and raw log returned.

Android/Kotlin and iOS/Swift wrappers must receive structured results only and
must not hold raw native pointers.

## Redacted Diagnostics Payload Review Boundary

The mobile diagnostics payload review is source-level only. It defines the
allowed redacted diagnostics payload for future FFI/Kotlin/Swift parity, but it
does not create callable FFI, generated bindings, native runtime messaging,
native network delivery, crash upload, background diagnostics upload, telemetry
upload, share-sheet private data prefill, or release packaging.

The review file is `diagnostics_payload_review.json`.

Allowed diagnostics fields are `status`, `build`, `failure_class`,
`recovery_next_action`, `app_launch_network_boundary`,
`diagnostics_redaction_state`, `schema_version`, `platform`, and
`public_non_claims`.

Allowed diagnostics channels are `in_app_redacted_text_view`,
`explicit_user_initiated_copy`, and
`minimal_private_security_contact_request`.

Required boundaries are
`diagnostics_copy_boundary=user_initiated_local_clipboard_only`,
`diagnostics_payload=redacted_status_support_only`,
`private_payload_prefill=false`, `native_network_upload=false`,
`crash_upload=false`, and `background_diagnostics_upload=false`.

Forbidden diagnostics payload fields include bridge lines, onion endpoints,
invite codes, pairing payloads, envelope payloads, safety phrases, profile
names, message text, local paths, raw logs, crash dumps, screenshots with
private room data, passphrases, private keys, key material, support bundles,
Android logcat, iOS sysdiagnose, telemetry uploads, and share-sheet private
data prefill.

## Android/iOS Adapter Parity Gate

The Android/iOS adapter parity gate is source-level only. It verifies that
Kotlin and Swift wrapper sources keep the same shared status adapter methods,
blocked command methods, API groups, command result vocabulary, diagnostics
copy boundary, lifecycle confirmation boundary, and no-network launch boundary.
It does not create callable FFI, generated bindings, native runtime messaging,
native network delivery, or release packaging.

The parity contract file is `adapter_parity_contract.json`.

Shared status adapter methods: `sharedCoreStatusSurface`,
`redactedSupportDiagnostics`.

Shared blocked command methods: `profileUnlockLockStatus`,
`inviteCodeCreateJoin`, `pairingPayloadExportImport`,
`safetyTranscriptConfirm`, `manualEnvelopeExportImport`,
`messageTranscriptView`, `localDataLifecycle`.

Shared result vocabulary: `status`, `failure_class`,
`recovery_next_action`, `blocked`, `locked_profile`, `policy_blocked`,
`lifecycle_confirmation_required`, `ffi_unavailable`.

Shared shell boundaries:
`diagnostics_copy_boundary=user_initiated_local_clipboard_only`,
`diagnostics_payload=redacted_status_support_only`,
`lifecycle_confirmation_boundary=display_only_no_local_data_mutation`,
`launch_network_boundary=no_native_network_permission_no_bootstrap`,
`launch_runtime_boundary=no_runtime_messaging_loop_no_background_delivery`,
`implicit_delivery_start=false`, and `generated_callable_binding=false`.

Allowed platform differences are limited to platform label, app-private versus
app-container storage wording, and cloud backup versus iCloud backup wording.

## Binding Prerequisite Closure Handoff

The binding prerequisite closure handoff is source-level only. It verifies that
the readiness prerequisites are recorded before any callable FFI implementation
can be considered. It does not create callable FFI, generated bindings, native
runtime messaging, native network delivery, background delivery, push
notification delivery, release packaging, store distribution, mobile readiness
claims, or security-ready claims.

The closure file is `binding_prerequisite_closure.json`.

Verified prerequisites:

- FFI error mapping table finalized
- canonical serialization test vectors finalized
- memory ownership release contract finalized
- redacted diagnostics payload reviewed
- Android/iOS adapter parity verified
- source handoff verifier passing

Remaining blocker: explicit owner authorization for native binding.

Required before any next callable FFI phase: explicit owner authorization for
native binding and explicit callable FFI implementation request.

Without owner authorization, generated bindings, callable FFI, native runtime
messaging, native network delivery, background delivery, push notification
delivery, release packaging, store distribution, mobile readiness claim, and
security-ready claim remain blocked.

## Callable FFI Authorization Hold

The callable FFI authorization hold is active. It is source-boundary only and is
recorded in `callable_ffi_authorization_hold.json`.

Blocked while the hold is active:

- `.udl` file creation
- UniFFI scaffolding
- extern C symbols
- JNI bridge
- Swift FFI bridge
- Kotlin native binding
- callable shared-core status FFI
- callable profile unlock FFI
- callable invite FFI
- callable pairing FFI
- callable envelope FFI
- callable transcript FFI
- callable lifecycle FFI
- native runtime messaging
- native network delivery
- release packaging

Allowed while the hold is active: source boundary docs, static verifiers,
read-only status adapter source, blocked command adapter source, and operator
handoff docs.

The hold remains active until explicit owner authorization for native binding
and an explicit callable FFI implementation request are both present. Until
then, callable FFI may start false, generated binding may start false, native
runtime messaging may start false, network delivery may start false, release
packaging may start false, mobile readiness claimed false, and security-ready
claimed false.

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

## Redacted Diagnostics Payload Placeholder Boundary

The future mobile diagnostics payload is documentation-only and local-copy-only
until a separate implementation phase exists.

Allowed diagnostics payload fields are limited to status, build, failure class,
recovery next action, manual network permission, app launch network boundary,
redacted runtime flags, diagnostics redaction state, schema version, platform,
and public non-claims.

Allowed diagnostics channels are limited to in-app redacted text view.
Allowed diagnostics channels are limited to explicit user-initiated copy.
Allowed diagnostics channels are limited to minimal private security contact request.

The payload must not include bridge lines, onion endpoints, invite codes,
pairing payloads, envelope payloads, safety phrases, profile names, message
text, local paths, raw logs, crash dumps, screenshots with private room data,
passphrases, private keys, key material, support bundles, Android logcat, iOS
sysdiagnose, telemetry uploads, crash uploads, background diagnostics uploads,
or share-sheet private data prefill.

This inventory must not export raw storage open calls, local paths, passphrases,
private keys, key material, plaintext messages, automatic network bootstrap,
background delivery loops, push delivery, central contact discovery, central
message server behavior, wrapper-specific protocol/storage/transport semantics,
or security-ready claims.

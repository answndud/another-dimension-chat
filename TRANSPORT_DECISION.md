# Transport Decision

This document records the public-safe transport boundary before a real Tor/onion adapter exists.

## Current Decision

High-risk mode is onion-only by default.

The default production transport policy rejects direct peer routes. Direct P2P, WebRTC, libp2p direct dialing, STUN, TURN, and ICE-style NAT traversal are not valid high-risk defaults because they can expose IP addresses, timing, network topology, and correlation metadata.

## What Exists Today

- `TransportPolicy::high_risk_default()` allows only `TransportRoute::OnionService`.
- `TransportPolicy::local_only()` allows only local/manual routes.
- `TransportPolicy::low_risk_direct_allowed()` is the only policy that allows direct peer routes.
- `TransportRoute` separates onion, local, and direct-peer routes.
- `EnvelopeTransport` defines minimal send/receive methods over encrypted `Envelope` values.
- `OnionEnvelopeTransport::fail_closed_high_risk()` enforces high-risk onion-only routing and fails with `TransportError::Unavailable` until a real Tor/onion adapter exists.
- `TransportRuntimeError` separates future preflight, bootstrap, bridge/censorship, onion service, send, and receive failures before a network-capable adapter exists.
- `TransportRuntimePreflight` maps disabled runtime network, state/cache directory access, log redaction, and bridge/censorship readiness to explicit runtime errors.
- `TransportRuntimePermissionPreflight` maps app-private state/cache policy, backup exclusion, log/crash redaction, and censorship readiness into the runtime preflight gate.
- `probe_app_private_state_cache_dirs` creates and probes explicit state/cache directories without exposing path details in runtime errors.
- `verify_transport_backup_exclusion` verifies backup-exclusion metadata before a runtime preflight can use a backup verification token.
- `OnionServiceKeyLifecycleDecision` blocks onion key readiness unless generation is after explicit profile unlock, key material is SQLCipher-wrapped, backup exclusion is verified, and rotation/deletion/migration policies are present.
- `BridgeCensorshipConfiguration` blocks censorship readiness unless the build explicitly requires no bridge or supplies a redacted bridge-config identifier.
- `RedactedTransportRuntimeEvent` records transport event categories without storing raw paths, endpoints, contact ids, profile names, plaintext, or key material.
- `TransportRuntimeEventSink` accepts only redacted transport runtime events.
- `TransportBootstrapPolicy` bounds future bootstrap timeout, retry, cancellation, and censorship classification behavior without bootstrapping Tor.
- `TransportBootstrapExecutionSkeleton` requires runtime readiness, bounded bootstrap policy, and redacted event sink while still failing closed.
- `TransportPreNetworkCloseout` records the remaining hard blockers before any network execution skeleton is allowed.
- `TransportRuntimeState` separates disabled fail-closed state from a future runtime-ready state that can only be created from successful preflight.
- `OnionEnvelopeTransport` stores runtime state, but send/receive remains fail-closed even when that state is ready.
- `arti-adapter-spike` is an optional compile-only feature that depends on `arti-client 0.42.0` without opening network connections.
- `arti_lifecycle_decision()` requires app-private state/cache directories, backup exclusion, log redaction, and no onion service key generation until a storage decision exists.
- `ArtiAppPrivateDirs` and `ArtiAdapterSpike::fail_closed_app_private_config` compile-check app-private `TorClientConfigBuilder::from_directories` wiring without bootstrapping Tor.
- `bootstrap_preflight_boundary()` keeps Arti runtime network, onion service launch, bridge behavior, and onion key generation disabled in the current spike.
- Dev file transport remains behind the `dev-insecure` feature.

## What Does Not Exist Yet

- A real Tor/onion adapter behind the fail-closed skeleton.
- Bundled Tor or Arti lifecycle management.
- Onion service key generation, rotation, or persistence.
- Bridge/censorship-circumvention support.
- Transport retry, backoff, or queueing.
- Production receive loop integration.
- Metadata padding, dummy traffic, or traffic shaping.

## Invariants

- High-risk mode must not silently fall back to direct P2P.
- Direct peer routes require an explicit low-risk policy.
- Transport code handles already-encrypted protocol envelopes, not plaintext messages.
- Transport logs must not include plaintext, session secrets, private keys, or decrypted message bodies.
- Endpoint strings are routing hints, not global account identifiers.
- Onion endpoint rotation remains a protocol/session concern and must be handled inside an authenticated encrypted session when implemented.

## Next Implementation Step

Continue pre-network transport work by defining the post-auth stream readiness ordering boundary. Do not implement real onion hosting, descriptor publication, network stream I/O, or envelope send/receive until each boundary is tested separately.

## Remote Peer Authentication Over Stream Boundary

Decision as of 2026-05-19: a verified pairwise encrypted-session binding is not enough to bind a network stream to the expected remote peer. Bound stream/session state now also requires an authenticated pairwise peer proof.

Current code boundary:

- `RemotePeerAuthenticationReady` can be constructed only with `RemotePeerAuthenticationContext::AuthenticatedPairwisePeer`.
- Missing or unauthenticated peer proof is rejected with `RemotePeerAuthenticationRequired`.
- `BoundInboundStreamSession` requires an inbound stream boundary, verified session binding, and remote peer authentication readiness.
- `BoundOutboundStreamSession` requires an outbound stream boundary, verified session binding, and remote peer authentication readiness.
- Inbound stream/session binding rejects session/authentication contact mismatch with `ContactMismatch`.
- Outbound stream/session binding rejects endpoint/session/authentication contact mismatch with `ContactMismatch`.
- Debug and event output must not expose peer proof, session transcript, endpoint, stream id, contact id, profile name, plaintext, ciphertext, private key, or path material.

Still not implemented:

- Real peer proof exchange over streams.
- Real cryptographic transcript verification in transport.
- Real stream read/write behavior.
- Envelope send/receive over onion streams.
- Usable messaging.

## Envelope I/O Adapter Fail-Closed Boundary

Decision as of 2026-05-19: bound stream/session readiness is not envelope I/O readiness. A future adapter must pass an explicit envelope I/O readiness gate before envelope receive/send can be reached.

Current code boundary:

- `EnvelopeIoAdapterReady` is a separate readiness token after bound stream/session state.
- `InboundEnvelopeIoAdapterBoundary` requires a `BoundInboundStreamSession` plus `EnvelopeIoAdapterReady`.
- `OutboundEnvelopeIoAdapterBoundary` requires a `BoundOutboundStreamSession` plus `EnvelopeIoAdapterReady`.
- Missing I/O readiness is rejected with `EnvelopeIoReadinessRequired`.
- `receive_fail_closed(...)` records only a redacted runtime event and returns `InboundEnvelopeReceiveNotImplemented`.
- `send_fail_closed(...)` records only a redacted runtime event and returns `OutboundEnvelopeSendNotImplemented`.
- Debug and event output must not expose onion endpoint, remote endpoint, stream id, descriptor value, private key, contact id, profile name, envelope ciphertext, channel id, message number, session secret, or path material.

Still not implemented:

- Real envelope reads from onion streams.
- Real envelope writes to onion streams.
- Remote peer authentication over streams.
- Decrypt/receive pipeline integration.
- Usable messaging.

## Stream Peer/Session Binding Fail-Closed Boundary

Decision as of 2026-05-19: stream readiness is not envelope I/O readiness. Inbound and outbound streams require a verified pairwise encrypted-session binding before any future envelope receive/send path can be reached.

Current code boundary:

- `PairwiseStreamSessionBinding` can be constructed only with `StreamSessionVerificationContext::VerifiedPairwiseEncryptedSession`.
- Unverified sessions are rejected with `VerifiedPairwiseSessionRequired`.
- `BoundInboundStreamSession` requires an `OnionInboundStreamBoundary` plus verified pairwise session binding.
- `BoundOutboundStreamSession` requires an `OnionOutboundStreamBoundary` plus verified pairwise session binding.
- Outbound stream/session contact mismatch is rejected with `ContactMismatch`.
- `receive_fail_closed(...)` records only a redacted runtime event and returns `BoundInboundReceiveNotImplemented`.
- `send_fail_closed(...)` records only a redacted runtime event and returns `BoundOutboundSendNotImplemented`.
- Debug and event output must not expose onion endpoint, remote endpoint, stream id, descriptor value, private key, contact id, profile name, envelope ciphertext, session secret, or path material.

Still not implemented:

- Real remote peer authentication over streams.
- Real stream read/write behavior.
- Envelope send/receive over onion streams.
- Session secret handling inside transport.
- Usable messaging.

## Onion Outbound Stream/Send Fail-Closed Boundary

Decision as of 2026-05-19: outbound onion dial/send handling remains a separate boundary and cannot be reached through a global endpoint or direct-peer route.

Current code boundary:

- `OnionOutboundStreamBoundary` requires a `PairwiseRendezvousEndpoint`.
- Missing pairwise endpoint readiness is rejected with `PairwiseEndpointRequired`.
- Non-onion transport policy is rejected with `TransportPolicyViolation` before any dial attempt.
- `dial_fail_closed(...)` records only a redacted runtime event and returns `OutboundDialNotImplemented`.
- `send_fail_closed(...)` records only a redacted runtime event and returns `OutboundSendNotImplemented`.
- The feature-gated `OnionServiceLaunchAdapterSkeleton` can expose the outbound stream boundary only after launch-adapter readiness.
- Debug and event output must not expose onion endpoint, remote endpoint, stream id, descriptor value, private key, contact id, profile name, envelope ciphertext, or path material.

Still not implemented:

- Real outbound onion dialing.
- Stream write behavior.
- Remote peer/session binding.
- Envelope send over onion streams.
- Usable messaging.

## Onion Inbound Stream Fail-Closed Boundary

Decision as of 2026-05-19: inbound onion stream handling remains a separate boundary after descriptor-publication readiness.

Current code boundary:

- `OnionInboundStreamBoundary` requires `OnionServiceDescriptorPublicationReady`.
- Missing descriptor-publication readiness is rejected with `DescriptorPublicationRequired`.
- `accept_fail_closed(...)` records only a redacted runtime event and returns `InboundAcceptNotImplemented`.
- `read_write_fail_closed(...)` records only a redacted runtime event and returns `InboundReadWriteNotImplemented`.
- The feature-gated `OnionServiceLaunchAdapterSkeleton` can expose the inbound stream boundary only when given descriptor-publication readiness.
- Debug and event output must not expose onion endpoint, remote endpoint, stream id, descriptor value, private key, contact id, profile name, or path material.

Still not implemented:

- Real inbound onion listener creation.
- Stream accept/read/write.
- Remote peer/session binding.
- Envelope receive over onion streams.
- Usable messaging.

## Onion Service Descriptor Publication Boundary

Decision as of 2026-05-19: descriptor publication is a distinct boundary after launch preflight and before any onion hosting behavior.

Current code boundary:

- `OnionServiceDescriptorPublicationBoundary` can be constructed only from `OnionServiceLaunchReady`.
- The boundary accepts only `OnionEndpointPublicationPolicy::PairwiseRendezvousOnly`.
- Missing publication policy is rejected before any descriptor publication attempt.
- `publish_fail_closed(...)` records only a redacted runtime event and returns `DescriptorPublicationNotImplemented`.
- The feature-gated `OnionServiceLaunchAdapterSkeleton` can expose the descriptor publication boundary, but it still does not publish descriptors.
- Debug and event output must not expose onion endpoint, descriptor value, private key, contact id, profile name, or path material.

Still not implemented:

- Real descriptor creation.
- Descriptor publication through Arti.
- Onion service hosting.
- Inbound stream handling.
- Envelope send/receive over onion streams.

## Onion Service Key Material Adapter Boundary

Decision as of 2026-05-19: onion service launch preflight requires an explicit key-material readiness token, not only a key lifecycle policy decision.

Current code boundary:

- `OnionServiceKeyMaterialDecision` requires profile unlock, lifecycle readiness, and SQLCipher-wrapped key record readiness.
- `OnionServiceKeyRecordId` is validated as an opaque local record id and rejects empty or path-like ids.
- Plaintext key bytes are rejected with `PlaintextKeyMaterialForbidden`.
- Locked profile and missing wrapped-record states fail closed before launch preflight.
- `OnionServiceLaunchPreflight::from_ready_boundaries(...)` now takes `OnionServiceKeyMaterialReady`.
- The feature-gated `OnionServiceLaunchAdapterSkeleton::from_ready_owner(...)` also requires `OnionServiceKeyMaterialReady`.
- Debug output redacts the key record id and states that raw key material is not loaded.

Still not implemented:

- Real onion service private key generation.
- Loading key bytes from SQLCipher.
- Passing key material into Arti.
- Descriptor publication or onion hosting.
- Envelope send/receive over onion streams.

## Endpoint Rotation Apply/Reconnect Boundary

Decision as of 2026-05-19: endpoint rotation is a local verified-session state transition before any reconnect or network attempt.

Current code boundary:

- `EndpointRotationSequence` is nonzero and monotonic.
- `PairwiseEndpointRotationState` tracks current endpoint state, one pending update, and the last applied sequence.
- Staging requires `EndpointRotationApplyContext::ExistingEncryptedSessionVerified`.
- Unverified control payloads, contact mismatch, stale pending replacement, rollback after an applied sequence, and applying without a pending update are rejected.
- Applying a pending update swaps the current pairwise rendezvous endpoint only when the sequence matches the pending update.
- Reconnect remains `reconnect_fail_closed(...)`: it records a redacted runtime event and returns `EndpointReconnectNotImplemented`.

Still not implemented:

- Actual Tor reconnect, dial, send, or receive behavior.
- Endpoint update delivery over Tor.
- Conflict resolution beyond the monotonic local sequence boundary.
- Durable persistence of the whole rotation state. Only pairwise endpoint state persistence exists today.

## Tor Lifecycle Decision

Decision as of 2026-05-18: use Arti as the first v0.1 production adapter candidate, keep C Tor as the fallback candidate, and do not depend on a user-installed system Tor as the default path.

Rationale:

- Arti is Rust-native, embeddable, and fits the Tauri + Rust core architecture.
- Official Arti documentation says Arti is ready for proxy use and for developers embedding Tor support in Rust projects, with onion service support available, while still noting that not all C Tor functionality is available.
- System Tor would weaken UX and policy control because the app could not reliably enforce high-risk transport invariants, lifecycle state, logging behavior, or packaging assumptions.
- Bundled C Tor remains the compatibility fallback if Arti lacks a required feature for onion service hosting, censorship circumvention, or platform packaging.

Non-goals for the first adapter spike:

- No direct P2P fallback.
- No automatic system Tor discovery.
- No production claim that Tor transport works.
- No bridge/censorship-circumvention claim.
- No onion key persistence until storage and backup behavior are separately decided.

Required before replacing fail-closed behavior:

- Confirm Arti can connect to and host onion services for the target platforms.
- Define onion service key generation, storage class, rotation, and deletion.
- Define Tor state directory location and backup exclusion behavior.
- Define log redaction and crash dump behavior.
- Define bridge/censorship behavior, or explicitly mark it out of scope for the build.
- Verify macOS, Windows, Linux, and Android packaging implications.

## Arti Adapter Dependency Spike

Decision as of 2026-05-18: add `arti-client 0.42.0` only behind the optional `arti-adapter-spike` feature.

Compile surface:

- `arti-client` is optional and not part of the default build.
- Default Arti features are disabled.
- The spike enables `tokio`, `rustls`, `onion-service-client`, `onion-service-service`, and `keymgr`.
- The code only constructs `TorClientConfig::default()` and keeps `OnionEnvelopeTransport` fail-closed.
- No bootstrap, no socket connection, no onion service launch, and no system Tor discovery happens in this spike.

Constraints:

- `arti-client 0.42.0` declares Rust 1.89 or newer.
- Onion-service APIs still require explicit feature choices and may change.
- Bridge/pluggable transport support remains a separate decision.
- Android packaging and static-link behavior need their own verification before the feature can become default.

Verification command for this spike:

```text
cargo test -p another-dimension-transport --features arti-adapter-spike
```

Primary sources checked:

- Arti FAQ, status as of January 2026: <https://arti.torproject.org/FAQs/>
- Arti getting started, proxy/onion support note: <https://arti.torproject.org/>
- Tor support, censorship circumvention overview: <https://support.torproject.org/tor-browser/circumvention/>
- `arti-client 0.42.0` crate metadata and features: <https://docs.rs/crate/arti-client/latest/features>

## Arti State Directory And Key Lifecycle Decision

Decision as of 2026-05-18: do not use Arti's default shared cache/state directories for this app. A future adapter must pass app-private state and cache directories through `TorClientConfigBuilder::from_directories` or an equivalent builder path.

Rationale:

- `arti-client` documents that its default cache and local data directories may be shared by all programs using those defaults.
- A high-risk messenger should not share Tor state with unrelated Arti-using programs.
- The app needs explicit backup exclusion, deletion, and forensic cleanup behavior before writing transport state.

Directory policy:

- `state_dir`: app-private, profile-scoped or install-scoped according to the future profile lifecycle decision.
- `cache_dir`: app-private and deletable while Arti is not running.
- Shared `${ARTI_CACHE}` and `${ARTI_LOCAL_DATA}` defaults are not allowed for production adapter use.
- State/cache paths must not include contact ids, profile display names, onion addresses, or pairwise public keys.
- The app must document OS backup exclusion behavior before enabling real transport.

Onion service key policy:

- Do not generate or persist onion service keys in the current spike.
- Do not store onion service private keys in plaintext app files.
- Do not rely on Arti's on-disk native keystore as a product decision until profile unlock, backup exclusion, deletion, and migration behavior are decided.
- The next accepted design should choose between app-private Arti keystore, SQLCipher-wrapped key material, or another reviewed key wrapping approach.

Logging and crash policy:

- No transport logs may include plaintext, private keys, decrypted envelopes, onion service private keys, pairwise public keys, contact ids, profile display names, or full onion addresses.
- Crashes must not dump Arti state paths containing user-identifying names.
- Full Arti debug logs are not acceptable in high-risk mode by default.

The current code-level invariant is `arti_lifecycle_decision()`: app-private state/cache required, shared default Arti directories rejected, backup exclusion required, log redaction required, and onion service key generation disabled until a separate storage decision exists.

## App-Private Arti Config Builder Skeleton

Decision as of 2026-05-18: the optional Arti spike may build an unbootstrapped `TorClientConfig` only from explicit app-private state/cache directories. It must not fall back to shared Arti defaults.

Current code boundary:

- `ArtiAppPrivateDirs::new(state_dir, cache_dir)` rejects empty, relative, shared-default-looking, or identical state/cache directories.
- `ArtiAdapterSpike::fail_closed_app_private_config(dirs)` calls `TorClientConfigBuilder::from_directories(...).build()` and still returns a fail-closed `OnionEnvelopeTransport`.
- The spike does not bootstrap Tor, open sockets, launch an onion service, discover system Tor, or generate onion service keys.

This is intentionally a builder skeleton. Runtime bootstrap, bridge/censorship behavior, onion service hosting, and key persistence require separate decisions and tests before any network-capable adapter is allowed.

## Arti Bootstrap Preflight Boundary

Decision as of 2026-05-18: the Arti spike may describe bootstrap preconditions, but it must not enable runtime network behavior.

Current preflight boundary:

- Client bootstrap is disabled until a separate runtime preflight is implemented.
- Onion service launch remains disabled until onion service key lifecycle is decided.
- Bridge/censorship behavior is unsupported in the current spike and must be configured before any future bootstrap attempt.
- Log redaction remains required before runtime bootstrap can be enabled.
- Runtime network access and onion key generation are both false by default.

This keeps three operations separate:

- Config building: allowed in the optional compile-only spike.
- Client bootstrap: not implemented.
- Onion service launch/key generation: not implemented.

A future network-capable adapter must introduce explicit failure modes for bootstrap timeout, Tor censorship/bridge absence, state directory permission failure, log-redaction preflight failure, onion service key unavailable, and onion service launch failure before replacing fail-closed transport behavior.

## Transport Runtime Error Taxonomy

Decision as of 2026-05-18: keep the current fail-closed `TransportError::Unavailable` behavior, but define the finer-grained runtime taxonomy now so the future network-capable adapter does not collapse unrelated failures into one bucket.

Current runtime taxonomy:

- Preflight failures:
  - `StateDirectoryPermissionDenied`
  - `LogRedactionPreflightFailed`
- Bootstrap failures:
  - `RuntimeNetworkDisabled`
  - `BootstrapTimeout`
  - `CensorshipOrBridgeRequired`
- Onion service failures:
  - `OnionServiceKeyUnavailable`
  - `OnionServiceLaunchFailed`
- Envelope transfer failures:
  - `SendFailed`
  - `ReceiveFailed`

This taxonomy is not a production adapter yet. It is a boundary for later adapter work: policy violations, invalid endpoints, fail-closed unavailability, bootstrap failures, censorship/bridge requirements, onion service key failures, and envelope transfer failures must remain distinguishable in tests and logs. Logs still must not include plaintext, private keys, decrypted envelopes, full onion addresses, contact ids, or profile display names.

## Transport Runtime Preflight Result Skeleton

Decision as of 2026-05-18: runtime network remains disabled by default, and a future adapter must pass explicit preflight checks before any bootstrap attempt.

Current preflight checks:

- `runtime_network_enabled`
- `state_cache_dirs_accessible`
- `log_redaction_ready`
- `bridge_or_censorship_ready`

Failure mapping:

- Runtime network disabled maps to `RuntimeNetworkDisabled`.
- State/cache directory preflight failure maps to `StateDirectoryPermissionDenied`.
- Log redaction preflight failure maps to `LogRedactionPreflightFailed`.
- Bridge/censorship readiness failure maps to `CensorshipOrBridgeRequired`.

This skeleton does not inspect real filesystem permissions, configure bridges, bootstrap Tor, open sockets, or launch an onion service. It only fixes the shape of the gate that a later network-capable adapter must satisfy.

## Transport Runtime Adapter State Skeleton

Decision as of 2026-05-18: runtime adapter state is disabled by default. A runtime-ready state can only be constructed from a successful `TransportRuntimePreflight`.

Current state model:

- `TransportRuntimeState::Disabled` is the default fail-closed state.
- `TransportRuntimeState::from_preflight(...)` returns a runtime error unless every preflight guard succeeds.
- `TransportRuntimeState::Ready(TransportRuntimeReady)` represents only a satisfied gate, not a live Tor client.

This still does not bootstrap Tor, open sockets, launch onion services, or send/receive envelopes. It only prevents future code from constructing a runtime-ready adapter state without first passing the explicit preflight gate.

## Transport Adapter State Wiring To Onion Skeleton

Decision as of 2026-05-18: `OnionEnvelopeTransport` now stores `TransportRuntimeState`, but a ready runtime state does not make the adapter network-capable.

Current wiring:

- `OnionEnvelopeTransport::fail_closed_high_risk()` creates a high-risk onion-only adapter with `TransportRuntimeState::Disabled`.
- `OnionEnvelopeTransport::fail_closed_after_preflight(...)` creates a ready runtime state only after `TransportRuntimePreflight` succeeds.
- Send and receive still return `TransportError::Unavailable` for allowed onion routes.
- Direct routes still fail policy checks before any network attempt.

This keeps state wiring separate from runtime behavior. A later implementation must add a real adapter type or explicit runtime transition before any Tor bootstrap, socket activity, onion service launch, or envelope transfer can occur.

## Transport Runtime API Closeout

Decision as of 2026-05-18: the transport runtime skeleton is complete as a non-network boundary. It is not a Tor adapter and does not make the app usable for real communication.

Closed boundaries:

- High-risk policy rejects direct routes by default.
- Onion transport remains fail-closed for send and receive.
- Runtime failures are separated before network code exists.
- Runtime-ready state can only be constructed from successful preflight.
- Onion transport can hold runtime state without bootstrapping Tor, opening sockets, launching onion services, or transferring envelopes.

Required before any network-capable Arti adapter:

- Implement real app-private state/cache permission preflight.
- Enforce log and crash redaction preflight.
- Decide bridge and censorship behavior for blocked Tor environments.
- Decide onion service key storage, rotation, deletion, and backup exclusion.
- Define bootstrap timeout, retry, cancellation, and recovery behavior.
- Verify platform packaging and security behavior for macOS, Windows, Linux, and Android.

The next implementation phase should target runtime permission and log-redaction preflight decisions, not real Tor bootstrap.

## Runtime Permission And Redaction Preflight Decision

Decision as of 2026-05-18: before any network-capable Arti bootstrap, the adapter must pass a separate permission and redaction preflight that is stricter than the generic runtime preflight.

Current code boundary:

- `TransportRuntimePermissionPreflight::locked_down_by_default()` keeps runtime network disabled and all readiness checks false.
- `app_private_state_cache_dirs` and `backup_exclusion_verified` must both be true before state/cache readiness is accepted.
- `TransportLogRedactionPolicy::RedactedTransportEventsOnly` is required before log redaction readiness is accepted.
- `TransportCrashRedactionPolicy::SensitivePathsAndIdentifiersRedacted` is required before crash redaction readiness is accepted.
- `TransportCensorshipReadiness` must be either `ExplicitlyNotRequiredForThisBuild` or `ConfiguredBeforeBootstrap`; `Unsupported` is not bootstrap-ready.
- The permission preflight only converts into `TransportRuntimePreflight`. It still does not inspect real filesystem permissions, configure OS backup exclusion, bootstrap Tor, open sockets, launch onion services, or transfer envelopes.

Failure mapping:

- Runtime network disabled maps to `RuntimeNetworkDisabled`.
- Missing app-private dirs or backup exclusion maps to `StateDirectoryPermissionDenied`.
- Missing log or crash redaction maps to `LogRedactionPreflightFailed`.
- Unsupported censorship/bridge behavior maps to `CensorshipOrBridgeRequired`.

This keeps the next adapter honest: a future implementation must replace these booleans with real platform checks before enabling network behavior.

## Runtime Permission Preflight Platform Skeleton

Decision as of 2026-05-18: add a minimal filesystem probe skeleton for app-private transport state/cache directories, but keep backup exclusion, logging setup, Tor bootstrap, socket activity, and onion service launch disabled.

Current code boundary:

- `probe_app_private_state_cache_dirs(state_dir, cache_dir)` rejects empty, relative, shared-default-looking, or identical state/cache directories.
- The probe creates both directories and performs a write/delete probe file check in each directory.
- Successful probing returns `TransportStateCacheDirsReady`, which can be used to construct `TransportRuntimePermissionPreflight::from_platform_preflight(...)`.
- `TransportRuntimeProbeError` does not carry raw path strings and maps to `TransportRuntimeError::StateDirectoryPermissionDenied` for the generic runtime gate.
- Backup exclusion is still an explicit boolean input and is not claimed to be implemented.

Still not implemented:

- OS-specific backup exclusion verification.
- OS-specific permission hardening.
- Redacted transport logging implementation.
- Crash dump redaction implementation.
- Bridge/censorship configuration.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

The next step should either turn log/crash redaction into a concrete runtime logging boundary or define bootstrap timeout/retry behavior. It should not enable real network transport yet.

## Runtime Log And Crash Redaction Boundary

Decision as of 2026-05-19: transport runtime logging must go through a redacted event boundary before any network-capable adapter is allowed. This is a data-shape boundary, not a logging backend.

Current code boundary:

- `RedactedTransportRuntimeEvent` stores event kind, runtime error category, probe error category, route kind, and transfer direction only.
- Directory probe events accept a raw path but do not store or display it.
- Route rejection events accept a route but store only `TransportKind`, not the endpoint string.
- Sensitive-context events accept profile/contact/endpoint/plaintext/key inputs but do not store or display them.
- `Debug` and `Display` for redacted events are explicitly limited to category fields.

Still not implemented:

- A `tracing` subscriber or concrete logging backend.
- Crash dump handler integration.
- OS-specific path redaction policy.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

A future adapter must log redacted runtime events rather than raw Arti config paths, onion endpoints, contact ids, profile names, plaintext, private keys, or decrypted envelope data.

## Arti Bootstrap Timeout And Retry Decision

Decision as of 2026-05-19: before enabling any network-capable Arti adapter, bootstrap behavior must be bounded by explicit timeout, retry, cancellation, and failure-classification policy.

Current code boundary:

- `TransportBootstrapTimeoutPolicy` rejects zero timeout and timeouts above 120 seconds.
- `TransportBootstrapRetryPolicy` rejects zero attempts, more than three attempts, zero backoff, and initial backoff greater than maximum backoff.
- `TransportBootstrapPolicy` rejects silent retry.
- `TransportBootstrapPolicy::high_risk_default()` uses a 45 second timeout, two attempts, 500 ms initial backoff, 2 second max backoff, no silent retry, and separate censorship classification.
- `TransportBootstrapOutcome` maps cancellation, timeout, censorship/bridge requirement, and transient network failure into runtime error categories.

Still not implemented:

- Real Arti bootstrap.
- Async timers, sleeps, cancellation tokens, or retry loops.
- Bridge configuration.
- Socket opens, onion service launch, or envelope transfer.

A future adapter must surface bootstrap timeout, cancellation, and censorship/bridge-required outcomes instead of waiting forever or retrying silently.

## Runtime Logging Backend Skeleton

Decision as of 2026-05-19: add a minimal logging sink boundary that accepts only `RedactedTransportRuntimeEvent`. This is still not a global logger, `tracing` subscriber, crash handler, or production logging backend.

Current code boundary:

- `TransportRuntimeEventSink` exposes only `record(RedactedTransportRuntimeEvent)`.
- `NoopTransportRuntimeEventSink` consumes redacted events without persistence.
- `InMemoryTransportRuntimeEventSink` stores redacted events for tests and future adapter wiring checks.
- Tests verify sensitive profile/contact/endpoint/plaintext/key inputs do not appear in stored event debug/display output.

Still not implemented:

- Global logger or `tracing` subscriber.
- Crash dump handler integration.
- Persistent logs.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

A future adapter should receive a `TransportRuntimeEventSink` and emit redacted events through it instead of logging raw runtime context directly.

## Transport Runtime Pre-Network Closeout

Decision as of 2026-05-19: the pre-network transport phase is close enough to identify remaining hard blockers, but not close enough to start a network-capable adapter.

Current closeout blockers:

- OS backup exclusion verification for app-private transport state/cache.
- Onion service key generation, storage, rotation, deletion, migration, and backup behavior.
- Bridge/censorship configuration for environments where direct Tor bootstrap is blocked.

Current code boundary:

- `TransportPreNetworkCloseout::high_risk_default()` returns these blockers and keeps network execution disallowed.
- `TransportNextPhase` records the next implementation target instead of letting code silently jump to bootstrap.
- Network execution is allowed only when the blocker list is empty, at which point the next phase is only an Arti bootstrap execution skeleton, not a usable transport.

Next accepted phase: backup exclusion verification. The project should not start real Tor bootstrap, socket opens, onion service launch, or envelope transfer before the backup-exclusion and onion-key lifecycle decisions are implemented and tested.

## Transport Backup Exclusion Verification

Decision as of 2026-05-19: app-private transport state/cache directories must have a separate backup-exclusion verification token before a future runtime adapter can treat them as bootstrap-ready.

Current code boundary:

- `TransportBackupExclusionVerification` is the token future runtime preflight code should use instead of passing an arbitrary boolean.
- `verify_transport_backup_exclusion(...)` checks both state and cache directories.
- On macOS, verification probes `com.apple.metadata:com_apple_backup_excludeItem` with `xattr -p` and requires non-empty metadata on both directories.
- On non-macOS platforms, verification returns `UnsupportedPlatform` and therefore fails closed.
- `TransportRuntimePermissionPreflight::from_verified_platform_preflight(...)` accepts the backup-exclusion token and maps it into the existing runtime preflight gate.
- `TransportPreNetworkCloseout::after_backup_exclusion_verification(...)` removes only the backup blocker; onion service key lifecycle and bridge/censorship configuration remain blockers.

Still not implemented:

- Setting backup-exclusion metadata.
- Windows, Linux, Android, or iOS backup-exclusion verification.
- OS-specific permission hardening.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

Next accepted phase: onion service key lifecycle decision. Network execution remains blocked until onion key lifecycle and bridge/censorship decisions are also closed.

## Onion Service Key Lifecycle Decision

Decision as of 2026-05-19: onion service private key material must not be generated, stored, rotated, deleted, migrated, or backed up implicitly. A future adapter must first pass a lifecycle decision boundary.

Current code boundary:

- `OnionServiceKeyLifecycleDecision::locked_down_by_default()` is not ready.
- Generation is accepted only after explicit profile unlock.
- Plaintext app-file storage is rejected.
- The current accepted storage policy is SQLCipher-wrapped by the unlocked profile key.
- Backup exclusion must be verified before lifecycle readiness.
- Rotation must be explicit and accompanied by a contact endpoint update.
- Deletion is tied to profile destruction.
- Automatic migration is disabled by default.
- `TransportPreNetworkCloseout::after_onion_service_key_lifecycle(...)` removes only the onion-key blocker; bridge/censorship configuration remains a blocker.

Still not implemented:

- Actual onion service private key generation.
- Actual Arti keystore integration.
- Actual SQLCipher key record schema for onion service keys.
- Endpoint update message flow for rotation.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

Next accepted phase: bridge/censorship configuration. Network execution remains blocked until censorship/bridge behavior is also closed.

## Bridge And Censorship Configuration Decision

Decision as of 2026-05-19: bridge/censorship readiness must be explicit before any future bootstrap skeleton. This does not implement bridge transport or censorship circumvention.

Current code boundary:

- `BridgeCensorshipConfiguration::Unsupported` is not bootstrap-ready.
- `NoBridgeRequired` is accepted only when the build explicitly declares bridge support not required.
- If bridge support is required before bootstrap, `NoBridgeRequired` is rejected.
- Raw bridge lines are rejected at this boundary.
- A required bridge path may become ready only through a non-empty redacted bridge-config identifier.
- `TransportRuntimePermissionPreflight::from_fully_verified_preflight(...)` accepts a `BridgeCensorshipReady` token instead of an arbitrary censorship boolean.
- `TransportPreNetworkCloseout::after_bridge_censorship_configuration(...)` removes the final pre-network blocker and allows only the next Arti bootstrap execution skeleton phase.

Still not implemented:

- Actual bridge configuration storage.
- Actual bridge line parsing or validation.
- Pluggable transport packaging.
- Tor bootstrap, socket opens, onion service launch, or envelope transfer.

Next accepted phase: Arti bootstrap execution skeleton. It must still remain bounded, fail-closed, and must not claim usable real communication until send/receive/onion hosting are separately implemented and verified.

## Arti Bootstrap Execution Skeleton

Decision as of 2026-05-19: after the pre-network blockers are closed, the first bootstrap execution boundary is still fail-closed. It does not create a usable Tor client, open sockets, launch onion services, or transfer envelopes.

Current code boundary:

- `TransportBootstrapExecutionSkeleton::new(...)` requires a `TransportRuntimeReady` token and a bounded `TransportBootstrapPolicy`.
- `execute_fail_closed(...)` requires a `TransportRuntimeEventSink` so bootstrap outcomes are recorded only as redacted runtime events.
- Timeout, cancellation, censorship/bridge-required, and transient network outcomes map into existing `TransportRuntimeError` categories.
- The skeleton currently returns an error for every outcome.
- Tests verify bootstrap failures are redacted and do not include bridge lines, onion addresses, or local state paths.

Still not implemented:

- Actual Arti client bootstrap.
- Async timer, retry loop, or cancellation token integration.
- Tor socket activity.
- Onion service launch.
- Envelope send/receive.

Next accepted phase: a bounded Arti client bootstrap adapter spike may be considered, but it must keep send/receive and onion hosting fail-closed until those phases have their own tests and public-safe documentation.

## Bounded Arti Client Bootstrap Adapter Spike

Decision as of 2026-05-19: the optional `arti-adapter-spike` feature may now bind app-private Arti configuration, a runtime-ready token, bounded bootstrap policy, fail-closed onion transport, and redacted runtime event reporting into one adapter boundary.

The current spike guarantees:

- `BoundedArtiBootstrapAdapterSpike::fail_closed_app_private_config(...)` only accepts explicit app-private state/cache directories through the existing directory validator.
- The adapter requires `TransportBootstrapExecutionSkeleton`, which already carries `TransportRuntimeReady` and `TransportBootstrapPolicy`.
- Bootstrap failure outcomes must be recorded through `TransportRuntimeEventSink` as redacted events.
- Envelope send/receive remains `TransportError::Unavailable`.
- Onion service hosting remains unimplemented.
- The spike still does not construct or bootstrap a live Arti `TorClient`, open sockets, launch onion services, discover system Tor, or transfer envelopes.

This is the last compile-only adapter boundary before an explicit network-capable experiment. The next accepted phase must add a separate manual/feature-gated actual bootstrap attempt with timeout and cancellation behavior, and it must not claim usable messaging until send, receive, and onion hosting are separately implemented and verified.

## Manual Arti Bootstrap Attempt Gate

Decision as of 2026-05-19: a real Arti bootstrap attempt is allowed only behind the explicit `arti-manual-bootstrap` feature and `ManualArtiBootstrapAttemptGate::explicitly_enabled_for_manual_spike(...)`. The default gate is disabled and records `RuntimeNetworkDisabled` as a redacted bootstrap failure without touching the network.

The manual gate rules are:

- `arti-adapter-spike` remains compile-only unless `arti-manual-bootstrap` is also enabled.
- `ManualArtiBootstrapAttemptGate::disabled(...)` is the safe/default constructor.
- `ManualArtiBootstrapAttemptGate::explicitly_enabled_for_manual_spike(...)` is the only constructor that may call `arti_client::TorClient::create_bootstrapped(...)`.
- The Arti call is wrapped in `tokio::time::timeout(...)` using the existing bounded `TransportBootstrapPolicy`.
- Arti bootstrap errors are collapsed to a redacted bootstrap failure; raw Arti errors, local paths, bridge lines, onion endpoints, and contact identifiers must not be logged.
- A bootstrap success records only `BootstrapSucceeded`.
- The returned Arti client is deliberately dropped in this spike. Success does not mean usable messaging.

Still not implemented:

- Production runtime integration for persistent Arti client lifecycle.
- Onion service hosting.
- Envelope send/receive over Tor.
- Bridge configuration storage or pluggable transport packaging.
- User-facing CLI/Tauri command for the manual bootstrap attempt.

Next accepted phase: add a local-only manual CLI/dev command for the bootstrap gate or start the persistent Arti client lifecycle boundary. Either path must keep usable messaging claims out of README/SECURITY until send/receive and onion hosting exist.

## Local-Only Manual Bootstrap CLI Gate

Decision as of 2026-05-19: the CLI may expose a local-only manual Arti bootstrap command only when built with `arti-manual-bootstrap`.

Command shape:

```text
another-dimension transport bootstrap --state-dir <absolute-app-private-dir> --cache-dir <absolute-app-private-dir> [--execute-network]
another-dimension transport bootstrap --profile <name> --app-data-root <absolute-app-private-root> [--execute-network]
```

Rules:

- Default CLI builds still reject prototype commands and do not include this transport command.
- The command requires either explicit state/cache directories or a profile-scoped app data root.
- The profile-scoped form is preferred because it centralizes transport directory layout.
- Without `--execute-network`, the command uses `ManualArtiBootstrapAttemptGate::disabled(...)`, performs no network bootstrap, and prints only redacted event/summary output.
- With `--execute-network`, the command is allowed to call the manual bootstrap gate and may touch the network.
- Output must not include local state/cache paths, onion endpoints, bridge lines, contact identifiers, plaintext, or private key material.
- Success still means only that the one-shot Arti bootstrap attempt completed; the Arti client is dropped and there is no usable transport.

Still not implemented:

- User profile integration for transport state/cache directories.
- Onion service hosting.
- Envelope send/receive over Tor.
- Bridge configuration UX.

Next accepted phase: persistent Arti client lifecycle boundary or profile-scoped transport directory resolution. Do not implement send/receive or onion hosting until a persistent client ownership model exists.

## Profile-Scoped Transport Directory Resolution

Decision as of 2026-05-19: transport state/cache directory layout should be resolved from a profile name and an app-private data root before persistent Arti lifecycle work begins.

Current layout:

```text
<app-data-root>/profiles/<profile>/transport/arti-state
<app-data-root>/profiles/<profile>/transport/arti-cache
```

Current rules:

- The app data root must be absolute and must not look like a shared Arti default directory.
- Profile names use the existing `ProfileName` validator.
- `ProfileScopedTransportDirs` exposes concrete directories to internal code but redacts them in `Debug`.
- The manual CLI command accepts `--profile <name> --app-data-root <root>` and does not print the profile name or resolved local paths in normal output/errors.
- The direct `--state-dir/--cache-dir` form remains a manual escape hatch for this spike, but profile-scoped resolution is the preferred path.

Still not implemented:

- OS-specific app data root discovery.
- Profile unlock integration.
- Production runtime integration for persistent Arti client lifecycle.
- Onion service hosting.
- Envelope send/receive over Tor.

Next accepted phase: persistent Arti client lifecycle boundary. It should consume profile-scoped dirs instead of inventing another path layout.

## Persistent Arti Client Lifecycle Boundary

Decision as of 2026-05-19: the transport crate may now model persistent Arti client ownership separately from the earlier one-shot bootstrap-and-drop spike.

Current lifecycle states:

```text
Unbootstrapped
Bootstrapping
Bootstrapped
Dormant
Shutdown
```

Current rules:

- `PersistentArtiClientOwner::new_unbootstrapped(...)` is the only constructor for the owner boundary.
- The owner consumes the existing `BoundedArtiBootstrapAdapterSpike`, so app-private config, runtime readiness, bounded bootstrap policy, fail-closed onion transport, and redacted event reporting remain centralized.
- `bootstrap_and_keep_client(...)` exists only behind `arti-manual-bootstrap`.
- Disabled manual network permission fails closed with a redacted `RuntimeNetworkDisabled` event and leaves the owner `Unbootstrapped`.
- Successful manual bootstrap stores the Arti client inside the owner instead of immediately dropping it.
- The owner `Debug` output redacts local state/cache paths.
- `shutdown(...)` clears the stored client slot and records only a redacted lifecycle event.
- This boundary does not expose stream connection, send/receive, onion hosting, bridge configuration, or usable messaging.

Still not implemented:

- Tauri runtime wiring for the persistent owner.
- Onion service launch.
- Envelope send/receive over Tor.
- Bridge configuration UX.
- Production runtime shutdown semantics beyond the local owner state transition.

Next accepted phase: wire the manual CLI to the persistent lifecycle owner or start an onion service launch preflight boundary. Do not implement envelope send/receive until onion service hosting and endpoint lifecycle are separately specified.

## Local-Only Manual Lifecycle Bootstrap CLI Gate

Decision as of 2026-05-19: the CLI may expose a separate local-only manual lifecycle command when built with `arti-manual-bootstrap`.

Command shape:

```text
another-dimension transport lifecycle bootstrap --state-dir <absolute-app-private-dir> --cache-dir <absolute-app-private-dir> [--execute-network]
another-dimension transport lifecycle bootstrap --profile <name> --app-data-root <absolute-app-private-root> [--execute-network]
```

Rules:

- The existing `transport bootstrap` command remains the one-shot bootstrap-and-drop spike.
- `transport lifecycle bootstrap` is the manual smoke-test path for `PersistentArtiClientOwner`.
- Without `--execute-network`, the command performs no network bootstrap, records `RuntimeNetworkDisabled`, and prints only a redacted lifecycle summary.
- The disabled summary must show `state=Unbootstrapped`, `client_owned=false`, and `usable_transport=false`.
- With `--execute-network`, the command may attempt manual Arti bootstrap and keep the client in the owner, but it still must not claim usable messaging.
- Output must not include local state/cache paths, profile names, onion endpoints, bridge lines, contact identifiers, plaintext, private key material, or raw Arti errors.

Still not implemented:

- Tauri runtime wiring for the persistent owner.
- Onion service launch.
- Envelope send/receive over Tor.
- Bridge configuration UX.
- Production runtime shutdown semantics beyond the local owner state transition.

Next accepted phase: onion service launch preflight boundary or manual persistent lifecycle shutdown/status command. Do not implement envelope send/receive until onion service hosting and endpoint lifecycle are separately specified.

## Onion Service Launch Preflight Boundary

Decision as of 2026-05-19: onion service launch must remain blocked until a separate preflight proves the launch has the minimum local prerequisites. This phase does not launch an onion service.

Current preflight inputs:

```text
ProfileTransportUnlockReady
OnionServiceKeyLifecycleReady
persistent client ready flag
OnionEndpointPublicationPolicy
OnionEndpointUpdatePolicy
redacted events only flag
```

Current rules:

- `OnionServiceLaunchPreflight::locked_down_by_default()` fails closed.
- Profile unlock is required before launch can become ready.
- Onion service key lifecycle readiness is required before launch can become ready.
- A persistent client must already be ready before launch can become ready.
- Endpoint publication must be pairwise rendezvous only; public directory style publication remains outside scope.
- Endpoint update must happen through an existing encrypted session only.
- Launch preflight requires redacted event handling before any future launch code may run.
- The preflight returns only `OnionServiceLaunchReady`; it does not expose or store onion endpoints, onion private keys, contact identifiers, profile names, raw Arti errors, or launch descriptors.

Still not implemented:

- Actual onion service launch.
- Onion service private key generation or persistence.
- Onion endpoint publication/update messages.
- Envelope send/receive over Tor.
- Tauri runtime wiring.

Next accepted phase: endpoint lifecycle/update boundary or onion launch adapter skeleton. Do not implement envelope send/receive until onion service hosting and authenticated endpoint update are separately specified.

## Endpoint Lifecycle Update Boundary

Decision as of 2026-05-19: rendezvous endpoints are contact-scoped transport coordinates, not global account addresses. Endpoint updates must be delivered through an existing encrypted session.

Current rules:

- `PairwiseRendezvousEndpoint` accepts only `RendezvousEndpointScope::PairwiseContact`.
- Global-directory style endpoint scope is rejected.
- Endpoint identity binding must be `RendezvousEndpointIdentityBinding::TransportScoped`.
- Endpoints derived from identity keys are rejected.
- `PairwiseEndpointUpdate::for_existing_encrypted_session(...)` accepts only `EndpointUpdateChannel::ExistingEncryptedSession`.
- Plaintext control messages and out-of-band pairing payloads cannot rotate an established endpoint.
- Unchanged endpoint updates are rejected.
- `Debug` output for endpoint lifecycle/update types redacts contact ids and onion endpoint values.

Still not implemented:

- Endpoint persistence.
- Endpoint publication over Tor.
- Onion service launch.
- Envelope send/receive over Tor.

Next accepted phase: encrypted endpoint update message boundary or onion launch adapter skeleton. Do not implement envelope send/receive until onion service hosting and authenticated endpoint update are separately specified.

## Encrypted Endpoint Update Message Boundary

Decision as of 2026-05-19: endpoint update messages may be shaped only as production control envelopes after a validated pairwise endpoint update exists. This is still a message-boundary skeleton, not real endpoint update delivery.

Current rules:

- `EncryptedEndpointUpdateControlEnvelope::from_pairwise_update(...)` requires a `PairwiseEndpointUpdate`, so plaintext and out-of-band update channels remain outside the construction path.
- The output envelope uses protocol version `1` and `MessageType::Control`.
- `EndpointUpdateControlPlaintext` uses the minimal `ADENDPOINTUPDATE1` schema and is constructed only from a validated `PairwiseEndpointUpdate`.
- Endpoint update plaintext is bucket-padded before Noise encryption. Ciphertext is not padded after encryption because that would invalidate AEAD authentication.
- `ProductionEnvelopeSession::encrypt_endpoint_update_from_canonical_dialer(...)` is the current production encryption hookup for endpoint update control envelopes.
- Message number `0` is rejected.
- Empty channel ids are rejected.
- Empty encrypted payloads are rejected.
- Payloads too large for the existing padded envelope buckets are rejected.
- Control envelope validation treats encrypted payloads as opaque ciphertext.
- `Debug` output for plaintext and envelope types redacts contact ids and does not expose old or new onion endpoint values.

Still not implemented:

- Endpoint update persistence.
- Endpoint update delivery over Tor.
- Endpoint publication over Tor.
- Onion service launch.
- Envelope send/receive over Tor.

Next accepted phase: endpoint update persistence boundary or onion launch adapter skeleton. Do not implement envelope send/receive until onion service hosting and authenticated endpoint update are separately specified.

## Endpoint Update Persistence Boundary

Decision as of 2026-05-19: pairwise rendezvous endpoint state may be persisted only through the encrypted production storage boundary. Record ids must be session/contact scoped and opaque.

Current rules:

- `PairwiseRendezvousEndpoint::encode_state()` uses the minimal `ADENDPOINTSTATE1` state schema.
- `PairwiseRendezvousEndpoint::decode_state(...)` rejects malformed contact ids, non-onion endpoints, and unexpected schemas.
- `ProductionRecordKind::RendezvousEndpointState` requires encryption at rest.
- `ProductionEnvelopeSession::endpoint_state_record_id(...)` derives an opaque record id from the production channel id and contact id using a domain-separated hash.
- Endpoint state record ids do not contain profile names, contact ids, onion endpoints, or channel ids.
- `save_pairwise_endpoint_state(...)` requires the encrypted record scope contact to match the endpoint contact.
- Endpoint state is stored through `SqlCipherRecordStore`; the plaintext endpoint state schema and raw onion endpoint are not present in the database file in tests.

Still not implemented:

- Endpoint update delivery over Tor.
- Endpoint publication over Tor.
- Onion service launch.
- Envelope send/receive over Tor.
- Endpoint rotation conflict resolution after reconnect.

Next accepted phase: onion launch adapter skeleton or endpoint rotation apply/reconnect boundary. Do not implement envelope send/receive until onion service hosting and authenticated endpoint update are separately specified.

## Onion Service Launch Adapter Skeleton

Decision as of 2026-05-19: add only a fail-closed launch adapter boundary. This does not create an onion service, publish a descriptor, accept inbound streams, or send/receive envelopes.

Current rules:

- `OnionServiceLaunchAdapterSkeleton::from_ready_owner(...)` requires an `OnionServiceLaunchReady` token.
- The launch adapter also requires a `PersistentArtiClientOwner` whose state is `Bootstrapped` and whose client slot is owned.
- Unbootstrapped, dormant, shutdown, or clientless owners are rejected.
- `launch_fail_closed(...)` records only a redacted `OnionServiceLaunchFailed` runtime event and returns `OnionHostingNotImplemented`.
- Debug output for the adapter redacts state/cache dirs and does not expose endpoint, key, descriptor, profile, or contact material.

Still not implemented:

- Actual onion service creation.
- Onion service descriptor publication.
- Onion service private key generation or loading.
- Inbound stream handling.
- Envelope send/receive over Tor.
- Endpoint rotation apply/reconnect behavior.

Next accepted phase: endpoint rotation apply/reconnect boundary or onion service key material adapter boundary. Do not implement envelope send/receive until onion service hosting and authenticated endpoint update are separately specified.

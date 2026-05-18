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

Close out the runtime skeleton and implement the next pre-network gate: real runtime permission and log-redaction preflight decisions. Do not move directly to a network-capable Arti bootstrap until those checks are defined and tested.

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

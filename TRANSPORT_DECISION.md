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
- `arti-adapter-spike` is an optional compile-only feature that depends on `arti-client 0.42.0` without opening network connections.
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

Add an Arti-first adapter spike while keeping `OnionEnvelopeTransport` fail-closed by default. The spike must not make the app usable for real communication until onion service hosting, bridge behavior, logging, crash handling, and packaging are verified.

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

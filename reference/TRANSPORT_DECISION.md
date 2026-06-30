# Transport Decision

This document records the public-safe transport boundary before a real Tor/onion
messaging adapter exists.

## Current Decision

High-risk mode is onion-only by default.

The default production transport policy rejects direct peer routes. Direct P2P,
WebRTC, libp2p direct dialing, STUN, TURN, and ICE-style NAT traversal are not
valid high-risk defaults because they can expose IP addresses, timing, network
topology, and correlation metadata.

The first prototype path is Arti-first. Bundled C Tor daemon control remains a
deferred fallback decision, and system Tor is not the default because the app
must retain explicit control over app-private state/cache directories, redacted
event boundaries, bootstrap permission, censorship/bridge policy, and onion
lifecycle readiness.

## What Exists Today

- `TransportPolicy::high_risk_default()` allows only `TransportRoute::OnionService`.
- `TransportPolicy::local_only()` allows only local/manual routes.
- `TransportPolicy::low_risk_direct_allowed()` is the only policy that allows
  direct peer routes.
- `TransportRoute` separates onion, local, and direct-peer routes.
- Local and direct endpoint wrappers are public route contents, but their
  constructors are internal; callers must create them through explicit route
  constructors and policy checks.
- `EnvelopeTransport` defines minimal send/receive methods over encrypted
  `Envelope` values.
- `OnionEnvelopeTransport::fail_closed_high_risk()` enforces high-risk
  onion-only routing and fails with `TransportError::Unavailable` until a real
  Tor/onion adapter exists.
- `TransportRuntimeError` separates future preflight, bootstrap,
  bridge/censorship, onion service, send, and receive failures before a
  network-capable adapter exists.
- `TransportRuntimePreflight` maps disabled runtime network, state/cache
  directory access, log redaction, and bridge/censorship readiness to explicit
  runtime errors.
- `TransportRuntimePermissionPreflight` maps app-private state/cache policy,
  backup exclusion, log/crash redaction, and censorship readiness into the
  runtime preflight gate.
- `verify_transport_backup_exclusion` verifies backup-exclusion metadata before
  a runtime preflight can use a backup verification token.
- `OnionServiceKeyLifecycleDecision` blocks onion key readiness unless
  generation is after explicit profile unlock, key material is SQLCipher-wrapped,
  backup exclusion is verified, and rotation/deletion/migration policies are
  present.
- `BridgeCensorshipConfiguration` blocks censorship readiness unless the build
  explicitly requires no bridge or supplies a redacted bridge-config
  identifier.
- `RedactedTransportRuntimeEvent` records transport event categories without
  storing raw paths, endpoints, contact ids, profile names, plaintext, or key
  material.
- `TransportRuntimeEventSink` accepts only redacted transport runtime events.
- `TransportBootstrapPolicy` bounds future bootstrap timeout, retry,
  cancellation, and censorship classification behavior without bootstrapping
  Tor.
- `TransportBootstrapExecutionSkeleton` requires runtime readiness, bounded
  bootstrap policy, and redacted event sink while still failing closed.
- `TransportPreNetworkCloseout` records the remaining hard blockers before any
  network execution skeleton is allowed.
- `TransportRuntimeState` separates disabled fail-closed state from a future
  runtime-ready state that can only be created from successful preflight.
- `OnionEnvelopeTransport` stores runtime state, but send/receive remains
  fail-closed even when that state is ready.
- `OnionEnvelopeTransport::integration_boundary_summary()` exposes the
  high-risk policy mode, runtime state, first fail-closed blocker, and a false
  envelope-I/O availability flag without starting bootstrap, hosting, streams,
  or transfer.
- `OnionEnvelopeTransport::message_path_boundary_summary()` exposes the route
  kind, policy decision, runtime state, fail-closed blocker, and false
  envelope-I/O, send/receive, offline-mailbox, and usable-messaging flags for
  the future production message path.
- `arti-adapter-spike` is an optional compile-only feature that depends on
  `arti-client 0.42.0` without opening network connections.
- `bootstrap_preflight_boundary()` keeps Arti runtime network, onion service
  launch, bridge behavior, and onion key generation disabled in the current
  spike.
- Dev file transport remains behind the `dev-insecure` feature.

## What Does Not Exist Yet

- A real Tor/onion adapter behind the fail-closed skeleton.
- Production Arti lifecycle management.
- Bundled C Tor daemon control.
- System Tor discovery or default system Tor usage.
- Onion service key generation, rotation, or persistence.
- Bridge/censorship-circumvention support.
- Transport retry, backoff, or queueing.
- Production receive loop integration.
- Metadata padding, dummy traffic, or traffic shaping.

## Invariants

- High-risk mode must not silently fall back to direct P2P.
- Direct peer routes require an explicit low-risk policy.
- System Tor must not become the default transport implementation.
- Bundled C Tor must not replace the Arti-first prototype path without a
  separate decision.
- Transport code handles already-encrypted protocol envelopes, not plaintext
  messages.
- Transport logs must not include plaintext, session secrets, private keys, or
  decrypted message bodies.
- Endpoint strings are routing hints, not global account identifiers.
- Pairing rendezvous endpoints must validate into `PairwiseRendezvousEndpoint`
  values before a production session plan is accepted.
- A production session plan must reject shared rendezvous endpoints because the
  first v0.1 model assumes per-contact endpoint separation.
- Simultaneous connect / double dial handling must use the pairwise public-key
  rank already in `ProductionSessionPlan`; timing-based rules such as first
  connected or first handshake finished are forbidden.
- The canonical connection direction is outbound for the canonical dialer and
  inbound for the responder. Duplicate connections close only after the
  canonical connection is authenticated and healthy.
- Descriptor publication preparation must require descriptor gate readiness,
  fail-closed adapter readiness, and redacted descriptor context before any
  later implementation can approach publication.
- Inbound stream preparation must require inbound stream gate readiness and
  fail-closed adapter readiness before any later implementation can approach
  accept/read/write behavior.
- Outbound stream preparation must require outbound stream gate readiness and
  fail-closed adapter readiness before any later implementation can approach
  dial/send behavior.
- Production message path preparation must keep envelope I/O, send/receive,
  offline mailbox, and usable messaging false until a separate adapter phase
  explicitly changes them.
- Onion endpoint rotation remains a protocol/session concern and must be
  handled inside an authenticated encrypted session when implemented.

## Next Implementation Step

Arti lifecycle cleanup is closed out for the previous phase. Phase 4 starts
with an Arti bootstrap-to-hosting readiness audit using the existing
fail-closed boundaries. Do not add more stream readiness or intent tokens, and
do not implement real descriptor publication, network stream I/O, envelope
send/receive, or usable messaging without a separate boundary decision.

# Transport Decision

This document records the public-safe transport boundary before a real Tor/onion
messaging adapter exists.

## Current Decision

The high-risk route maps to the product's `high-risk-disabled` mode and is
permanently disabled in the v0.1 web product. This repository is prepared as a
`private-trusted` limited distribution; `public` release and any
`high-risk-disabled` transition require independent review and operational
evidence before they can be approved.

The web product does not implement Tor/onion routing, does not accept `.onion`
endpoints, and does not expose an anonymity toggle or fallback. Direct HTTPS,
VPN, and loopback/manual delivery remain low-risk routes only. A future onion
implementation would require a new product-boundary decision, a separately
verified adapter, and independent review; the legacy/native research crate is
not that implementation.

The default production transport policy rejects direct peer routes. Direct P2P,
WebRTC, libp2p direct dialing, STUN, TURN, and ICE-style NAT traversal are not
valid high-risk defaults because they can expose IP addresses, timing, network
topology, and correlation metadata.

The first prototype path is Arti-first. Bundled C Tor daemon control remains a
deferred fallback decision, and system Tor is not the default because the app
must retain explicit control over app-private state/cache directories, redacted
event boundaries, bootstrap permission, censorship/bridge policy, and onion
lifecycle readiness.

## Daemon candidate transport decision

The first daemon release candidate uses user-owned relay API endpoints as an
untrusted store-and-forward path. The daemon sends already encrypted protocol
envelopes; the relay exposes only bounded POST, owner-scoped read/ack, and the
short-lived invite-code rendezvous endpoints. The daemon validates the signed
invite's relay binding before using the endpoint. There is no central directory,
shared mailbox, automatic port forwarding, P2P/WebRTC path, push service, or
server-side decryption.

Direct HTTPS, a user-managed VPN, or a controlled LAN may make the relay
reachable, but each remains `low-risk` transport because IP, timing, endpoint,
frequency, and ciphertext-size metadata are visible. The daemon must refuse an
attempt to select these routes as high-risk or anonymous transport. Tor/onion
and censorship circumvention remain a separate future decision and cannot be
enabled by reusing the legacy research skeleton.

## What Exists Today

The browser web product currently uses user-owned direct inbox endpoints only.
Those endpoints are a low-risk transport path, even when HTTPS is enabled:
HTTPS protects the connection contents in transit but does not hide IP address,
timing, endpoint, frequency, or ciphertext size. The web UI exposes no
high-risk transport toggle, rejects remote HTTP inbox URLs, and rejects onion
endpoints. The policy below is retained only as legacy research context and is
not a supported web route.

## Observable metadata and enforced relay bounds

The current route is deliberately described as low-risk rather than anonymous.
Depending on the network position, a relay operator or network observer may
observe the client IP, relay destination, request timing, request frequency,
and ciphertext/blob sizes. The protocol does not currently add traffic
padding, dummy traffic, timing obfuscation, or an anonymity set. HTTPS and a
certificate pin protect transport contents and endpoint authenticity; they do
not remove those metadata observations.

The relay implementation enforces these availability and exposure bounds. They
are limits, not privacy guarantees:

| Boundary | Current bound | Meaning |
| --- | ---: | --- |
| Encrypted inbox envelope | 96 KiB | A larger envelope is rejected. |
| Items retained per inbox | 256 | Queue overflow is explicit; it is not durable archival. |
| Inbox posts | 30 per minute per rate-limit key | Abuse control, not anonymity or delivery fairness. |
| Encrypted blob | 32 MiB | The server never receives a plaintext file through this path. |
| Blob retention | At most 7 days | Expiry is a cleanup bound, not a secure-deletion claim. |

These values are declared in `reference/product_boundary.json` and checked
against the Rust relay contract. A change
to a bound is a product-boundary change and must update the threat model and
release evidence; it must not silently broaden the high-risk claim.

## Legacy research context (not the web product)

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

## Future boundary condition

Do not add more onion stream readiness, intent tokens, descriptor publication,
network stream I/O, envelope send/receive, or usable messaging to the v0.1 web
product. Any future transport work must begin with a new boundary decision and
must not reuse this legacy skeleton as evidence of anonymity or censorship
resistance.

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
- Dev file transport remains behind the `dev-insecure` feature.

## What Does Not Exist Yet

- A real Tor/onion adapter.
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

Add a production onion transport adapter boundary without adding real network behavior first. The adapter should enforce `TransportPolicy::high_risk_default()` and fail closed until Tor/onion lifecycle decisions are implemented.

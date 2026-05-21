# Security-Ready Component Boundaries

Another Dimension Chat is not a secure messenger release today.

This document is a public-safe inventory of the main `dev-insecure` prototype components that must be replaced, tightened, or reviewed before any security-ready claim. It is a boundary map, not an approval to ship production communication.

## Current Position

The project currently has a working local prototype loop:

- CLI and Tauri can run Alice/Bob local profile, pairing, safety material, message send/receive, replay check, expiry, and development-store plaintext guard flows.
- The loop is `dev-insecure` and local only.
- Default builds do not expose usable profile, pairing, messaging, storage unlock, Tor bootstrap, onion hosting, stream I/O, or production message commands.
- Default CLI hardening rejects production skeleton commands for profile, pairing, messaging, storage unlock, transport bootstrap, and transport send/receive until a later explicit runtime-command phase.
- Existing production-facing code is a set of guardrails and spikes, not a complete secure runtime.

## Boundary Inventory

| Area | Current boundary | Before security-ready claim |
| --- | --- | --- |
| Identity signatures | Production Ed25519 wrappers and signed pairing draft tests exist; `dev-insecure` remains available for local flow tests. | Keep pairwise identity per contact, store identity private keys only through the encrypted storage/key-management boundary, and preserve signed payload verification tests. |
| Pairing and safety | Production pairing payload and safety material boundaries exist; local demo uses development flow for ergonomics. | Keep in-person QR pairing as the first setup path, bind identity/prekey/endpoint/capability material into safety display, and reject mixed dev/production schemes. |
| Message crypto | Noise XX smoke, envelope-session guardrails, and `ProductionSessionEvaluationSummary` exist; no reviewed production messaging protocol or ratchet is integrated. | Select and review the production session model, define persistence expectations, add vectors/tests, and keep placeholder crypto behind `dev-insecure`. |
| Transport | High-risk policy, fail-closed onion transport, Arti bootstrap/lifecycle spikes, descriptor/stream/envelope-I/O gates, and `TransportMessagePathBoundarySummary` exist. | Implement bounded Tor/onion lifecycle only behind explicit phase gates, keep direct P2P out of high-risk mode, and prove no silent fallback to direct routes. |
| Local storage | SQLCipher-backed `ADREC1` spike, record classification, passphrase unlock, replay-state persistence, deletion helpers, and `ProductionMessageStorageBoundarySummary` exist. | Define production key management, key wrapping, backup exclusion, rollback handling, migration, and durable session/message persistence before claiming storage readiness. |
| Replay and message state | Replay window and first durable replay-state guardrails exist; local loop checks non-repeat behavior. | Persist replay/session state through the encrypted storage boundary and address rollback from restored encrypted database snapshots. |
| Tauri UI | Prototype shell can run dev-only local demos and display structured local state. | Replace CLI-wrapper demo commands with narrow Rust-owned runtime commands only after crypto, transport, and storage boundaries are security-ready. |
| Release and updates | Public copy and static verifiers enforce non-claims; no release signing or reproducible build story exists. | Add signing, reproducible build or equivalent verification, dependency review, and release safety copy before public high-risk use. |

## Integration Order

The next security-ready work should stay in this order unless a separate ADR changes it:

1. **Crypto/session decision**: finish the protocol/library shortlist and decide how pairwise identity, setup material, safety display, message encryption, replay, and persistence connect.
2. **Storage/key management boundary**: decide production key storage, unlock, wrapping, backup exclusion, rollback handling, and migration constraints.
3. **Transport adapter boundary**: connect Tor/onion lifecycle to the transport policy without adding direct P2P fallback or mailbox behavior.
4. **Runtime command boundary**: replace Tauri CLI-wrapper demo commands with Rust-owned runtime commands only after the above boundaries have guardrails.
5. **Release boundary**: add signing, reproducibility, dependency review, and user-facing safety copy before any high-risk claim.

## Explicit Non-Goals For This Boundary

This document does not add or approve:

- Real network execution.
- Production E2EE readiness.
- Real Tor/onion messaging.
- Production encrypted storage readiness.
- Storage key management, rollback protection, secure deletion, backup, or recovery.
- Offline mailbox, async delivery, group chat, file transfer, multi-device, push notification, or cloud backup.
- Any claim that this project is generally safer than Signal.

## Required Public Follow-Ups

- [CRYPTO_DECISION.md](CRYPTO_DECISION.md): keep the first evaluation path narrowed to the existing `snow` Noise XX synchronous boundary, while deferring Signal-style or ratchet adoption until deeper review.
- [TRANSPORT_DECISION.md](TRANSPORT_DECISION.md): keep onion-first transport integration gated and fail-closed.
- [STORAGE_DECISION.md](STORAGE_DECISION.md): move from SQLCipher spike to production key-management and rollback decisions.
- [SECURITY.md](SECURITY.md): keep user-facing non-claims aligned with implementation.
- `scripts/verify_release_hygiene.sh`: keep static checks for the boundary inventory and non-claims.

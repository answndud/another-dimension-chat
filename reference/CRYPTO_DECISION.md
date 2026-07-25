# Crypto Decision Notes

Another Dimension Chat has a browser message-encryption implementation, but
does not have production security assurance today.

This document records the actual cryptographic boundary and its remaining
gates. A reviewed primitive or library does not by itself review this app's
identity, transcript binding, browser code delivery, local storage, relay,
metadata, or user workflow.

## Current State

The repository currently has:

- A `CryptoSession` trait in `crates/crypto`.
- Development-only fake encryption behind `dev-insecure`.
- Pairwise identity types in `crates/identity`.
- Production-facing key and signature byte wrappers backed by `ed25519-dalek`
  for signing and verification tests.
- Production Ed25519 pairwise private key generation with a narrow
  OS-randomness boundary.
- Scheme-tagged production pairing public key and signature strings that are
  distinct from development values.
- Pairing payload decode that rejects mixed dev/production schemes.
- Pairing payload construction that can sign caller-supplied pairing
  parameters with an Ed25519 production private key.
- Production pairing nonce construction that uses a narrow OS-randomness
  wrapper backed by `getrandom`.
- Production pairing default construction that centralizes nonce, local
  timestamp, TTL, endpoint rotation policy, and capability defaults while
  keeping endpoint and prekey material caller-supplied.
- Production safety transcript tests that cover signed production payload
  ordering and identity, endpoint, prekey, and capability sensitivity.
- Production safety material derivation with a SHA-256 based, domain-separated
  display boundary independent from `dev-insecure` fake crypto.
- A native prototype with a narrow Noise XX boundary using `snow`. This is not
  the current browser message path.
- Browser protocol v3 using `vodozemac` Olm v2 through a narrow WASM adapter.
  The browser creates an Olm account, performs a two-control-message setup,
  encrypts/decrypts messages with the Double Ratchet, and persists the session
  pickle after successful operations.
- P-256 Web Crypto signatures for invites and envelopes, with a canonical
  transcript used for the displayed safety material and Olm setup plaintext.
- Passphrase-wrapped browser IndexedDB records for the current profile,
  account/session pickle, and local transcript.

The repository does not currently have:

- An independent audit of the application's browser protocol composition.
- A trusted, signed, independently verifiable JavaScript/WASM distribution
  boundary.
- A complete identity continuity, prekey replenishment, rotation, revocation,
  and device lifecycle design.
- High-risk metadata protection, anonymity, censorship resistance, or secure
  relay availability.
- A reviewed high-risk local storage, backup, recovery, panic-wipe, or secure
  deletion policy.
- A production release process with reproducible artifacts, SBOM, dependency
  audit, signed updates, and rollback protection.

## Non-Negotiable Rules

- Do not invent a cryptographic algorithm.
- Do not implement custom random generation, custom KDF logic, custom AEAD
  construction, or custom signature math.
- Do not remove `dev-insecure` until production behavior exists and tests
  cover the replacement boundary.
- Do not mix development test keys with production key types.
- Do not claim Signal-level or Signal-superior security.
- Do not treat pairing signatures, safety material, message encryption,
  storage encryption, and transport anonymity as one interchangeable security
  layer.

## Current Direction

The browser product uses the reviewed-library Olm Double Ratchet boundary:

1. Pairwise identity per contact.
2. Invite-code pairing as the first supported setup path.
3. The invite contains identity and setup material plus an explicitly exchanged
   relay endpoint/capability. The relay is transport, not an identity authority.
4. Safety material derives from a canonical transcript that includes both
   identities and setup material.
5. Browser message encryption is handled by the high-level `vodozemac` Olm API,
   not by custom UI cryptography.
6. `dev-insecure` remains available only for development tests.
7. This boundary is not a high-risk release until app-code distribution,
   prekey lifecycle, local storage, metadata, UX, and independent review gates
   are complete.

## Implementation Gate

Before this browser implementation can be considered for a security-reviewed
release, add tests and evidence that prove:

- Signed production pairing payloads are required on both sides.
- Olm setup material is bound to the canonical safety transcript.
- A wrong identity key, changed endpoint, changed capability set, or
  mismatched prekey bundle prevents setup.
- The canonical connection direction is stable across both peers.
- Ciphertexts do not contain plaintext and tampering fails.
- Replay rejection happens before decrypt and tampered ciphertext does not
  advance replay state.
- Session state is persisted only where the encrypted storage and session
  lifecycle boundary explicitly permits it.
- A modified JavaScript/WASM bundle cannot be presented as a verified release.
- Identity, prekey, endpoint, and capability rotation/revocation are explicit.
- No high-risk mode is exposed while the app-code, metadata, and storage
  boundaries remain incomplete.
- The browser protocol state contract is recorded in
  `reference/PROTOCOL_STATE_MACHINE.md`; persistence failure must roll back the
  in-memory ratchet and ambiguous state must require a fresh pairing.

## Open Questions

- What trusted bootstrap lets a browser user independently verify the signed
  app bundle when the user's own server also serves a convenience UI?
- Which prekey pool, replenishment, rotation, and revocation model fits the
  user-owned relay without creating central contact discovery?
- Which anonymity/metadata route can be supported without making an unverified
  Tor or censorship-resistance claim?
- Which local backup, recovery, and panic-wipe behavior is safe to promise on
  browser storage that cannot guarantee secure deletion?

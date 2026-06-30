# Crypto Decision Notes

Another Dimension Chat does not have production cryptography today.

This document records the current public-safe crypto boundary before any
placeholder crypto is replaced. It is intentionally conservative: no
production security claim should be made until the selected design has
implementation, tests, review, and release discipline behind it.

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
- A narrow Noise XX smoke boundary using `snow` with constrained features for
  `25519 + ChaChaPoly + BLAKE2s`.
- Noise static public keys with a public prekey bundle string format.
- `ProductionSessionPlan` rejection of invalid Noise prekey bundles.
- `ProductionSetupDraft` generation of an Ed25519 production pairing draft and
  a Noise static keypair together.
- Core-level setup handshake smoke using the deterministic canonical dialer as
  the Noise initiator.
- `NoiseTransportPair` exposure of a narrow one-message encrypt/decrypt
  boundary after Noise XX transport mode.
- `ProductionEnvelopeSession` wiring of in-memory Noise transport to
  `protocol::Envelope` for a caller-supplied message number.
- Replay acceptance only after successful decrypt, so tampered ciphertext does
  not advance replay state.

The repository does not currently have:

- Real E2EE.
- A reviewed ratchet implementation.
- Stored production signature keys.
- Integrated production key agreement for app messages.
- Production key storage.
- Broader production randomness policy for session establishment.
- Production encrypted local storage.
- Persistent production session state.

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

The first production message/session work stays on the existing Noise-based
sync boundary:

1. Pairwise identity per contact.
2. Invite-code pairing as the first supported setup path.
3. Pairing payload includes identity material, signed session setup material,
   rendezvous endpoint, and capability commitments.
4. Safety number derives from a canonical transcript that includes the identity
   and setup material.
5. Safety material display is derived from the canonical transcript with a
   reviewed hash crate, while message encryption is handled by a reviewed
   session construction, not by the CLI or UI.
6. `dev-insecure` remains available only for development tests.

## Implementation Gate

Before a production message/session implementation expands beyond the current
smoke boundary, add tests that prove:

- Signed production pairing payloads are required on both sides.
- Noise setup material is bound to the canonical safety transcript.
- A wrong identity key, changed endpoint, changed capability set, or
  mismatched prekey bundle prevents setup.
- The canonical connection direction is stable across both peers.
- Ciphertexts do not contain plaintext and tampering fails.
- Replay rejection happens before decrypt and tampered ciphertext does not
  advance replay state.
- Session state is persisted only where the encrypted storage and session
  lifecycle boundary explicitly permits it.
- No production messaging command is exposed while the crypto/session boundary
  is incomplete.

## Open Questions

- Which maintained Rust-compatible signature library should back pairwise
  identity?
- Is the current `snow` Noise XX direction acceptable after documenting how
  static private keys are stored, rotated, and bound to endpoint rotation?
- Should the first production replacement prioritize identity signatures or
  full message session encryption?
- How should production key material be stored before encrypted storage is
  complete?

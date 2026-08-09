# Crypto Decision Notes

> **상태: 폐기된 설계 스냅샷.** 이 문서의 browser Olm, WASM, legacy crate
> 설명은 현재 제품에 적용되지 않습니다. 현재 경계는 `PRODUCT_BOUNDARY.md`와
> `apps/daemon` 소스이며, 이 파일을 구현·릴리스·감사 증거로 사용하면 안 됩니다.

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

## Prototype direction (not the daemon release decision)

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

## Daemon candidate decision

The future production candidate uses a daemon-owned Account Root Key and
independent Device Keys. The root signs device certificates and revocations but
does not participate in routine message encryption. The daemon protocol
candidate is OpenMLS in Rust, with a two-device 1:1 group as the first profile.
This is the selected daemon implementation boundary; it is not evidence that
the application composition has passed an independent audit.

The daemon may proceed only after the selected OpenMLS version, cipher suite,
license, persistence API, KeyPackage/prekey lifecycle, device removal semantics,
and application composition have a written review packet and fixed vectors. The
current browser Olm v2 implementation remains isolated as prototype/legacy
evidence and must not be silently migrated into the daemon.

The daemon has an admission gate for this decision: it recognizes only the named
`openmls-1` protocol identifier, validates daemon-owned account/device identity,
version, and clock contracts, and routes admitted operations into the
OpenMLS-backed session catalog. Browser `Olm.v2` and `ADENVWEB3` are rejected at
the daemon boundary. Admission and local acceptance prove a code path, not that
the application composition has passed an independent cryptographic review.

The daemon's stable `account_id` is derived from the Account Root public key
(`ad1pk...`). It is not derived from display name, username, relay origin,
invite code, or device id. The public key is an identifier, not a private key;
its exposure still does not provide message authorization or profile unlock.

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

## Rejected or deferred alternatives

- Browser-local keys: rejected for the daemon candidate because the renderer is
  not a suitable long-term private-key owner.
- Olm/vodozemac in the daemon: deferred to compatibility research; current
  browser code does not define a multi-device daemon protocol.
- Signal/libsignal: not selected until license, API stability, Rust integration,
  and maintenance ownership are independently resolved.
- Custom ratchet, KDF, AEAD, MLS, or PQ protocol: rejected.

Anonymity transport, trusted app bootstrap, recovery UX, and secure deletion are
separate release gates, not cryptographic implementation details.

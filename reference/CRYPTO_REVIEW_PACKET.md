# Cryptographic composition review packet

> **상태: 현재 daemon/OpenMLS 후보 입력물.** 이 문서는 독립 검토를 위한
> 요구사항과 질문을 정의하며, audit 결과나 보안 인증서가 아니다. 삭제된
> browser Olm/WASM 구현은 현재 제품 경로가 아니므로 이 packet의 evidence로
> 사용할 수 없다.

The current product boundary is an Account Root Key and independent Device Keys
owned by the Rust daemon, a pinned `openmls-1` protocol admission boundary, an
encrypted local store, and an untrusted user-owned relay. The browser receives
presentation-safe results only.

## Review scope

1. Account root generation, device certificate issuance, device proof,
   revocation, expiry, duplicate handling, and recovery key separation.
2. Invite canonicalization, account/device binding, relay-origin and capability
   binding, expiry, single-use consumption, receipt verification, and safety
   number transcript construction.
3. OpenMLS/provider selection, cipher suite and version pinning, KeyPackage or
   prekey lifecycle, 1:1 group membership, commit ordering, epoch transitions,
   member removal, persistence, replay, duplicate delivery, and device changes.
4. Application composition around the protocol: daemon session catalog,
   message/attachment encryption boundary, delivery ledger, failure/rollback,
   crash recovery, and lock/restart behavior.
5. Encrypted storage and recovery: Argon2id parameters, AES-GCM nonce/key
   handling, record classification, atomic writes, corrupt/old snapshot
   rejection, key-store failure, backup import conflict, and wipe limitations.
6. Bridge and release composition: no private key/ratchet state in browser API,
   exact Origin/Host/version/CSRF checks, stale session invalidation, signed
   artifact verification, and high-risk disabled state.

## Required invariants

| ID | Invariant | Required failure behavior |
| --- | --- | --- |
| `INV-01` | Account Root Key and Device Keys never leave daemon-owned encrypted state. | Refuse the operation; never return raw seed or key material. |
| `INV-02` | A device certificate is valid only when signed by the matching Account Root Key and within its validity window. | Reject foreign, unsigned, duplicate, expired, or revoked devices. |
| `INV-03` | Invite code possession is rendezvous, not authentication or authorization. | Do not unlock, add a device, export a key, or send a message. |
| `INV-04` | Safety verification and contact approval are separate gates. | Keep session/message send blocked until both required states hold. |
| `INV-05` | Protocol state is persisted atomically before an operation is acknowledged. | Roll back or enter a fail-closed recovery state. |
| `INV-06` | Duplicate/replayed envelopes do not advance protocol or delivery state. | Reject or idempotently acknowledge without state mutation. |
| `INV-07` | Changed identity, endpoint, capability, protocol version, or trust key fails closed. | Require explicit reconfiguration or fresh pairing; never silently continue. |
| `INV-08` | Browser bridge never exposes private keys, raw store records, ratchet state, or live capabilities. | Return only a bounded public/status/result object. |
| `INV-09` | Altered, unsigned, revoked, too-old, or rollback release archives are rejected. | Stop installation/update; preserve the known-good install. |
| `INV-10` | Unsupported anonymity/high-risk transport is unavailable. | Keep `highRiskAllowed=false` and show the non-claim. |

## Focused review questions

- Which security properties are inherited from the selected OpenMLS/provider
  implementation, and which are application composition assumptions?
- Can a malformed or partially persisted record cause a second device, epoch,
  message, or attachment to be accepted?
- Can the relay operator correlate account IDs, capabilities, timing, sizes, or
  delivery state beyond the documented metadata boundary?
- Can a hostile origin, stale UI, DNS rebinding attempt, or reused bootstrap
  token reach any state-changing daemon route?
- Can update, rollback, recovery, revocation, or incident stop leave two active
  trust roots or silently downgrade a release?

## Evidence and decision

Use the exact source revision and the focused commands recorded in the release
verification record. Automated checks are composition evidence only; they are
not an independent cryptographic audit.
Until the signed independent result, operating trust receipt, and matching
release evidence exist, the decision must remain `experimental-only` and
`highRiskAllowed=false`.

# Pairing and daemon protocol state machine

> **상태: daemon-first 상태 계약과 legacy prototype 부록.** 현재 동작 계약은
> `apps/daemon` 소스와 focused evidence를 기준으로 한다. 문서 하단의 browser
> Olm/WASM 절은 삭제된 prototype의 역사적 참고이며 현재 release evidence가 아니다.

The invite-code rendezvous is a transport helper for the daemon-owned product.
It does not replace the signed invite, safety comparison, or account/device
identity. A code bearer can retrieve one short-lived signed invite payload, but
cannot create an identity, obtain a private key, or decrypt a session from the
code alone.

## Daemon identity ownership state

The future daemon protocol has a separate identity layer above the message
protocol:

| State | Entered by | Allowed next transition | Invariant |
| --- | --- | --- | --- |
| `account-root-created` | local CSPRNG root generation | create device, export recovery | root private key is daemon-owned and is not sent to the relay or browser API |
| `device-certified` | root-signed device certificate | publish KeyPackage, pair, revoke | device key is independent; certificate binds device id, protocol package, expiry, and root signature |
| `device-revoked` | root-signed revoke record | create a fresh device | revoked device cannot publish, pair, or continue a session |
| `recovery-exported` | explicit user export | import after conflict checks | artifact is profile/root recovery only; it is not automatic cloud recovery |

Display names, relay origins, invite codes, mailbox capabilities, and safety
phrases are never accepted as account identity. A changed device certificate,
root fingerprint, or protocol package is a security event requiring explicit
user confirmation and, when continuity cannot be proven, fresh pairing.

## Local bridge session contract

The browser obtains a daemon session through this one-time sequence:

```text
daemon start → URL fragment bootstrap → Origin/Host/version check
  → one-time exchange → HttpOnly + SameSite=Strict cookie
  → fragment removal → authenticated least-privilege API
```

- The bootstrap secret exists only in memory and the URL fragment. It is
  consumed only after exact Origin, Host, and UI-version checks succeed; a
  failed attempt does not burn the token, while a successful exchange burns it
  immediately.
- The daemon stores only hashes of bootstrap, cookie, and CSRF values. The UI
  must call `history.replaceState` to remove the fragment before normal use.
- State-changing API requests and bootstrap/renewal require the exact configured
  loopback Origin and Host. Same-origin read-only GET status calls may omit
  `Origin` in Chromium, but still require the exact Host, session cookie, and UI
  version. State changes additionally require the session CSRF token. Missing
  Origin on a mutation, alternate Host, stale cookie, expired session, wrong UI
  version, and daemon restart fail closed.
- The bridge is not a trust upgrade for a compromised browser, extension, or
  operating system. It prevents arbitrary web origins from using the daemon API;
  it does not protect an endpoint that can read the browser's live memory.
- The current Rust HTTP handler exposes authenticated daemon-owned status,
  identity, invite, pairing, device, contact, session, attachment, delivery,
  recovery, lock, and wipe routes. Requests are loopback-bound, capped at a
  small body size, marked `no-store`, and unknown routes are rejected.
  `serve --ui-dir` serves only the built web bundle after rejecting traversal,
  encoded paths, and symlink escapes. The identity endpoint returns only the
  public account/device/display summary after the daemon has unlocked its
  encrypted store; it never returns seeds, raw store records, ratchet state, or
  private capabilities. Every state-changing route requires the daemon session
  CSRF token, exact Origin/Host, and UI-version binding. Pairing, contact
  approval, safety verification, device revocation, and message delivery remain
  daemon-owned transitions; the browser is a presentation client.
- The canonical invite envelope is `ADDAINV1`. The relay stores and consumes it
  opaquely after checking the signed payload's advertised relay origin; the
  daemon remains responsible for signature, code binding, and expiry checks.
  A successful relay consume returns an `ADRECEIPT1` receipt signed by the
  relay's Ed25519 key. The receipt contains the signing key fingerprint as
  its first authenticated field, so a rotated or revoked key is rejected
  until the daemon is explicitly reconfigured with a separately delivered
  public key and fingerprint. The receipt contains
  relay origin, code hash, invite digest, and timestamp; daemon
  staging requires the fields and the explicitly bootstrapped relay public key
  to match. The daemon also requires a separately delivered SHA-256 fingerprint
  of that raw public key; the relay response and `/api/v1/info` value are
  display/reference material, not a trust bootstrap. A key/fingerprint mismatch
  fails before staging.

## Current daemon protocol boundary

The current implementation boundary is the Rust daemon, not the deleted browser
Olm/WASM runtime:

```text
Account Root Key
  └─ root-signed Device Certificate / Device Key
       └─ invite + safety verification + contact approval
            └─ daemon-owned session catalog and encrypted persistence
                 └─ opaque relay delivery / local browser presentation
```

The daemon admission gate accepts only the pinned `openmls-1` protocol identity
and rejects legacy browser envelopes. Session state, replay handling, delivery
ledger, device registry, and recovery records stay in the encrypted daemon
store. The relay and browser never become owners of these state transitions.
This is implementation evidence, not an independent cryptographic audit; the
selected protocol composition and high-risk release remain blocked until
external review and release evidence are complete.

### Current user-visible phase mapping

The daemon does not persist a second, browser-owned state machine. The following
table is the canonical mapping from bridge events and the persisted pairing
snapshot to the user-visible phases. `expired`, `revoked`, and `offline-pending`
are guarded outcomes, not claims that the pairing is still usable.

| User-visible phase | Source of truth | Allowed next action | Message/identity guarantee |
| --- | --- | --- | --- |
| `bootstrap` | one-time daemon URL fragment and bridge exchange | exchange once or request a fresh daemon URL | no authenticated API before exchange |
| `invite-created` | `PairingState::InviteCreated` | share, revoke, or replace the invite | code is rendezvous only; it is not authentication |
| `received` | verified invite response staged by daemon | compare safety number or reject | peer identity is displayed only after daemon validation |
| `safety-unverified` | `PairingState::Verified` with `safety_verified=false`, or established pairing re-locked for reconfirmation | compare the complete safety number, or reject | messaging remains blocked |
| `safety-verified` | `PairingState::Verified` with `safety_verified=true` | explicitly approve or reject | safety comparison passed; contact is not approved yet |
| `approved` | explicit daemon approval transition | establish the conversation or reject | approval alone does not imply delivery |
| `established` | `PairingState::Established` with `safety_verified=true` and session catalog ready | send encrypted data, lock, or revoke | message encryption is daemon-owned |
| `rejected` | `PairingState::Rejected` or binding/trust failure | create a new invite and repeat verification | previous binding is not silently reused |
| `expired` | invite/relay TTL validation error | create a new invite | expired material is not retried |
| `revoked` | device, invite, or relay binding revocation error | stop and explicitly re-establish trust | old capability/device is not accepted |
| `offline-pending` | local delivery ledger `Retryable`/`Queued` | wait for the relay or retry within the ledger policy | only local encryption is complete; recipient receipt is unknown |

`RelayAccepted` is rendered as “전달 경로 접수됨 · 상대 수신 여부 확인 불가”.
The relay's mailbox acknowledgement is not a read receipt. The UI never claims
that a person saw a message unless a future authenticated receipt protocol is
implemented and separately reviewed.

## Invite-code lifecycle

| State | Entered by | Allowed next transition | Invariant |
| --- | --- | --- | --- |
| `code-created` | owner submits a signed `ADDAINV1` invite to its user-owned relay | consume, expire, revoke | relay stores only `SHA-256(normalized_code)`, the signed invite payload, digest, and expiry |
| `code-consumed` | one successful code submission | none | record is removed atomically before the response is accepted; a second consume fails |
| `code-expired` | TTL or purge | none | expired record is not returned and is removed on the next persistence boundary |
| `code-invalid` | malformed, unknown, wrong-relay, or reused code | create a new code | response does not reveal whether a record ever existed |

Protocol rules:

- Code material is generated with the platform CSPRNG and has at least 128 bits
  of entropy after normalization.
- Display formatting is cosmetic; spaces and hyphens are ignored only for
  input normalization, and the canonical value is what is hashed.
- The default TTL is 10 minutes and the maximum is 24 hours. A code is
  single-use and is removed only after durable persistence succeeds.
- The relay never logs the code, code hash, invite, invite digest, or requester
  payload. Failed attempts are deliberately returned as one generic error.
- The stored signed invite is bound to the code by `inviteDigest`. The receiver
  must still verify the invite signature, expiry, identity, relay binding, and
  safety material before pairing.
- The creating relay accepts an invite code only when the signed invite's
  advertised relay origin matches that relay. A code submitted to a different
  relay is an unknown code, not a cross-relay redirect.
- Code entry is a rendezvous operation, not authentication. Code possession
  alone must never authorize private-key export, profile unlock, device
  addition, or message sending.

## Legacy browser prototype appendix

The `ADDAINV1`/`ADENVWEB3` and vodozemac Olm v2 state tables below are retained
only as historical design material. They are not part of the current daemon
release path, are not imported into daemon state, and must not be used as
evidence that the current product has a browser-owned ratchet.

## Profile and invite invariants

| State | Entered by | Allowed next transition | Invariant |
| --- | --- | --- | --- |
| `profile-unlocked` | passphrase unlock | create/verify invite, lock, wipe | private material is only in the active browser session |
| `invite-active` | signed invite export | expire, revoke, pair | invite UUID is unique; expiry is at most 24 hours; prekey is `reserved` |
| `invite-expired` | clock/validation failure | create a new invite | expired invite cannot reserve or consume a prekey |
| `invite-revoked` | explicit revoke | create a new invite | revoked prekey is never reused |
| `paired` | verified signed peer invite | initialize session, lock, reset | peer identity and transcript are persisted |

## Olm session invariants

| State | Valid control | Invalid operation |
| --- | --- | --- |
| `waiting-init` | one signed `olm-init` from the bound peer | message, duplicate init, ready from responder |
| `init-sent` | one signed `olm-ready` from the bound peer | message, duplicate init, ready from wrong peer |
| `ready` | signed message after safety confirmation | message before safety confirmation or pending ready delivery |
| `reset-required` | create a fresh profile/pairing | automatic identity or ratchet repair |

The following must hold for every state:

- `peerIdentity` and the canonical transcript remain unchanged for the session.
- `endpointBinding` records the canonical peer relay origin, capability path, and
  protocol version used when the session was paired; a later endpoint or
  capability change requires a fresh pairing and safety comparison.
- A changed identity, endpoint, capability set, prekey, signature, or replay ID
  fails closed before Olm state advances.
- An Olm session pickle is persisted before the operation is considered
  successful. If persistence fails, the in-memory pickle and operation result
  are rolled back.
- A control envelope is marked seen only after its control transition and
  session persistence succeed.
- A message is marked seen only after decrypt, ratchet persistence, and local
  transcript persistence succeed.
- A duplicate envelope never decrypts and never advances a ratchet.
- A failed or ambiguous state does not silently re-pair; the user must create a
  new pairing and compare safety material again.

## Delivery contract

`send -> relay POST -> recipient daemon fetch -> decrypt -> local persist -> relay ack`
is at-least-once delivery. The relay may duplicate or retain an envelope, so
the recipient deduplicates by profile-bound envelope ID. The relay ack only
removes the envelope from that mailbox; it is not a sender-visible read receipt
and does not prove that the human recipient saw the message. A failed ack does
not erase the local decrypted result; the next sync may receive the same
envelope and safely acknowledge it as already imported.

The sender's `relay-accepted` state therefore means only that the user-owned
relay durably accepted the ciphertext. `recipient-received` and `decrypted`
are local recipient-daemon states unless a future, separately authenticated
delivery receipt protocol is added. The product currently exposes no read
receipt claim.

## Executable state vectors

The fixed-seed vector fixture runs the browser runtime against the committed WASM
module and an in-memory IndexedDB boundary:

```sh
npm --prefix apps/web test --workspaces=false
node scripts/verify_web_crypto_binding.mjs
```

The `fixed-seed protocol vectors preserve state-machine invariants` case covers
fresh pairing and safety confirmation, prekey consumption/replenishment, signed
payload mutation, deterministic message reordering, duplicate envelope replay,
and peer endpoint mutation. A rejected mutation must leave the message count and
session status unchanged. This is composition evidence only; it is not an
independent cryptographic audit or a browser/OS matrix.

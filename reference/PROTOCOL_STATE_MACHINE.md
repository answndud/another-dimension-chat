# Browser protocol state machine

This is the executable state contract for the current `ADWEB3`/`ADENVWEB3`
1:1 browser protocol. It is a composition boundary around vodozemac Olm v2;
it does not introduce a new cryptographic primitive.

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

`send -> relay POST -> recipient read -> decrypt -> local persist -> relay ack`
is at-least-once delivery. The relay may duplicate or retain an envelope, so
the recipient deduplicates by profile-bound envelope ID. A failed ack does not
erase the local decrypted result; the next sync may receive the same envelope
and safely acknowledge it as already imported.

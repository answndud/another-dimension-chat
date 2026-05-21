# Security-Ready Component Boundaries

Another Dimension Chat is not a secure messenger release today.

This document is a public-safe inventory of the main `dev-insecure` prototype components that must be replaced, tightened, or reviewed before any security-ready claim. It is a boundary map, not an approval to ship production communication.

## Current Position

The project currently has a working local prototype loop:

- CLI and Tauri can run Alice/Bob local profile, pairing, safety material, message send/receive, replay check, expiry, and development-store plaintext guard flows.
- The loop is `dev-insecure` and local only.
- Default builds do not expose usable profile, pairing, messaging, storage unlock, Tor bootstrap, onion hosting, stream I/O, or production message commands.
- Default CLI hardening rejects production skeleton commands for profile, pairing, messaging, storage unlock, transport bootstrap, and transport send/receive until a later explicit runtime-command phase.
- `ProductionSkeletonPreflightSummary` aggregates crypto/session, transport message-path, storage message-path, and default-command guard status without opening production messaging.
- Default CLI `production preflight` prints that aggregate preflight status as read-only redacted copy; it does not create profiles, unlock storage, bootstrap transport, send envelopes, receive envelopes, or mark messaging ready.
- Tauri `prototype_status` mirrors the production preflight blockers as static read-only copy without executing the CLI command or adding a production messaging command.
- `ProductionSkeletonNextConnectorSelection` currently selects the session protocol and durable-state gate as the next connector candidate without opening runtime execution.
- `SessionDurableStateConnectorGate` records the current session durable-state contract: pairwise identity private key, Noise static private key, and replay state require encrypted-at-rest records, while Noise transport state remains in-memory only and runtime execution stays closed.
- `SessionDurableStateConnectorHarness` applies that contract to the storage policy before a connector implementation exists: private-key and replay records are accepted only as encrypted records, and session transport persistence is rejected.
- `SessionDurableStatePersistenceAdapterSkeleton` maps those durable-state kinds to storage policy without implementing storage unlock, transport I/O, runtime messaging, or durable Noise transport persistence.
- `SessionDurableStateEncryptedRecordAdapter` prepares allowed sealed durable-state records but does not write them to a store, open unlock commands, or persist Noise transport state.
- `SessionDurableStateAdapterNonReadinessGuard` keeps rollback protection, store writes, durable session persistence, production E2EE readiness, durable Noise transport persistence, and runtime messaging false.
- The session durable-state store-write spike is test-only: it round-trips a prepared sealed record through `SqlCipherRecordStore` while preserving the production non-readiness guard.
- `SessionDurableStateStoreWriteStatusMirror` reports that store-write coverage is test-only and keeps production store write, unlock command, durable session persistence, rollback protection, and runtime messaging disabled.
- `SessionDurableStateProductUnlockBlockerSummary` records that passphrase-first storage exists but product unlock remains blocked by key wrapping, backup exclusion, rollback protection, and durable session lifecycle decisions.
- `SessionDurableStateUnlockPolicyHandoffSummary` links that blocker summary to the storage unlock policy: high-risk mode requires passphrase input, OS-keystore-only unlock is rejected, and product unlock remains disabled.
- `SessionUnlockLockCommandDesignGate` records the pre-implementation unlock/lock command requirements: explicit lock, idle auto-lock, redacted unlock errors, passphrase-first high-risk policy, and disabled product commands.
- `session_unlock_command_fail_closed()` is the first unlock command API skeleton: it covers passphrase/OS-keystore request shapes but always returns a redacted disabled result without opening storage, writing session records, exposing key material, or enabling runtime messaging.
- `SessionLockLifecycleStatusMirror` records explicit lock and idle auto-lock requirements while keeping storage unlocked state, product lock command, key erasure claim, and runtime messaging disabled.
- `SessionUnlockRedactedErrorTaxonomy` classifies disabled, passphrase-required, and OS-keystore-only rejected unlock states without exposing raw storage errors, OS keychain errors, paths, identifiers, key material, or passphrase detail.
- Default CLI `production unlock` is a boundary rejection only: it returns the redacted disabled taxonomy and does not open storage, write session records, expose key material, or enable runtime messaging.
- Tauri `prototype_status` mirrors the CLI production unlock rejection as static copy only; it does not add a Tauri unlock command or execute the CLI.
- Tauri `prototype_status` mirrors session durable-state and unlock-policy blockers as static read-only copy without executing unlock, writing session records, or opening runtime messaging.
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
| Production skeleton preflight | `ProductionSkeletonPreflightSummary` aggregates current session, transport, storage, and command-surface blockers. | Convert preflight blockers into a Rust-owned runtime command only after crypto, transport, storage, and release boundaries are ready. |
| Production connector selection | `ProductionSkeletonNextConnectorSelection` selects session protocol and durable-state persistence as the current next gate while keeping runtime execution closed. | Turn the selected gate into a reviewed implementation slice before enabling storage unlock, transport I/O, or runtime messaging commands. |
| Session durable-state gate | `SessionDurableStateConnectorGate` drafts the persistence contract for session-critical state without persisting Noise transport state or opening runtime execution. | Add a reviewed connector harness and storage lifecycle decision before making durable session persistence or production E2EE claims. |
| Session durable-state harness | `SessionDurableStateConnectorHarness` checks the gate against storage policy while keeping connector implementation, storage unlock, transport I/O, and runtime messaging closed. | Replace the harness with a narrow connector implementation only after rollback/key-management and session lifecycle decisions are ready. |
| Session persistence adapter skeleton | `SessionDurableStatePersistenceAdapterSkeleton` maps allowed durable-state record policies before any encrypted-record adapter implementation exists. | Implement a narrow encrypted-record adapter only after preserving session-transport in-memory and non-readiness invariants. |
| Session encrypted-record adapter spike | `SessionDurableStateEncryptedRecordAdapter` prepares allowed sealed records for session durable state and rejects session transport state. | Add actual store writes only after keeping unlock/key-management/rollback and durable session lifecycle non-claims explicit. |
| Session adapter non-readiness guard | `SessionDurableStateAdapterNonReadinessGuard` keeps the sealed-record adapter spike from implying rollback protection, durable session persistence, production E2EE readiness, or runtime messaging. | Preserve these guards until key management, rollback, lifecycle, and protocol review are complete. |
| Session store-write test-only spike | A `#[cfg(test)]` helper round-trips one prepared sealed durable-state record through `SqlCipherRecordStore`. | Promote no store-write path to production until unlock/key-management/rollback and session lifecycle decisions are complete. |
| Session store-write status mirror | `SessionDurableStateStoreWriteStatusMirror` exposes test-only coverage while keeping production store-write and readiness flags false. | Keep this mirror aligned with any future store-write changes before exposing user-facing unlock or runtime messaging. |
| Session product unlock blocker | `SessionDurableStateProductUnlockBlockerSummary` keeps product unlock closed despite the passphrase-first storage boundary. | Decide key wrapping, backup exclusion, rollback behavior, and durable session lifecycle before exposing unlock commands. |
| Session unlock policy handoff | `SessionDurableStateUnlockPolicyHandoffSummary` confirms the storage unlock policy still requires passphrase input in high-risk mode and rejects OS-keystore-only unlock. | Keep product unlock closed until key wrapping, backup exclusion, rollback behavior, and durable session lifecycle are implemented and reviewed. |
| Session unlock/lock design gate | `SessionUnlockLockCommandDesignGate` captures the required unlock/lock command semantics before implementation while keeping product commands disabled. | Implement fail-closed command skeletons only after redacted errors, lock lifecycle, key handling, and storage policy tests are in place. |
| Session unlock command skeleton | `session_unlock_command_fail_closed()` defines request/result shapes for future unlock commands while rejecting every request fail-closed. | Replace disabled results with real unlock only after key wrapping, backup exclusion, rollback, lock lifecycle, and storage-open tests are reviewed. |
| Session lock lifecycle mirror | `SessionLockLifecycleStatusMirror` mirrors explicit lock and idle auto-lock requirements without claiming an active unlocked store or key erasure. | Implement actual lock/unlock lifecycle only after key handling, memory lifetime, and storage-close behavior are tested. |
| Session unlock error taxonomy | `SessionUnlockRedactedErrorTaxonomy` provides safe unlock failure categories without raw storage, OS, path, identifier, key, or passphrase detail. | Keep taxonomy aligned with future CLI/Tauri error copy before exposing unlock commands. |
| CLI production unlock rejection | Default CLI `production unlock` returns a redacted disabled boundary error and performs no storage or runtime action. | Replace rejection with real unlock only after key wrapping, lifecycle, storage-open, error-copy, and rollback tests are complete. |
| Tauri unlock rejection mirror | Tauri `prototype_status` mirrors CLI unlock rejection as static read-only copy without adding a command. | Add a Tauri command only after storage/key lifecycle and error-copy tests are complete. |
| Tauri UI | Prototype shell can run dev-only local demos, display structured local state, and mirror read-only production preflight, session durable-state, and unlock-policy blockers as static status copy. | Replace CLI-wrapper demo commands with narrow Rust-owned runtime commands only after crypto, transport, and storage boundaries are security-ready. |
| Release and updates | Public copy, static verifiers, [RELEASE_HARDENING.md](RELEASE_HARDENING.md), [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md), `scripts/verify_release_artifact_gates.sh`, `scripts/verify_dependency_review_gate.sh`, `scripts/verify_external_review_gate.sh`, and `scripts/verify_release_completion_audit.sh` track non-claims and missing release gates; no release signing, reproducible/equivalent verification, dependency review record, external review readiness evidence, or update-integrity story exists. | Add signing, reproducible build or equivalent verification, dependency review, external/independent review readiness, update integrity, and release safety copy before public high-risk use. |

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
- [RELEASE_HARDENING.md](RELEASE_HARDENING.md) and [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md): track missing release signing, reproducible/equivalent verification, dependency review, external review readiness, update integrity, and the current not-complete audit verdict before any security-ready claim.
- `scripts/verify_release_hygiene.sh`: keep static checks for the boundary inventory and non-claims.

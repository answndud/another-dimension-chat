# Roadmap

This roadmap is intentionally conservative. Another Dimension Chat is not a secure messenger today, and the project should not make security claims before the implementation, tests, review, and release process support them.

## Guiding Principles

- Keep the prototype honest: development-only behavior stays behind `dev-insecure`.
- Prefer reviewed protocols and maintained libraries over custom cryptography.
- Avoid phone numbers, email accounts, global user IDs, searchable directories, centralized contact discovery, push notification content, and cloud backup dependencies in the v0.1 direction.
- Treat direct P2P/WebRTC as non-default for high-risk mode.
- Do not add broad claims such as "more secure than Signal."
- Add tests before expanding the trusted surface.

## Phase 0: Public Prototype Hygiene

Status: in progress.

Goal: keep the public repository understandable, verifiable, and clear about its non-production status.

Tasks:

- Maintain `README.md` and `SECURITY.md` as public-safe documents.
- Keep private planning notes out of the public repository.
- Keep `scripts/verify_all.sh` green locally and in GitHub Actions.
- Keep generated artifacts and local prototype data ignored.
- Keep `dev-insecure` warnings visible.

Exit criteria:

- Public repository explains what exists, what does not exist, and how to verify it.
- CI passes on `main`.
- No private planning notes or local dev data are tracked.

## Phase 1: Prototype Boundary Hardening

Status: completed for the current CLI prototype boundary.

Goal: make the CLI prototype stricter without claiming real security.

Covered by tests:

- Malformed CLI inputs and user-facing error behavior.
- Pairing payload parsing boundaries, malformed segments, and oversized input rejection.
- Duplicate pairing scans for pending and active contacts.
- Replayed message envelopes not being displayed twice.
- Plaintext message content not being persisted by the current development store path.
- Default builds rejecting prototype commands that require `dev-insecure`.
- Negative profile/contact identifier validation.
- Pairing cancel and fresh pending pairing expiry CLI behavior.
- Message expiry removing pending envelopes before receive.

Exit criteria:

- CLI smoke flow and workspace tests cover the current prototype invariants.
- Default builds remain visibly separate from `dev-insecure` builds.
- No current feature weakens the warning or prototype boundary.

Maintenance rule:

- Reopen this phase if new CLI prototype behavior is added before Phase 2.

## Phase 2: Real Crypto Decision

Status: in progress.

Goal: choose the production cryptographic approach before replacing placeholders.

Tasks:

- Maintain [CRYPTO_DECISION.md](CRYPTO_DECISION.md) as the public-safe decision boundary for Phase 2.
- Maintain [SIGNATURE_DECISION.md](SIGNATURE_DECISION.md) for the first identity signature dependency decision.
- Maintain [RANDOMNESS_DECISION.md](RANDOMNESS_DECISION.md) for the first production pairing nonce randomness boundary.
- Maintain [SESSION_DECISION.md](SESSION_DECISION.md) for the first production session establishment boundary.
- Keep production-facing key wrappers separate from `dev-insecure` placeholder key material.
- Keep production Ed25519 pairwise private key generation backed by OS randomness.
- Keep canonical pairing and safety transcript fixture tests stable before replacing placeholder signatures.
- Add `ed25519-dalek` production signature wrapper tests before wiring pairing decode to production verification.
- Keep production pairing public key strings scheme-tagged before decoder wiring.
- Keep production pairing signature strings scheme-tagged before decoder wiring.
- Reject explicit mixed dev/production public key and signature schemes during pairing decode.
- Verify production public key plus production signature pairing payloads through the Ed25519 path.
- Keep production pairing payload construction separate from `dev-insecure` pairing material generation.
- Keep production pairing nonce generation backed by OS randomness and distinct from development nonce generation.
- Keep production pairing defaults centralized without hiding endpoint or prekey decisions.
- Keep production pairing draft generation separate from storage, backup, and export decisions.
- Keep production safety transcript tests sensitive to identity, endpoint, prekey, and capability changes.
- Keep production safety material derivation separate from `dev-insecure` fake crypto.
- Keep signed production payload to safety material integration tests before wiring production UI or storage.
- Keep session establishment tests in front of any message encryption dependency.
- Select maintained Rust-compatible libraries for identity signatures and session encryption.
- Decide how pairing payload signatures map to real pairwise identity keys.
- Decide whether the first production session model uses a Signal-style ratchet, Noise-based construction, or another reviewed design.
- Define what prekey or synchronous-online assumptions apply to the first production prototype.
- Add test vectors and negative tests before replacing placeholder code.

Exit criteria:

- No custom cryptographic algorithm is introduced.
- Placeholder `dev-insecure` behavior remains available only for tests and development.
- Production crypto boundary has reviewed dependencies and documented test coverage.

## Phase 3: Production Storage Decision

Status: completed for the current v0.1 storage lifecycle boundary; production key wrapping and durable private key storage are deferred.

Goal: replace development storage with an encrypted local storage boundary.

Tasks:

- Maintain [STORAGE_DECISION.md](STORAGE_DECISION.md) as the public-safe storage decision boundary.
- Keep production storage classification tests in front of any encrypted backend implementation.
- Choose a production storage backend.
- Define key derivation and local key storage assumptions.
- Decide platform keychain integration for desktop.
- Add migration boundaries from dev storage to production storage.
- Add tests for no plaintext message persistence in production-mode storage.

Exit criteria:

- Production storage is encrypted at rest.
- Development storage remains gated behind `dev-insecure`.
- Local record lifecycle deletion, expiry, and replay state behavior are tested without claiming secure media erasure.
- Deferred work remains explicitly documented before production key storage, key wrapping, migration, rollback protection, or secure media erasure claims.

## Phase 4: Onion Transport Prototype

Status: not started.

Goal: introduce a real anonymized transport prototype without making direct P2P the high-risk default.

Tasks:

- Decide between bundled Tor daemon control and a Rust Tor implementation for the first prototype.
- Define per-contact rendezvous endpoint lifecycle.
- Keep endpoint identifiers cryptographically separate from identity keys.
- Add endpoint rotation behavior over an existing encrypted session.
- Add deterministic simultaneous-connect tie-break behavior based on pairwise public keys.

Exit criteria:

- High-risk transport path does not require direct P2P.
- Endpoint rotation and duplicate connection behavior are deterministic and tested.
- Transport metadata limitations remain documented and visible.

## Phase 5: Tauri Desktop Shell

Status: minimal scaffold slice completed; next desktop work must stay behind a redacted status boundary.

Goal: add a thin desktop shell around the Rust core after core behavior is stable.

Tasks:

- Keep `apps/desktop-tauri` as a minimal scaffold only; do not add production messaging UI.
- Keep cryptographic, storage, transport, and protocol state in Rust.
- Keep frontend IPC minimal and explicit.
- Preserve all CLI/core tests.
- Keep the shell honest about prototype status and avoid secure-release wording.
- Do not expose Tor/onion hosting, descriptor publication, stream I/O, envelope I/O, push notifications, cloud backup, groups, file transfer, or multi-device features.
- Keep Tauri out of the root Rust workspace until dependency/build cost is accepted for CI.
- Keep the committed frontend lockfile current when scaffold dependencies change.
- Keep full Tauri install/build out of lightweight CI until a separate heavy workflow decision.
- Keep local-only desktop commands and platform prerequisites documented.
- Next slice: connect the Tauri `prototype_status` command to a small Rust-owned status adapter without adding interactive messaging, transport bootstrap, or persistence controls.

Exit criteria:

- Desktop shell does not duplicate security logic in JavaScript.
- Existing Rust verification still passes.
- UI does not imply security readiness.
- Tauri commands return redacted status/summaries only until a separate UI flow boundary exists.
- Minimal scaffold static checks pass through `scripts/verify_tauri_scaffold.sh`.

## Phase 6: Release and Supply-Chain Baseline

Status: not started.

Goal: prepare for auditable builds before any security-ready release.

Tasks:

- Choose release signing strategy.
- Define reproducible build goals.
- Define dependency review workflow.
- Add release artifact checksum/signature process.
- Add platform-specific signing notes for macOS and Windows.

Exit criteria:

- Release process is documented and repeatable.
- Artifacts have checksums and signatures.
- No security-ready release is published before review.

## Out of Scope Until Later

- Offline mailbox.
- Group chat.
- File transfer.
- Voice or video calls.
- Multi-device support.
- Push notifications.
- Cloud backup.
- Public user directory.

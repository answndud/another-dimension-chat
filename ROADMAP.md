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

Status: in progress.

Goal: make the CLI prototype stricter without claiming real security.

Covered by tests:

- Malformed CLI inputs and user-facing error behavior.
- Pairing payload parsing boundaries, malformed segments, and oversized input rejection.
- Duplicate pairing scans for pending and active contacts.
- Replayed message envelopes not being displayed twice.
- Plaintext message content not being persisted by the current development store path.
- Default builds rejecting prototype commands that require `dev-insecure`.
- Negative profile/contact identifier validation.

Remaining tasks:

- Add CLI tests for pairing cancel and pairing expiry behavior.
- Add CLI tests for message expiry behavior.
- Keep the public README and roadmap aligned as the prototype boundary changes.

Exit criteria:

- CLI smoke flow and workspace tests cover the current prototype invariants.
- Default builds remain visibly separate from `dev-insecure` builds.
- No new feature weakens the warning or prototype boundary.

## Phase 2: Real Crypto Decision

Status: not started.

Goal: choose the production cryptographic approach before replacing placeholders.

Tasks:

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

Status: not started.

Goal: replace development storage with an encrypted local storage boundary.

Tasks:

- Choose a production storage backend.
- Define key derivation and local key storage assumptions.
- Decide platform keychain integration for desktop.
- Add migration boundaries from dev storage to production storage.
- Add tests for no plaintext message persistence in production-mode storage.

Exit criteria:

- Production storage is encrypted at rest.
- Development storage remains gated behind `dev-insecure`.
- Local data deletion, expiry, and replay state behavior are tested.

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

Status: not started.

Goal: add a thin desktop shell around the Rust core after core behavior is stable.

Tasks:

- Add `apps/desktop-tauri`.
- Keep cryptographic, storage, transport, and protocol state in Rust.
- Keep frontend IPC minimal and explicit.
- Add UI only for currently supported 1:1 prototype flows.
- Preserve all CLI/core tests.

Exit criteria:

- Desktop shell does not duplicate security logic in JavaScript.
- Existing Rust verification still passes.
- UI does not imply security readiness.

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

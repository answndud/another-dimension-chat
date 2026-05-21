# Another Dimension Chat

Another Dimension Chat is an early Rust prototype for a high-risk 1:1 messenger architecture.

The project goal is not "a serverless chat app" in the loose sense. The long-term goal is a no-central-trusted-server messenger that avoids phone-number identity, global accounts, centralized contact discovery, centralized push notifications, and default direct P2P transport in high-risk mode.

## Current Status

This repository is a prototype scaffold.

Do not use it for real communication.

The current implementation is intentionally limited to a `dev-insecure` CLI flow that helps test protocol boundaries, pairing lifecycle, message envelope handling, replay behavior, and local storage invariants before any production security claim.

What exists today:

- Rust workspace split into `identity`, `pairing`, `crypto`, `protocol`, `transport`, `storage`, and `core` crates, plus CLI and Tauri prototype shells.
- A `dev-insecure` CLI flow for local pairing and message-flow experimentation only.
- Pairwise profile/contact, pairing payload, safety number, pairing lifecycle, padded envelope, replay-window, endpoint update, and deterministic duplicate-connection prototypes.
- Production-facing guardrails for Ed25519 pairwise identity material, signed pairing drafts, Noise-based session setup smoke tests, envelope encryption/decryption, replay rejection, and local storage policy checks.
- High-risk transport policy and fail-closed Tor/onion scaffolding: onion-only default routing, direct-route rejection unless explicitly low-risk, Arti-first decisions, app-private directory checks, pre-network blocker tracking, runtime preflight, redacted runtime events, bridge/censorship configuration boundaries, onion key lifecycle policy, and descriptor/stream/envelope-I/O gates.
- Transport pre-network docs alignment that treats blocker closeout as entry to a bounded fail-closed skeleton, not usable network execution.
- Transport pre-network verifier guard that keeps bounded-fail-closed and no-socket/bootstrap/hosting/transfer non-claims checked in release hygiene.
- SQLCipher-backed storage spikes for `ADREC1` record containers, passphrase unlock, high-risk unlock policy, replay-window persistence after successful decrypt, pairwise endpoint state, local message indexes, opaque record-id derivation, and internal raw database-key opening only.
- Storage lifecycle docs alignment that separates the narrow SQLCipher spike from deferred key management, rollback, secure deletion, backup, recovery, and durable session persistence work; it is not a complete production encrypted local storage lifecycle.
- Storage lifecycle verifier guard that keeps `ADREC1` container wording and complete-storage-lifecycle non-claims checked in release hygiene.
- A read-only Tauri prototype status shell exposing only redacted release-claim, messaging-surface, core, profile, pairing, production preflight, transport, network-execution, storage, and verification boundary state through `prototype_status`.
- Tauri status docs alignment that clarifies core status is static boundary copy, not a production core runtime call.
- Tauri verification status boundary that exposes lightweight-check status without adding production commands or readiness claims.
- Tauri scaffold verifier cleanup that keeps status field and static copy checks aligned without adding build cost.
- Lightweight verification scripts, release-hygiene and Tauri-scaffold static verifiers, CLI hardening tests, and GitHub Actions verification.
- A public-safe release hardening gap inventory that tracks missing signing, reproducible/equivalent verification, dependency review, release-copy alignment, external review readiness, and update integrity before any security-ready claim.
- A release artifact gate verifier skeleton that keeps signing and reproducible/equivalent verification documented as incomplete until real implementation exists.
- A dependency review gate verifier skeleton that keeps dependency/supply-chain review documented as incomplete until review evidence exists.
- A dependency review template that records required release-candidate lockfile, direct dependency, native dependency, deny/allow decision, and classification fields while remaining classified as not review evidence.
- An external review gate verifier skeleton that keeps external/independent review readiness documented as incomplete until review readiness evidence exists.
- An external review readiness template that records required release-candidate scope, review material, reviewer expectation, finding triage, blocker, and classification fields while remaining classified as not review readiness evidence.
- A release completion audit that records current v0.1-security-ready evidence as not complete while release gates remain incomplete.
- An update integrity gate verifier skeleton that keeps update/installer integrity documented as incomplete until release artifact and package verification evidence exists.
- An update/installer integrity template that records required artifact, signature/hash, downgrade, platform package, recovery, and classification fields while remaining classified as not update integrity evidence.
- A release signoff gate verifier skeleton that keeps release-candidate threat-model/release-copy signoff documented as incomplete until signoff evidence exists.
- A release-candidate signoff template that records required threat-model, public-copy alignment, release-gate evidence, blocker, and classification fields while remaining classified as not signoff evidence.
- A release gate evidence audit that records why template coverage is still not v0.1-security-ready 100% without real candidate-specific gate evidence.
- A release signing implementation plan that targets offline detached signatures while keeping release signing documented as unimplemented.
- A release signing dry-run verifier that uses disposable fixtures to reject missing signatures, stale checksums, stale detached signature markers, and unsigned artifacts without signing release artifacts.
- A release detached-signature fixture verifier that uses disposable OpenSSL RSA keys to validate checksum signature behavior without creating release keys or signing release artifacts.
- A release signing tooling decision gate that records the OpenSSL-compatible detached-signature path while keeping release signing documented as incomplete.
- A release signing ceremony dry-run record that defines key ceremony and command sequence placeholders without creating release keys or signing release artifacts.
- A release signing ceremony harness that executes the selected OpenSSL-compatible command sequence with disposable keys only.
- Release key ceremony evidence requirements that define the required real ceremony evidence package without creating release keys.
- Release artifact signing evidence requirements that define the required signed artifact evidence package without signing release artifacts.
- Release verification UX evidence requirements that define required user/reviewer verification evidence without verifying release artifacts.
- A release signing candidate evidence index that ties release-candidate signing evidence records together without recording release evidence.
- A release signing candidate evidence collection runbook that defines collection order and fail-closed rules without collecting release evidence.
- A release signing candidate evidence fixture that rejects missing, template-only, placeholder, and mismatched disposable evidence states without collecting release evidence.
- A reproducible/equivalent binary verification plan that records required evidence while keeping binary verification documented as incomplete.
- A binary manifest fixture verifier that rejects missing artifacts, extra artifacts, checksum mismatches, and build-input drift without verifying release artifacts.
- A binary verification input template that records required release-candidate fields while remaining classified as not verification evidence.
- README status compaction that keeps public status focused on current guardrails and non-claims instead of accumulated phase history.

What does not exist yet:

- Real end-to-end encryption.
- Usable production messaging.
- Real Tor/onion transport.
- Production transport adapter implementation.
- Bridge or censorship-circumvention implementation.
- Actual onion service private key material.
- Production unlock/key management.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle.
- Replay rollback protection against encrypted database snapshot restore.
- Production Tauri desktop app. The current Tauri scaffold is a read-only prototype status shell, not a production messaging UI.
- Android or iOS app.
- Offline mailbox.
- Group chat.
- File transfer.
- Voice or video calls.
- Multi-device support.
- Release signing or reproducible builds.
- Dependency/supply-chain review evidence.
- External security review or independent review readiness.

## Security Boundary

This project does not currently provide a secure messenger.

The `dev-insecure` feature uses development-only placeholder behavior and prints:

```text
WARNING: dev-insecure build. Not for real communication.
```

Do not remove, hide, or weaken that warning while the prototype uses fake crypto, mock/file transport, or development storage.

The project also does not claim to be generally more secure than Signal. The intended research direction is narrower: reducing phone-number identity, centralized account infrastructure, centralized contact discovery, and transport metadata exposure under a specific threat model.

## Repository Layout

```text
apps/
  cli/              development CLI shell
  desktop-tauri/    minimal Tauri prototype shell scaffold

crates/
  core/             profile, pairing, and message orchestration
  crypto/           prototype crypto boundary
  identity/         pairwise identity and contact types
  pairing/          pairing payload and safety transcript logic
  protocol/         message envelope and replay window logic
  storage/          development storage and production policy boundary
  transport/        fail-closed transport policy, onion, runtime, and stream boundaries

scripts/
  demo_dev_cli.sh   readable Alice/Bob dev-insecure local demo
  smoke_dev_cli.sh  Alice/Bob CLI smoke flow
  verify_all.sh     canonical local verification entrypoint
  verify_release_hygiene.sh
  verify_tauri_scaffold.sh
```

Private planning and security notes live outside the public repository scope and are ignored under `docs/`.

## Requirements

- Rust stable toolchain.
- `rustfmt` for lightweight verification.
- `clippy` only for full verification.

Install the components if needed:

```bash
rustup component add rustfmt clippy
```

## Verify

Run the lightweight local verification suite:

```bash
scripts/verify_all.sh
```

This runs:

- `cargo fmt --all -- --check`
- `cargo test --workspace --lib`
- Default build boundary checks that keep `dev-insecure` out of default feature sets and verify the default CLI exposes only boundary commands.
- Default CLI hardening rejects production skeleton commands for profile, pairing, messaging, storage unlock, transport bootstrap, and transport send/receive unless a later phase explicitly opens them.
- Production skeleton preflight summary aggregates current crypto/session, transport, storage, and command-surface blockers without exposing production messaging.
- Production skeleton next connector selection keeps the next slice on session protocol and durable-state gates without opening runtime execution.
- Session durable-state connector gate draft records private-key and replay storage requirements while keeping Noise transport state in memory and runtime execution closed.
- Session durable-state connector harness applies the storage policy to those records and rejects session transport persistence before any connector implementation.
- Session durable-state persistence adapter skeleton maps the allowed record policies without implementing storage unlock, transport I/O, or runtime messaging.
- Session durable-state encrypted-record adapter spike prepares allowed sealed records without writing them to a store or enabling durable Noise transport state.
- Session durable-state adapter non-readiness guard keeps rollback protection, durable session persistence, production E2EE readiness, store writes, and runtime messaging false.
- Session durable-state store-write spike is test-only and round-trips a prepared sealed record through SQLCipher without adding a production unlock or messaging path.
- Session durable-state store-write status mirror marks that coverage as test-only while keeping production store write, unlock, durable persistence, rollback protection, and runtime messaging disabled.
- Session durable-state product unlock blocker summary keeps product unlock closed until key wrapping, backup exclusion, rollback, and durable session lifecycle decisions are complete.
- Session durable-state unlock policy handoff confirms high-risk passphrase-first unlock policy and OS-keystore-only rejection while keeping product unlock and runtime messaging disabled.
- Session unlock/lock command design gate requires explicit lock, idle auto-lock, redacted unlock errors, and passphrase-first high-risk policy while keeping product unlock and lock commands disabled.
- Session unlock command fail-closed skeleton accepts request shape coverage but always returns a redacted disabled result without opening storage, writing session records, exposing key material, or enabling runtime messaging.
- Session lock lifecycle status mirror records default/high-risk idle auto-lock requirements while keeping storage unlocked state, product lock command, key erasure claim, and runtime messaging disabled.
- Session unlock redacted error taxonomy classifies disabled, passphrase-required, and OS-keystore-only rejected states without exposing raw storage errors, OS keychain errors, paths, identifiers, key material, or passphrase detail.
- Default CLI `production unlock` is a fail-closed boundary command that returns the redacted disabled taxonomy without opening storage, writing session records, exposing key material, or enabling runtime messaging.
- Tauri prototype status mirrors the CLI production unlock redacted disabled taxonomy as static read-only copy without adding an unlock command or executing the CLI.
- Tauri prototype status mirrors session durable-state and unlock-policy blockers as static read-only copy without adding unlock, store-write, or runtime messaging commands.
- Tauri scaffold static checks.
- Public release hygiene static checks.

For a heavier pre-release, audit, or risky cross-cutting change pass, run:

```bash
scripts/verify_full.sh
```

This additionally runs:

- CLI smoke flow.
- `cargo test --workspace`
- `cargo test --workspace --features dev-insecure`
- `cargo clippy --workspace --all-targets --all-features`

## CLI Prototype

The CLI commands require the `dev-insecure` feature.

The default build exposes only a local production-boundary self-test. Here, "production" means the default non-`dev-insecure` build boundary, not deployable security. It checks setup, envelope encryption/decryption, replay rejection, tampered ciphertext rejection, replay-state non-advance after tamper in memory, and high-risk transport policy/fail-closed behavior. It does not send messages, persist keys, bootstrap transport, perform network I/O, unlock local storage, or create a secure messenger release:

```bash
cargo run -q -- production self-test
```

The self-test prints a redacted production-session summary for the current `snow` Noise XX synchronous evaluation boundary. The summary keeps production E2EE, durable session persistence, Tauri production messaging commands, and usable async messaging false.

The default build also exposes a read-only production skeleton preflight. It prints the current session, transport, storage, and command-surface blockers without creating profiles, unlocking storage, bootstrapping transport, sending envelopes, receiving envelopes, or marking messaging ready:

```bash
cargo run -q -- production preflight
```

Manual Arti bootstrap spike, local only:

```bash
cargo run -q --features arti-manual-bootstrap -- \
  transport bootstrap \
  --profile alice \
  --app-data-root /absolute/app-private/root
```

Without `--execute-network`, this command exercises only the disabled gate and records a redacted `RuntimeNetworkDisabled` event. With `--execute-network`, it may attempt a real Arti bootstrap, still without send/receive, onion hosting, or usable messaging. The lower-level transport crate now has a persistent client owner boundary, but the CLI command remains a local manual bootstrap spike rather than a messenger runtime.

Before using `--execute-network`, follow [TRANSPORT_EXPERIMENT_RUNBOOK.md](TRANSPORT_EXPERIMENT_RUNBOOK.md). Manual network experiments require an isolated temporary `CARGO_TARGET_DIR`, an isolated app-private data root or explicit Arti state/cache root, cleanup of generated artifacts, and preservation of the no hosting/stream/envelope/messaging boundary.

Manual persistent lifecycle spike, local only:

```bash
cargo run -q --features arti-manual-bootstrap -- \
  transport lifecycle bootstrap \
  --profile alice \
  --app-data-root /absolute/app-private/root
```

Without `--execute-network`, this command performs no network bootstrap and prints a redacted lifecycle summary with `state=Unbootstrapped`, `client_owned=false`, and `usable_transport=false`. With `--execute-network`, it may attempt a manual Arti bootstrap and keep the client inside the lifecycle owner, but it still does not implement send/receive, onion hosting, or usable messaging.

Example local flow:

```bash
export AD_DEV_HOME="$(mktemp -d /tmp/another-dimension-dev.XXXXXX)/home"

cargo run -q --features dev-insecure -- profile init alice
cargo run -q --features dev-insecure -- profile init bob

cargo run -q --features dev-insecure -- pairing start --profile alice > /tmp/alice.pair
cargo run -q --features dev-insecure -- pairing scan --profile bob /tmp/alice.pair > /tmp/bob.pair
cargo run -q --features dev-insecure -- pairing scan --profile alice /tmp/bob.pair

cargo run -q --features dev-insecure -- pairing confirm --profile alice --contact bob
cargo run -q --features dev-insecure -- pairing confirm --profile bob --contact alice

cargo run -q --features dev-insecure -- message send --from alice --to bob "hello"
cargo run -q --features dev-insecure -- message receive --profile bob
```

For the canonical smoke test, prefer:

```bash
scripts/smoke_dev_cli.sh
```

For a readable local demo of the same `dev-insecure` prototype flow:

```bash
cargo run -q --features dev-insecure -- demo local
scripts/demo_dev_cli.sh
```

## Development Rules

- Do not implement custom cryptographic algorithms.
- Do not add direct P2P/WebRTC as the high-risk default transport.
- Do not introduce phone-number, email, global account, searchable username, centralized contact discovery, push notification, or cloud backup dependencies in v0.1.
- Keep fake crypto and development storage behind `dev-insecure`.
- Do not persist production private keys, replay state, message envelopes, local message indexes, or session transport state as plaintext.
- Do not commit local dev data, pairing payloads, logs, generated artifacts, or private planning notes.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the public development roadmap.

Phase 2 crypto planning is tracked in [CRYPTO_DECISION.md](CRYPTO_DECISION.md). That document is not a security claim; it is the decision boundary that must be resolved before placeholder crypto is replaced.

The first identity signature dependency decision is tracked in [SIGNATURE_DECISION.md](SIGNATURE_DECISION.md).

The first production pairing nonce randomness boundary is tracked in [RANDOMNESS_DECISION.md](RANDOMNESS_DECISION.md).

The first production safety material display boundary is tracked in [SAFETY_MATERIAL_DECISION.md](SAFETY_MATERIAL_DECISION.md).

The first production session establishment boundary is tracked in [SESSION_DECISION.md](SESSION_DECISION.md).

The first production storage policy boundary is tracked in [STORAGE_DECISION.md](STORAGE_DECISION.md).

The cross-component replacement inventory is tracked in [COMPONENT_BOUNDARIES.md](COMPONENT_BOUNDARIES.md). It maps the current `dev-insecure` local loop and guardrail spikes to the crypto, transport, storage, Tauri runtime, and release boundaries that must be resolved before any security-ready claim.

The release hardening gap inventory is tracked in [RELEASE_HARDENING.md](RELEASE_HARDENING.md). It records missing release signing, reproducible or equivalent binary verification, dependency review, threat-model/release-copy alignment, external review readiness, and update integrity work. It is not evidence that those gates are complete.

The current completion audit is tracked in [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md). It records that current evidence does not prove v0.1-security-ready 100% and that release gates remain incomplete.

The release signing plan is tracked in [RELEASE_SIGNING_PLAN.md](RELEASE_SIGNING_PLAN.md). It is a pre-implementation plan, not signed artifact verification.

The release signing tooling decision is tracked in [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md). It selects the detached-signature tooling path, but it is not release signing readiness.

The release signing ceremony dry-run is tracked in [RELEASE_SIGNING_CEREMONY_DRY_RUN.md](RELEASE_SIGNING_CEREMONY_DRY_RUN.md). It is not release signing evidence.

The release key ceremony evidence requirements are tracked in [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md). They are not a real key ceremony.

The release artifact signing evidence requirements are tracked in [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md). They are not signed artifact evidence.

The release verification UX evidence requirements are tracked in [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md). They are not signed artifact verification evidence.

The release signing candidate evidence index is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md). It is not release signing evidence.

The release signing candidate evidence collection runbook is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md). It is not candidate evidence.

The release signing candidate evidence fixture is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md). It is not candidate evidence or release approval.

The binary verification plan is tracked in [RELEASE_BINARY_VERIFICATION_PLAN.md](RELEASE_BINARY_VERIFICATION_PLAN.md). It is a pre-implementation plan, not reproducible build evidence.

The binary verification input template is tracked in [RELEASE_BINARY_INPUT_TEMPLATE.md](RELEASE_BINARY_INPUT_TEMPLATE.md). It is not release-candidate evidence.

The dependency review template is tracked in [RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md](RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md). It is not dependency review evidence or supply-chain approval.

The external review readiness template is tracked in [RELEASE_EXTERNAL_REVIEW_TEMPLATE.md](RELEASE_EXTERNAL_REVIEW_TEMPLATE.md). It is not external review readiness evidence or independent review evidence.

The release-candidate signoff template is tracked in [RELEASE_SIGNOFF_TEMPLATE.md](RELEASE_SIGNOFF_TEMPLATE.md). It is not release-candidate signoff evidence or release-copy approval.

The update and installer integrity template is tracked in [RELEASE_UPDATE_INTEGRITY_TEMPLATE.md](RELEASE_UPDATE_INTEGRITY_TEMPLATE.md). It is not update integrity evidence or installer integrity evidence.

The release gate evidence audit is tracked in [RELEASE_GATE_EVIDENCE_AUDIT.md](RELEASE_GATE_EVIDENCE_AUDIT.md). It records that the final release gates are still incomplete and that template coverage is not a 100% security-ready claim.

## License

This repository is currently marked `UNLICENSED` in the Rust workspace metadata.

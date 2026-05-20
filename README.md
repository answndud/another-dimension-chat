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
- SQLCipher-backed storage spikes for encrypted record boundaries, passphrase unlock, high-risk unlock policy, replay-window persistence after successful decrypt, pairwise endpoint state, local message indexes, opaque record-id derivation, and internal raw database-key opening only.
- A read-only Tauri prototype status shell exposing only release-claim, messaging-surface, profile, pairing, transport, and storage boundary state through `prototype_status`.
- Tauri verification status boundary that exposes lightweight-check status without adding production commands or readiness claims.
- Tauri scaffold verifier cleanup that keeps status field and static copy checks aligned without adding build cost.
- Lightweight verification scripts, release-hygiene and Tauri-scaffold static verifiers, CLI hardening tests, and GitHub Actions verification.
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

The default build exposes only a local production-boundary self-test. It checks setup, envelope encryption/decryption, replay rejection, tampered ciphertext rejection, replay-state non-advance after tamper in memory, and high-risk transport policy/fail-closed behavior. It does not send messages, persist keys, bootstrap transport, or create a secure messenger release:

```bash
cargo run -q -- production self-test
```

Manual Arti bootstrap spike, local only:

```bash
cargo run -q --features arti-manual-bootstrap -- \
  transport bootstrap \
  --profile alice \
  --app-data-root /absolute/app-private/root
```

Without `--execute-network`, this command exercises only the disabled gate and records a redacted `RuntimeNetworkDisabled` event. With `--execute-network`, it may attempt a real Arti bootstrap, still without send/receive, onion hosting, or usable messaging. The lower-level transport crate now has a persistent client owner boundary, but the CLI command remains a local manual bootstrap spike rather than a messenger runtime.

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

## License

This repository is currently marked `UNLICENSED` in the Rust workspace metadata.

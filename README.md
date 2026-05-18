# Another Dimension Chat

Another Dimension Chat is an early Rust prototype for a high-risk 1:1 messenger architecture.

The project goal is not "a serverless chat app" in the loose sense. The long-term goal is a no-central-trusted-server messenger that avoids phone-number identity, global accounts, centralized contact discovery, centralized push notifications, and default direct P2P transport in high-risk mode.

## Current Status

This repository is a prototype scaffold.

Do not use it for real communication.

The current implementation is intentionally limited to a `dev-insecure` CLI flow that helps test protocol boundaries, pairing lifecycle, message envelope handling, replay behavior, and local storage invariants before any production security claim.

What exists today:

- Rust workspace split into `identity`, `pairing`, `crypto`, `protocol`, `transport`, `storage`, and `core` crates.
- CLI prototype under `apps/cli`.
- Pairwise profile and contact model.
- In-person style pairing payload flow.
- Safety number and safety phrase prototype.
- Pairing confirm, cancel, and expiry lifecycle.
- Production-facing Ed25519 key generation, pairing draft, signature, nonce, and safety material boundaries.
- Padded message envelope prototype.
- Replay window prototype.
- CLI hardening tests for malformed input, duplicate pairing scans, replay handling, message expiry, and prototype boundary behavior.
- Local smoke test scripts.
- GitHub Actions verification workflow.

What does not exist yet:

- Real end-to-end encryption.
- Production session establishment.
- Real Tor/onion transport.
- Production encrypted local storage.
- Tauri desktop app.
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

crates/
  core/             profile, pairing, and message orchestration
  crypto/           prototype crypto boundary
  identity/         pairwise identity and contact types
  pairing/          pairing payload and safety transcript logic
  protocol/         message envelope and replay window logic
  storage/          development storage boundary
  transport/        development transport boundary

scripts/
  smoke_dev_cli.sh  Alice/Bob CLI smoke flow
  verify_all.sh     canonical local verification entrypoint
```

Private planning and security notes live outside the public repository scope and are ignored under `docs/`.

## Requirements

- Rust stable toolchain.
- `rustfmt` and `clippy` components.

Install the components if needed:

```bash
rustup component add rustfmt clippy
```

## Verify

Run the full local verification suite:

```bash
scripts/verify_all.sh
```

This runs:

- CLI smoke flow.
- `cargo fmt --all -- --check`
- `cargo test --workspace`
- `cargo test --workspace --features dev-insecure`
- `cargo clippy --workspace --all-targets --all-features`

## CLI Prototype

The CLI commands require the `dev-insecure` feature.

The default build exposes only a local production-boundary self-test. It checks setup, envelope encryption/decryption, and replay rejection in memory. It does not send messages, persist keys, or create a secure messenger release:

```bash
cargo run -q -- production self-test
```

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
- Do not commit local dev data, pairing payloads, logs, generated artifacts, or private planning notes.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the public development roadmap.

Phase 2 crypto planning is tracked in [CRYPTO_DECISION.md](CRYPTO_DECISION.md). That document is not a security claim; it is the decision boundary that must be resolved before placeholder crypto is replaced.

The first identity signature dependency decision is tracked in [SIGNATURE_DECISION.md](SIGNATURE_DECISION.md).

The first production pairing nonce randomness boundary is tracked in [RANDOMNESS_DECISION.md](RANDOMNESS_DECISION.md).

The first production safety material display boundary is tracked in [SAFETY_MATERIAL_DECISION.md](SAFETY_MATERIAL_DECISION.md).

The first production session establishment boundary is tracked in [SESSION_DECISION.md](SESSION_DECISION.md).

## License

This repository is currently marked `UNLICENSED` in the Rust workspace metadata.

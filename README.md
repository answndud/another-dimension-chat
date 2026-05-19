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
- Production setup, in-memory Noise transport, envelope encryption/decryption, replay rejection, and storage policy boundaries for tests.
- Transport policy boundary that makes high-risk mode onion-only by default and rejects direct peer routes unless explicitly low-risk.
- Fail-closed onion transport adapter skeleton with no real network behavior.
- Arti-first Tor lifecycle decision with C Tor fallback and no system Tor default.
- Optional compile-only `arti-adapter-spike` feature that keeps transport fail-closed.
- Arti lifecycle decision that rejects shared default Arti dirs and defers onion service key generation.
- App-private Arti config builder spike that validates state/cache dirs without bootstrapping Tor.
- Arti bootstrap preflight boundary that keeps runtime network and onion key generation disabled.
- Transport runtime error taxonomy for future bootstrap, bridge, preflight, send/receive, and onion launch failures.
- Transport runtime preflight skeleton with runtime network disabled by default.
- Transport runtime state skeleton that can become ready only after preflight succeeds.
- Onion transport skeleton now stores runtime state while keeping send/receive fail-closed.
- Transport runtime skeleton closeout documenting the remaining gates before network-capable Arti work.
- Runtime permission and redaction preflight boundary for app-private dirs, backup exclusion, log/crash redaction, and censorship readiness.
- Runtime state/cache directory probe skeleton with redacted permission failures and no Tor bootstrap.
- Backup exclusion verification boundary that checks macOS backup-exclusion metadata and fails closed on unsupported platforms.
- Onion service key lifecycle decision boundary that permits only SQLCipher-wrapped, profile-unlocked key material after backup exclusion verification.
- Onion service key material adapter boundary that requires profile unlock, lifecycle readiness, and SQLCipher-wrapped key record readiness before launch preflight.
- Onion service launch preflight boundary that requires profile unlock, key readiness, persistent client readiness, endpoint publication/update policy, and redacted events before any future launch.
- Onion service descriptor publication boundary that accepts only pairwise rendezvous publication policy and still fails closed without publishing descriptors.
- Onion inbound stream boundary that requires descriptor-publication readiness and still fails closed for accept/read/write.
- Onion outbound stream/send boundary that requires a pairwise rendezvous endpoint and onion transport policy while still failing closed for dial/send.
- Stream peer/session binding boundary that requires a verified pairwise encrypted session before stream I/O can approach envelope send/receive, while still failing closed.
- Envelope I/O adapter boundary that requires explicit I/O readiness after bound stream/session state and still fails closed for envelope receive/send.
- Remote peer authentication boundary that requires an authenticated pairwise peer proof before bound stream/session state can be created.
- Post-auth stream readiness ordering boundary that fixes the typed order from stream/auth/session binding to envelope I/O while still failing closed.
- Network-capable experiment gate proposal that permits only manual, feature-gated, bootstrap-only experiments with isolated heavy verification.
- Bootstrap-only experiment decision boundary that treats the existing manual bootstrap/lifecycle smoke path as the only allowed network-capable experiment.
- Transport phase closeout boundary that selects onion hosting gate work before stream I/O, envelope I/O, or any usable messaging claim.
- Onion hosting gate boundary that requires transport closeout, manual feature gating, launch preflight, onion key readiness, and a bootstrapped persistent client while still forbidding descriptor publication and stream I/O.
- Descriptor publication gate boundary that requires onion hosting readiness, pairwise rendezvous-only publication policy, and redacted events while still forbidding stream I/O and usable messaging.
- Descriptor publication fail-closed adapter boundary that requires descriptor publication gate readiness and records only a redacted event before returning a not-implemented error.
- Inbound stream gate boundary that requires descriptor publication gate and adapter readiness while still forbidding accept, read/write, envelope I/O, and usable messaging.
- Pairwise endpoint lifecycle boundary that rejects global or identity-key-derived rendezvous endpoints and allows endpoint updates only through an existing encrypted session.
- Encrypted endpoint update control-envelope boundary that pads endpoint rotation plaintext before Noise encryption and wraps only opaque control ciphertext after a validated pairwise update.
- Production envelope session hook for endpoint update control encryption/decryption without Tor delivery or onion hosting.
- SQLCipher-backed pairwise rendezvous endpoint state persistence boundary with session/contact-scoped opaque record ids.
- Fail-closed onion service launch adapter skeleton gated by launch preflight readiness and a bootstrapped persistent Arti client owner.
- Endpoint rotation apply/reconnect boundary that stages verified updates, rejects stale or rollback updates, and keeps reconnect fail-closed.
- Bridge/censorship configuration decision boundary that rejects raw bridge lines and accepts only explicit no-bridge or redacted bridge-config readiness.
- Redacted transport runtime event boundary for logs/crash contexts without raw paths, endpoints, contact ids, profile names, plaintext, or key material.
- Runtime event sink boundary that accepts only redacted transport events.
- Arti bootstrap timeout/retry/cancellation policy boundary without opening network connections.
- Arti bootstrap execution skeleton that requires runtime readiness, bounded bootstrap policy, and redacted event sink while still failing closed.
- Bounded Arti bootstrap adapter spike that binds app-private config, runtime readiness, bounded policy, and redacted event reporting while still failing closed.
- Manual Arti bootstrap attempt gate behind an explicit feature/API, disabled by default and still separate from send/receive or onion hosting.
- Local-only manual bootstrap CLI gate that requires explicit app-private dirs and `--execute-network` before attempting network bootstrap.
- Profile-scoped transport directory resolver for app-private Arti state/cache directories, with redacted CLI output.
- Persistent Arti client lifecycle owner boundary with unbootstrapped, bootstrapping, bootstrapped, dormant, and shutdown states.
- Local-only manual lifecycle bootstrap CLI gate that smoke-tests persistent owner state without send/receive or onion hosting.
- Pre-network transport closeout boundary that blocks network execution until backup exclusion, onion service key lifecycle, and bridge/censorship decisions are cleared.
- SQLCipher-backed `ADREC1` storage spike with test-only key construction.
- Passphrase unlock boundary tests for SQLCipher storage.
- High-risk unlock policy tests that reject OS-keystore-only unlock.
- First durable replay-window record wiring through SQLCipher storage.
- Core receive boundary that saves replay state only after successful decrypt.
- Session-scoped opaque replay record id derivation for the production receive boundary.
- Padded message envelope prototype.
- Replay window prototype.
- CLI hardening tests for malformed input, duplicate pairing scans, replay handling, message expiry, and prototype boundary behavior.
- Local smoke test scripts.
- GitHub Actions verification workflow.

What does not exist yet:

- Real end-to-end encryption.
- Usable production messaging.
- Real Tor/onion transport.
- Production transport adapter implementation.
- Bridge or censorship-circumvention implementation.
- Actual onion service private key material.
- Production unlock/key management.
- OS keychain/DPAPI/Keystore wrapping.
- Production encrypted local storage lifecycle.
- Replay rollback protection against encrypted database snapshot restore.
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
  storage/          development storage and production policy boundary
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

Run the lightweight local verification suite:

```bash
scripts/verify_all.sh
```

This runs:

- `cargo fmt --all -- --check`
- `cargo test --workspace --lib`

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

The default build exposes only a local production-boundary self-test. It checks setup, envelope encryption/decryption, and replay rejection in memory. It does not send messages, persist keys, or create a secure messenger release:

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

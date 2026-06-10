# Another Dimension Chat

Another Dimension Chat is an early Rust prototype for a high-risk 1:1 messenger architecture.

The project goal is not "a serverless chat app" in the loose sense. The long-term goal is a no-central-trusted-server messenger that avoids phone-number identity, global accounts, centralized contact discovery, centralized push notifications, and default direct P2P transport in high-risk mode.

## Current Status

This repository is a prototype moving toward a local desktop beta.

Do not use it for real communication.

The current implementation has a local Tauri desktop beta candidate for two-profile invite rooms, local encrypted profile/session/message stores, explicit private-delivery setup, restart/resume recovery, and fail-closed onion/Tor attempt paths. It still exists to test protocol, storage, transport, and UI recovery boundaries before any production security claim.

The current internal field-test handoff record, if the ignored local artifact directory is present, is:

- Transfer bundle: `apps/desktop-tauri/beta-artifacts/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-field-test-handoff.zip`
- Transfer bundle SHA-256: `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907`
- App DMG SHA-256 inside the bundle: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Build channel and commit reported by field-test UI: `beta-onion`, `806ecad1`

This handoff is not a public release, not signed or notarized, not audited, and not suitable for sensitive communication. The ignored `beta-artifacts/` directory is local-only and must not be committed.

The current unsigned public beta release path repackages the local DMG into a GitHub Release upload set. It is still an unsigned experimental public beta, not notarized, not audited, not production-ready, and sensitive communication prohibited. External two-machine onion delivery has not been independently verified; same-machine dual-profile rehearsal is development evidence only. The public review packet is included as reviewer input, and the independent-review gap remains explicit.

Published unsigned public beta:

- Release: <https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>
- DMG: <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg>
- Checksum: <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256>
- Expected SHA-256: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`

Release/source boundary: the published DMG, checksum, provenance, and install
documents are the assets attached to the GitHub Release above. The `main`
branch may contain later documentation or source changes, so do not verify a
download against branch files copied from GitHub's source browser. Always use
the `.sha256` file attached to the same release as the DMG.

Download the DMG and `.sha256` from the same release, then verify before opening:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected public GitHub Release files:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json`
- `INSTALL_UNSIGNED_MACOS.md`
- `RELEASE_NOTES.md`
- `GITHUB_RELEASE_BODY.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_INVENTORY.md`
- `PUBLIC_THREAT_MODEL.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `MANIFEST.md`

Prepare the ignored local upload folder from the frozen local DMG:

```bash
scripts/prepare_unsigned_public_beta_release.sh
```

The command writes to `apps/desktop-tauri/public-release/unsigned-public-beta/`, which is ignored and must not be committed. It regenerates public provenance for the public DMG file name, records the source provenance SHA-256, and fails if the expected checksum, GitHub Release body non-claims, update-integrity note, supply-chain baseline, dependency inventory, dependency lockfile hash evidence, public threat model, independent review packet, public intake policy, repository governance guardrails, and explicit review-gap evidence are missing. Public users must verify the `.sha256` file before using the normal macOS Privacy & Security manual allow path. Updates are manual GitHub Release downloads only; there is no auto-update channel.

What exists today:

- Rust workspace split into `identity`, `pairing`, `crypto`, `protocol`, `transport`, `storage`, and `core` crates, plus CLI and Tauri desktop prototype shells.
- A `dev-insecure` CLI flow for local pairing and message-flow experimentation only.
- Pairwise profile/contact, pairing payload, safety number, pairing lifecycle, padded envelope, replay-window, endpoint update, and deterministic duplicate-connection prototypes.
- Production-facing guardrails for Ed25519 pairwise identity material, signed pairing drafts, Noise-based session setup smoke tests, envelope encryption/decryption, replay rejection, and local storage policy checks.
- High-risk transport policy and fail-closed Tor/onion scaffolding, including direct-route rejection, app-private directory checks, runtime preflight, redacted runtime events, bridge/censorship configuration boundaries, onion key lifecycle policy, and descriptor/stream/envelope-I/O gates.
- SQLCipher-backed storage spikes for `ADREC1` record containers, passphrase unlock, high-risk unlock policy, replay-window persistence, pairwise endpoint state, local message indexes, opaque record-id derivation, and internal raw database-key opening only.
- A local SQLCipher-backed production session lifecycle path for pairing draft, remote endpoint state, replay window, Noise transport state, restart/resume readiness checks, and explicit session lifecycle deletion without wiping message records.
- A manual local runtime messaging gate for explicit passphrase-first envelope
  export/import flows. This enables local encrypted envelope preparation,
  import, transcript, retry, and cancel semantics only after user action; it
  does not enable automatic messaging, network send/receive, or a security-ready
  messenger claim.
- A local manual E2EE runtime failure-model gate for the explicit envelope path:
  Noise XX transport state is required, remote static verification is required,
  channel/message-number/nonce binding is fixed, replay state is committed only
  after decrypt, and tamper failure must not advance receive state. This is still
  not an audited or production-ready E2EE claim.
- Local data lifecycle controls for conversation message-record deletion, profile-store deletion, owned local app-data wipe, backup-exclusion preparation, local backup-exclusion verification boundaries, forward-only schema versioning, destructive-migration blocking, and marker-only rollback detection. These controls do not provide cloud backup/sync, backup recovery, secure deletion from media, or rollback prevention.
- A v0.1 key and rollback boundary decision: passphrase-first remains required,
  OS keystore or Secure Enclave style wrapping is optional and not required,
  OS-keystore-only unlock is rejected, app key wrapping is not claimed, and
  rollback prevention is not claimed without an external monotonic-state design.
- An explicit transport envelope I/O boundary for high-risk onion-only routing:
  network work still requires user action, direct fallback is rejected, send and
  receive adapters remain fail-closed, envelope I/O context is redacted, and
  external two-machine onion delivery is still not claimed.
- Manual update integrity evidence for the unsigned public beta release path: DMG `.sha256`, public provenance JSON, release manifest, update-integrity policy, supply-chain baseline note, and dependency lockfile SHA-256 list.
- Public threat model and independent review packet that state allowed claims, non-claims, known gaps, public-safe review commands, and the current no-signoff/no-completed-review gap.
- Public intake policy and GitHub issue templates that require redacted public diagnostics or minimal private-contact requests instead of raw logs, payloads, endpoints, paths, passphrases, private keys, key material, crash dumps, or private planning notes.
- Repository governance guardrails for maintainer-driven main-branch work, unsigned beta non-claims, no-central-trusted-server scope, release file discipline, and private-data redaction.
- A local Tauri desktop beta shell for invite-code rooms, safety phrase confirmation, encrypted local profile/session/message records, saved-room resume, manual private-route exchange, explicit receive start/stop, retry/cancel recovery, and redacted field-test reports.
- In-app unsigned public beta warnings and public diagnostics export limited to status, build, failure class, manual network permission, and app-launch network boundary; no crash upload, telemetry, raw log export, paths, endpoints, passphrases, or key material.
- Explicit user-triggered onion/Tor attempt paths for beta field testing. The app must not bootstrap Tor, host onion services, publish descriptors, open streams, send envelopes, or receive envelopes on app launch.
- Lightweight verification scripts, CLI hardening tests, Tauri scaffold static checks, and GitHub Actions verification.
- Local beta DMG handoff is possible from the Tauri app directory, but signing, notarization, reproducible/equivalent builds, dependency review, external review, signoff, and auto-update integrity are not implemented.

What does not exist yet:

- Audited or security-ready production end-to-end encryption. The local manual
  envelope runtime has a reviewed session/key/replay failure-model gate, but it
  is not an external audit, production security claim, or sensitive-communication
  guarantee.
- Secure production messaging suitable for sensitive communication.
- Reliable Tor/onion transport across real networks.
- Completed external two-machine onion delivery evidence.
- Audited production transport adapter implementation.
- Audited bridge or censorship-circumvention support.
- Actual onion service private key material.
- Complete production key management. The desktop shell now has a passphrase-first product unlock/lock state, local durable session lifecycle records, local data lifecycle controls, and a v0.1 key/rollback boundary decision, but it does not claim app key wrapping, secure deletion from media, rollback prevention, audited E2EE readiness, or automatic/network runtime messaging readiness.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle with cloud backup/sync, backup recovery, or secure deletion guarantees.
- Replay rollback prevention against encrypted database snapshot restore.
- Production Tauri desktop app. The current Tauri shell is a local beta candidate, not a secure release.
- Android or iOS app.
- Offline mailbox.
- Group chat.
- File transfer.
- Voice or video calls.
- Multi-device support.
- Release signing, notarization, auto-update integrity, or reproducible builds.
- Dependency/supply-chain audit or SBOM evidence.
- Completed external security review, independent review result, reviewer signoff, or user safety signoff.

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
  desktop-tauri/    local desktop beta shell and field-test UI

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
  verify_full.sh    heavier pre-release/audit verification
  verify_tauri_scaffold.sh

reference/
  public-safe roadmap, decision, runbook, and boundary notes
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
- Selected core and Tauri library tests for the current production room, storage, and resume slices.
- Fast Tauri action/i18n/UI state tests.
- Tauri frontend build.
- Default build boundary checks that keep `dev-insecure` out of default feature sets and verify the default CLI exposes only boundary commands.
- Default CLI hardening rejects production skeleton commands for profile, pairing, messaging, storage unlock, transport bootstrap, and transport send/receive unless a later phase explicitly opens them.
- Production skeleton preflight summary aggregates current crypto/session, transport, storage, and command-surface blockers without exposing production messaging.
- Session lifecycle records now persist pairing draft, endpoint state, replay window, and Noise transport state in the local encrypted profile store, with status/delete commands that do not return channel ids, paths, passphrases, endpoints, payloads, or key material.
- Session lifecycle delete closes restart/resume and message-envelope readiness for the active session while preserving message records for the later data-lifecycle phase.
- Data lifecycle commands delete conversation records, profile store files, and owned local app data without returning paths, passphrases, plaintext, or key material; cloud backup/sync, backup recovery, and secure deletion from media remain false.
- SQLCipher stores now apply a forward-only `user_version` migration boundary and reject future schema versions instead of silently downgrading or destructively rewriting data; destructive migration remains blocked.
- Rollback detection is marker-only and still requires external monotonic state before any rollback-prevention claim; the current boundary does not claim rollback prevention.
- Desktop product unlock opens the local encrypted profile store through a passphrase-first command, then records only redacted unlocked/locked metadata with explicit lock and 60-second idle auto-lock.
- Session unlock policy keeps OS-keystore-only unlock rejected for high-risk mode and does not use Apple keychain, Secure Enclave, DPAPI, Keystore, or cloud key wrapping in v0.1.
- Key/rollback policy is closed for v0.1 as a non-claim boundary: passphrase-first is required, OS wrapping is optional/non-required, app key wrapping is not ready, rollback prevention is not claimed, and external monotonic state is required before any future rollback-prevention claim.
- Transport envelope I/O policy is closed for v0.1 as a non-claim boundary:
  high-risk routing is onion-only, direct fallback is rejected, network work is
  never automatic on launch, and send/receive remains fail-closed until real
  external evidence exists.
- Session unlock/lock UX exposes redacted wrong-passphrase/locked states without returning raw storage errors, local paths, identifiers, passphrase detail, or key material.
- Session unlock redacted error taxonomy classifies disabled, passphrase-required, and OS-keystore-only rejected states without exposing raw storage errors, OS keychain errors, paths, identifiers, key material, or passphrase detail.
- Default CLI `production unlock` is a fail-closed boundary command that returns the redacted disabled taxonomy without opening storage, writing session records, exposing key material, or enabling automatic runtime messaging.
- Tauri prototype status separates the still-disabled CLI production unlock from the desktop product unlock command, which opens storage only after explicit user passphrase input. Manual local runtime messaging is limited to explicit envelope export/import flows and still does not claim network send/receive, external onion delivery, audited E2EE readiness, or secure production messaging.
- Tauri scaffold static checks.

For a heavier pre-release, audit, or risky cross-cutting change pass, run:

```bash
scripts/verify_full.sh
```

This additionally runs:

- Tauri browser preview peer tests.
- Tauri GUI-less local peer flow preflight.
- CLI smoke flow.
- `cargo test --workspace`
- `cargo test --workspace --features dev-insecure`
- `cargo clippy --workspace --all-targets --all-features`

## Local Beta Release Prep

The current beta release target has two separate paths:

- Internal field-test handoff under ignored `apps/desktop-tauri/beta-artifacts/`.
- Unsigned public experimental GitHub Release staging under ignored `apps/desktop-tauri/public-release/`.

Neither path is a public secure messenger release.

Before handing a beta artifact to a tester:

1. Run `scripts/verify_all.sh`.
2. From `apps/desktop-tauri`, run `npm run test:state`.
3. From `apps/desktop-tauri`, run `npm run test:local-peers`.
4. Build the desired local artifact:
   - `npm run tauri:build`
   - `npm run tauri:build:beta-onion`
   - `npm run tauri:build:beta-onion-bridge`
5. Copy local handoff artifacts into `apps/desktop-tauri/beta-artifacts/`.
6. Record the artifact name, SHA-256, build channel, commit, date, and field-test scope in the handoff notes.

To stage the current unsigned public GitHub Release upload set from the local ignored DMG, run:

```bash
scripts/prepare_unsigned_public_beta_release.sh
```

Upload only the generated public release files from `apps/desktop-tauri/public-release/unsigned-public-beta/`. Use `GITHUB_RELEASE_BODY.md` as the GitHub Release body. The public release body, notes, install guide, manifest, and provenance must keep the unsigned experimental beta warning, sensitive communication prohibition, not audited status, not production-ready status, external two-machine onion delivery non-claim, backup/migration non-claims, and public diagnostics redaction boundary. Users must treat every update as a fresh manual download and verify the matching `.sha256` file.

For the current local field-test handoff, send only the per-peer delivery folder contents from:

- `apps/desktop-tauri/beta-artifacts/peer-delivery-a/`
- `apps/desktop-tauri/beta-artifacts/peer-delivery-b/`

Each folder should contain the transfer zip, matching `.sha256`, `PEER_HANDOFF_MESSAGE.md`, and `MANIFEST.md`. The peer-side preflight verifier must be run from the extracted `another-dimension-beta-handoff` folder. It checks bundle contents without launching the app or starting network/onion work.

Do not publish `docs/`, app data, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw logs, crash dumps, screenshots of private room data, `target/`, `dist/`, `node_modules/`, or `beta-artifacts/`. Use the public issue templates for redacted support reports and use private vulnerability reporting for sensitive security details when available.

For desktop-specific commands and beta notes, see [apps/desktop-tauri/README.md](apps/desktop-tauri/README.md).
For the public-safe beta handoff checklist, see [reference/BETA_RELEASE_CHECKLIST.md](reference/BETA_RELEASE_CHECKLIST.md).
For public review scope, see [reference/PUBLIC_THREAT_MODEL.md](reference/PUBLIC_THREAT_MODEL.md), [reference/INDEPENDENT_REVIEW_PACKET.md](reference/INDEPENDENT_REVIEW_PACKET.md), [reference/PUBLIC_INTAKE_POLICY.md](reference/PUBLIC_INTAKE_POLICY.md), and [reference/REPOSITORY_GOVERNANCE.md](reference/REPOSITORY_GOVERNANCE.md).

## CLI Prototype

The CLI commands require the `dev-insecure` feature.

The default build exposes only a local production-boundary self-test. Here, "production" means the default non-`dev-insecure` build boundary, not deployable security. It checks setup, envelope encryption/decryption, replay rejection, tampered ciphertext rejection, replay-state non-advance after tamper in memory, and high-risk transport policy/fail-closed behavior. It does not send messages, persist keys, bootstrap transport, perform network I/O, unlock local storage, or create a secure messenger release:

```bash
cargo run -q -- production self-test
```

The self-test prints a redacted production-session summary for the current `snow` Noise XX synchronous evaluation boundary. It is a CLI boundary check and does not claim audited E2EE readiness, automatic transport, or usable async messaging.

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

Before using `--execute-network`, follow [TRANSPORT_EXPERIMENT_RUNBOOK.md](reference/TRANSPORT_EXPERIMENT_RUNBOOK.md). Manual network experiments require an isolated temporary `CARGO_TARGET_DIR`, an isolated app-private data root or explicit Arti state/cache root, cleanup of generated artifacts, and preservation of the no hosting/stream/envelope/messaging boundary.

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

See [ROADMAP.md](reference/ROADMAP.md) for the public development roadmap.

Phase 2 crypto planning is tracked in [CRYPTO_DECISION.md](reference/CRYPTO_DECISION.md). That document is not a security claim; it is the decision boundary that must be resolved before placeholder crypto is replaced.

The first identity signature dependency decision is tracked in [SIGNATURE_DECISION.md](reference/SIGNATURE_DECISION.md).

The first production pairing nonce randomness boundary is tracked in [RANDOMNESS_DECISION.md](reference/RANDOMNESS_DECISION.md).

The first production safety material display boundary is tracked in [SAFETY_MATERIAL_DECISION.md](reference/SAFETY_MATERIAL_DECISION.md).

The first production session establishment boundary is tracked in [SESSION_DECISION.md](reference/SESSION_DECISION.md).

The first production storage policy boundary is tracked in [STORAGE_DECISION.md](reference/STORAGE_DECISION.md).

The cross-component replacement inventory is tracked in [COMPONENT_BOUNDARIES.md](reference/COMPONENT_BOUNDARIES.md). It maps the current `dev-insecure` local loop and guardrail spikes to the crypto, transport, storage, Tauri runtime, and release boundaries that must be resolved before any security-ready claim.

## License

This repository is currently marked `UNLICENSED` in the Rust workspace metadata.

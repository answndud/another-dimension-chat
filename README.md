# Another Dimension Chat

Another Dimension Chat is an early Rust prototype for a high-risk 1:1 messenger architecture.

The project goal is not "a serverless chat app" in the loose sense. The long-term goal is a no-central-trusted-server messenger that avoids phone-number identity, global accounts, centralized contact discovery, centralized push notifications, central message servers, and default direct P2P transport in high-risk mode. The current practical default transport path is explicit user-mediated encrypted envelope exchange; advanced onion/Tor work remains an opt-in, fail-closed, user-triggered path.

## Current Status

This repository is a prototype moving toward a local desktop beta.

For the v0.1 unsigned public beta, the product surface is the desktop Tauri
beta shell. Android is the next mobile client candidate only after the shared
Rust core/API boundary remains platform-neutral; iOS follows after that same
boundary is preserved. Mobile clients are not part of this public beta.
The Android candidate is a thin Kotlin shell over UniFFI or another narrow FFI
boundary into the shared Rust core. It must not define independent protocol,
storage, transport, pairing, or contact-discovery semantics.
The later iOS candidate follows the same shape as a thin Swift shell over
UniFFI or another narrow FFI boundary into the shared Rust core; iOS-specific
distribution constraints are product constraints, not security claims.
The public beta artifact is currently the unsigned macOS DMG path. Windows is a
local desktop build candidate only: it must use the same Tauri app-data
resolver, encrypted local store, local deletion controls, redacted diagnostics,
explicit user-action boundary, no auto-update channel, and no
signing/notarization/app-store trust claim before it becomes a public artifact.

The shared core boundary means Rust owns profile identity, pairing payload and
safety transcript logic, message orchestration, protocol envelopes and replay,
encrypted local storage policy, and fail-closed transport policy. UI shells may
request redacted status and explicit user-triggered actions only; they must not
define separate security-sensitive protocol, storage, transport, pairing, or
contact-discovery behavior.

This split does not add phone numbers, email, global accounts, searchable
usernames, centralized contact discovery, centralized message servers, push
notifications, cloud backup, app-store/TestFlight dependency, signing
dependency, notarization dependency, or a production/security readiness claim.
It also does not make Windows DPAPI, Apple notarization, Developer ID, or any
store approval a trusted security boundary.
For Android, it also does not make Google accounts, Play Services, Firebase
Cloud Messaging, Play Store distribution, Android Keystore-only unlock, or cloud
backup a required trust dependency.
For iOS, it also does not make Apple accounts, iCloud, APNs, App Store or
TestFlight distribution, Developer ID, notarization, iOS Keychain-only unlock,
or iCloud backup a required trust dependency.

Do not use it for real communication.

The current implementation has a local Tauri desktop beta candidate for two-profile invite rooms, local encrypted profile/session/message stores, explicit user-mediated private-delivery setup, restart/resume recovery, and fail-closed onion/Tor attempt paths. It still exists to test protocol, storage, transport, and UI recovery boundaries before any production security claim.

The current internal field-test handoff record, if the ignored local artifact directory is present, is:

- Transfer bundle: `apps/desktop-tauri/beta-artifacts/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-field-test-handoff.zip`
- Transfer bundle SHA-256: `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907`
- App DMG SHA-256 inside the bundle: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Build channel and commit reported by field-test UI: `beta-onion`, `806ecad1`

This handoff is not a public release, not signed or notarized, not audited, and not suitable for sensitive communication. The ignored `beta-artifacts/` directory is local-only and must not be committed.

The current unsigned public beta release path repackages the local DMG into a GitHub Release upload set. It is still an unsigned experimental public beta, not notarized, not audited, not production-ready, and sensitive communication prohibited. External two-machine onion delivery has not been independently verified; same-machine dual-profile rehearsal is development evidence only. This external evidence gap is accepted for unsigned public beta release gating only; it does not close Phase AZ, final security-ready acceptance, or any external delivery claim. The public review packet is included as reviewer input, and the independent-review gap remains explicit.

Published unsigned public beta:

- Release: <https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>
- DMG: <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg>
- Checksum: <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256>
- Expected SHA-256: `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`

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
- `PRIVACY_MODEL_COMPARISON.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `MANIFEST.md`

Prepare the ignored local upload folder from the frozen local DMG:

```bash
scripts/prepare_unsigned_public_beta_release.sh
```

The command writes to `apps/desktop-tauri/public-release/unsigned-public-beta/`, which is ignored and must not be committed. It regenerates public provenance for the public DMG file name, records the source provenance SHA-256, records the same-GitHub-Release-assets authority, rejects branch/source archive release authority for DMG verification, and fails if the expected checksum, GitHub Release body non-claims, update-integrity note, supply-chain baseline, dependency inventory, dependency lockfile hash evidence, public threat model, privacy model comparison, independent review packet, public intake policy, repository governance guardrails, explicit review-gap evidence, private-reporting boundary, and fabricated-review/peer-evidence-forbidden evidence are missing. The dependency evidence is exactly three lockfiles: `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`; it is not a live dependency scan, vulnerability triage signoff, SBOM, audit, or reproducible-build proof. Public users must verify the `.sha256` file before using the normal macOS Privacy & Security manual allow path. Updates are manual GitHub Release downloads only; there is no auto-update channel.

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
- Local data lifecycle controls for conversation message-record deletion, session
  resume-record deletion, profile-store deletion, owned local app-data wipe,
  backup-exclusion preparation, local backup-exclusion verification boundaries,
  forward-only schema versioning, destructive-migration blocking, and
  marker-only rollback detection. The product scope is explicit:
  conversation delete preserves session records, session delete preserves
  message records, profile delete removes the local profile store, and full wipe
  removes owned app data. These controls do not provide cloud backup/sync,
  backup recovery, secure deletion from media, or rollback prevention.
- A v0.1 key and rollback boundary decision: passphrase-first remains required,
  OS keystore or Secure Enclave style wrapping is optional and not required,
  OS-keystore-only unlock is rejected, app key wrapping is not claimed, and
  rollback prevention is not claimed without an external monotonic-state design.
- A practical transport split for v0.1: the default path is local manual
  encrypted envelope exchange with no network I/O, no automatic background
  delivery claim, no central message server, no push-notification dependency,
  and no central contact discovery. The advanced high-risk onion/Tor path stays
  onion-only, requires explicit user action, rejects direct fallback, keeps send
  and receive adapters fail-closed, redacts envelope I/O context, and does not
  claim external two-machine onion delivery.
- Manual update integrity evidence for the unsigned public beta release path: DMG `.sha256`, public provenance JSON, release manifest, update-integrity policy, supply-chain baseline note, dependency inventory, and a three-lockfile SHA-256 list for `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`.
- Public threat model and independent review packet that state allowed claims, non-claims, known gaps, public-safe review commands, private-reporting boundary, and the current no-reviewer-signoff/no-public-user-safety-signoff/no-completed-review gap.
- Public intake policy and GitHub issue templates that require redacted public diagnostics or minimal private-contact requests instead of raw logs, payloads, endpoints, paths, passphrases, private keys, key material, crash dumps, or private planning notes.
- Repository governance guardrails for maintainer-driven main-branch work, unsigned beta non-claims, no-central-trusted-server scope, release file discipline, and private-data redaction.
- A local Tauri desktop beta shell for invite-code rooms, safety phrase confirmation, encrypted local profile/session/message records, saved-room resume, manual private-delivery exchange UI, explicit receive start/stop, retry/cancel recovery, and redacted field-test reports.
- A desktop platform boundary for macOS and Windows: macOS public beta remains
  an unsigned experimental DMG, Windows remains a local build candidate, and
  both desktop shells must preserve the same local app-data, encrypted-store,
  local deletion, redacted diagnostics, explicit action, no auto-update, and
  non-security-signing semantics.
- An Android shell candidate boundary: Android is next after desktop, using a
  Kotlin shell with UniFFI or a narrow FFI shared-core boundary, passphrase
  unlock UI, local storage explanation, redacted diagnostics, explicit actions,
  and no Google-account, Play-Services, push-notification, cloud-backup,
  central-discovery, or wrapper-specific protocol dependency.
- An iOS shell candidate boundary: iOS follows Android using a Swift shell with
  UniFFI or a narrow FFI shared-core boundary, passphrase unlock UI, local
  storage explanation, redacted diagnostics, explicit actions, optional future
  Keychain wrapping only, and no Apple-account, iCloud, APNs, App Store,
  TestFlight, notarization, cloud-backup, or wrapper-specific protocol
  dependency.
- In-app unsigned public beta warnings and public diagnostics export limited to status, build, failure class, manual network permission, and app-launch network boundary; no crash upload, telemetry, raw log export, crash dump export, automated log collection, support bundle export, raw diagnostic file export, paths, endpoints, passphrases, or key material.
- Explicit user-triggered advanced onion/Tor attempt paths for beta field testing. The default practical delivery path is manual encrypted envelope exchange. The app must not bootstrap Tor, host onion services, publish descriptors, open streams, send envelopes, or receive envelopes on app launch.
- Lightweight verification scripts, CLI hardening tests, Tauri scaffold static checks, and GitHub Actions verification.
- Local beta DMG handoff is possible from the Tauri app directory, but signing, notarization, reproducible/equivalent builds, dependency review, external review, signoff, and auto-update integrity are not implemented.

What does not exist yet:

- Audited or security-ready production end-to-end encryption. The local manual
  envelope runtime has a reviewed session/key/replay failure-model gate, but it
  is not an external audit, production security claim, or sensitive-communication
  guarantee.
- Secure production messaging suitable for sensitive communication.
- Reliable Tor/onion transport across real networks.
- Automatic background delivery, central message server delivery,
  push-notification delivery dependency, or central contact discovery.
- Completed external two-machine onion delivery evidence.
- Audited production transport adapter implementation.
- Audited bridge or censorship-circumvention support.
- Actual onion service private key material.
- Complete production key management. The desktop shell now has a passphrase-first product unlock/lock state, local durable session lifecycle records, local data lifecycle controls, and a v0.1 key/rollback boundary decision, but it does not claim app key wrapping, secure deletion from media, rollback prevention, audited E2EE readiness, or automatic/network runtime messaging readiness.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle with cloud backup/sync,
  backup recovery, rollback prevention, or secure deletion guarantees.
- Replay rollback prevention against encrypted database snapshot restore.
- Production Tauri desktop app. The current Tauri shell is a local beta candidate, not a secure release.
- Public Windows installer or Windows public beta artifact. Windows is only a
  local build candidate until the desktop boundary is satisfied and documented
  for a release artifact.
- Android or iOS app. Android and iOS are shared-core shell candidates, not
  implemented mobile apps or mobile security claims.
- Offline mailbox.
- Group chat.
- File transfer.
- Voice or video calls.
- Multi-device support.
- Release signing, notarization, auto-update integrity, or reproducible builds.
- Dependency/supply-chain audit, live dependency scan, vulnerability triage signoff, or SBOM evidence.
- Completed external security review, independent review result, reviewer signoff, public user safety signoff, or fabricated external review/peer evidence.

## Security Boundary

This project does not currently provide a secure messenger.

The `dev-insecure` feature uses development-only placeholder behavior and prints:

```text
WARNING: dev-insecure build. Not for real communication.
```

Do not remove, hide, or weaken that warning while the prototype uses fake crypto, mock/file transport, or development storage.

The project also does not claim to be generally more secure than Signal. The intended research direction is narrower: reducing phone-number identity, centralized account infrastructure, centralized contact discovery, and transport metadata exposure under a specific threat model.

The Korean high-risk messenger direction is documented as a gap map, not a
current capability claim. The beta does not claim Briar/Cwtch equivalence,
audited E2EE readiness, repeated external onion evidence, offline mesh
delivery, independent review completion, or security-ready status.

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
  default practical transport is local manual encrypted envelope exchange, the
  advanced high-risk onion/Tor path is onion-only, direct fallback is rejected,
  network work is never automatic on launch, and advanced send/receive remains
  fail-closed until real external evidence exists.
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

Upload only the generated public release files from `apps/desktop-tauri/public-release/unsigned-public-beta/`. Use `GITHUB_RELEASE_BODY.md` as the GitHub Release body. The public release body, notes, install guide, manifest, provenance, and privacy model comparison must keep the unsigned experimental beta warning, sensitive communication prohibition, not audited status, not production-ready status, external two-machine onion delivery non-claim, Briar/Cwtch-equivalent non-claim, backup/migration non-claims, and public diagnostics redaction boundary. Users must treat every update as a fresh manual download and verify the matching `.sha256` file.

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

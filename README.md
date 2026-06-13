# Another Dimension Chat

[![Verify](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml/badge.svg)](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml)

Another Dimension Chat is an early Rust prototype for a high-risk 1:1 messenger architecture.

The project goal is not "a serverless chat app" in the loose sense. The long-term goal is a no-central-trusted-server messenger that avoids phone-number identity, global accounts, centralized contact discovery, centralized push notifications, central message servers, and default direct P2P transport in high-risk mode. The current practical default transport path is explicit user-mediated encrypted envelope exchange; advanced onion/Tor work remains an opt-in, fail-closed, user-triggered path.

## macOS Public Beta Quick Start

This is an unsigned experimental public beta for macOS Apple Silicon
(`aarch64`). It is not audited, not production-ready, and sensitive
communication prohibited. Do not use it for real communication.

1. Download the DMG from the GitHub Release:
   <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg>
2. Download the matching `.sha256` file from the same GitHub Release:
   <https://github.com/answndud/another-dimension-chat/releases/download/v0.1.0-beta-onion-unsigned/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256>
3. Verify the download before opening:

   ```bash
   shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
   ```

   Expected SHA-256:
   `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`
4. Open the DMG. If macOS blocks the unsigned app, use System Settings >
   Privacy & Security to allow it only after the checksum matches.
   For troubleshooting, use `INSTALL_UNSIGNED_MACOS.md` attached to the same
   GitHub Release; this repository keeps the source copy at
   `reference/UNSIGNED_PUBLIC_BETA_INSTALL.md`.
5. First run: use the app to test local profile unlock, invite room setup,
   manual encrypted envelope export/import, reply/retry/cancel, local deletion,
   and redacted diagnostics copy. This beta does not prove external onion
   delivery.
6. Feedback: public issues must include only redacted diagnostics, broad
   failure class, and recovery next action. Do not post invite codes, payloads,
   endpoints, message text, local paths, raw logs, passphrases, private keys, or
   key material. Maintainers should use
   [reference/PUBLIC_SUPPORT_TRIAGE.md](reference/PUBLIC_SUPPORT_TRIAGE.md) for
   public-safe routing and response snippets.
7. Screenshots: reviewed public-safe screenshots are in
   [reference/screenshots/README.md](reference/screenshots/README.md). Use the
   public-safe screenshot checklist before publishing any other app images, and
   do not post screenshots that show private room data. See
   [reference/PUBLIC_SCREENSHOT_CHECKLIST.md](reference/PUBLIC_SCREENSHOT_CHECKLIST.md).
8. Maintainer rehearsal: before directing public testers, use
   [reference/MACOS_FRESH_INSTALL_REHEARSAL.md](reference/MACOS_FRESH_INSTALL_REHEARSAL.md)
   for a fresh-install checklist that records only public-safe results. The
   current public-safe result record is
   [reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md](reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md).
9. Final source status: use
   [reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md](reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md)
   to report what is already public, what remains held, and the next work axis.

Release authority: use the files attached to the GitHub Release, not branch
files or source archives. The `main` branch may contain later documentation or
source changes after the published DMG.

Release page updates: artifact-free body edits are held unless the proposed
body matches the live release asset set and keeps the required non-claims. The
source policy is `reference/RELEASE_PAGE_UPDATE_POLICY.json`; the read-only
gate is `scripts/macos_release_page_update_gate_once.sh`. The gate never edits
the GitHub Release, uploads assets, rebuilds the DMG, or changes checksums.

### Local Data Lifecycle

The desktop beta has separate local destructive actions. Conversation delete
removes local message records while preserving session records. Session delete
removes local session resume records while preserving message records. Profile
delete requires the exact local profile name and removes that local profile
store. Full local wipe requires typing `WIPE LOCAL DATA` and removes app-owned
local data on this device. These controls do not provide cloud backup recovery,
cloud sync, rollback prevention, or secure deletion from storage media.

### Public Screenshots

The committed public screenshot set is source-side visual evidence for the
unsigned experimental public beta. It is not attached to the GitHub Release and
does not change the release asset authority. See
[reference/screenshots/README.md](reference/screenshots/README.md) for the
reviewed image list, capture mode, and private-data boundary.

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
Windows desktop readiness source audit status is local build candidate only:
there is no public Windows artifact, no Windows installer, no public artifact
upload, and no production-ready claim. Windows remains blocked on WebView2
runtime smoke, app-data path review, path separator review, redacted diagnostics
review, and explicit user action review; signing, Microsoft Store approval, and
SmartScreen reputation are distribution concerns, not a security boundary.

Windows local usable criteria are source-defined before artifact work: a local
Windows run must preserve WebView2 rendering, Tauri app-data storage roots,
encrypted profile stores, local deletion behavior, redacted diagnostics,
explicit user actions before network work, no auto-update, and the same
local-manual envelope default path. Windows public artifact prerequisites are
separate and still require an explicit release request, local runtime smoke on a
real Windows machine, packaging review, installer/signing decisions, checksum
provenance, and public upload hold review.

Windows local runtime smoke boundary is source-only until a real Windows machine
runs the local app. The source command is
`npm --prefix apps/desktop-tauri run test:windows-boundary`; it checks that the
required Windows smoke still covers WebView2 runtime smoke, app-data path review,
path separator review, local deletion behavior, redacted diagnostics behavior,
and explicit user action review. Passing this source command is not a Windows
local runtime smoke passed result, not a public Windows artifact, not a Windows
installer, not a public artifact upload, not production-ready, and sensitive
communication prohibited.

Windows desktop cross-platform parity intake is tracked in
`apps/desktop-tauri/windows_desktop_parity_intake.json`. It is a source-boundary
gap inventory only: WebView2 runtime smoke, Tauri app-data storage roots, path
separator behavior, encrypted-store parity, local deletion behavior, redacted
diagnostics, explicit user action review, no-auto-update parity, and the
local-manual envelope default path must be reviewed before any Windows public
artifact. The intake keeps Windows local build candidate only, no public Windows
artifact, no Windows installer, no public artifact upload, not audited,
not production-ready, and sensitive communication prohibited.

Windows local runtime smoke handoff is tracked in
`apps/desktop-tauri/windows_local_runtime_smoke_handoff.json`. It is a
source-boundary checklist for a future real Windows machine run of
`npm --prefix apps/desktop-tauri run test:windows-boundary`.
This handoff is not a Windows local runtime smoke passed claim.
Required checklist items are WebView2 runtime
smoke, Tauri app-data path review, path separator review, local deletion
behavior review, redacted diagnostics behavior review, explicit user action
before network review, local-manual envelope default path review, no auto-update
channel review, and public non-claim copy review. The handoff keeps no public
Windows artifact, no Windows installer, no public artifact upload,
not production-ready, and sensitive communication prohibited.

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

The current internal field-test handoff record, if the ignored local artifact directory is present, is separate from the public release packaging input:

- Transfer bundle: `apps/desktop-tauri/beta-artifacts/another-dimension-chat-0.1.0-beta-onion-macos-aarch64-field-test-handoff.zip`
- Transfer bundle SHA-256: `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907`
- App DMG SHA-256 inside the bundle: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Build channel and commit reported by field-test UI: `beta-onion`, `806ecad1`

This handoff is not a public release, not signed or notarized, not audited, and not suitable for sensitive communication. The ignored `beta-artifacts/` directory is local-only and must not be committed.

The current unsigned public beta release path repackages only the pinned public-release source DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`: build channel `beta-onion`, commit `e8954df9`, and SHA-256 `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`. It is still an unsigned experimental public beta, not notarized, not audited, not production-ready, and sensitive communication prohibited. External onion delivery is outside the v0.1 public product claim; same-machine dual-profile rehearsal is development evidence only. No peer report is expected or required for this v0.1 claim, and no external delivery claim is made. The public review packet is included as reviewer input, and the independent-review gap remains explicit.

macOS unsigned public beta source closure: the constrained source/maintainer
readiness target is 100% for the already public Apple Silicon unsigned DMG
path, with no DMG rebuild, no upload, no release body edit, and no generated
release artifact commit. This closure covers non-claims, redacted diagnostics,
release boundary, reviewed public screenshots, fresh-install result record,
public support triage, and desktop flow blocker checks. It is still not
production-ready, not audited, and sensitive communication prohibited. The next
development axis is the production-readiness track, starting with the
production readiness definition and claim gate.

Production readiness claim gate: beta and non-claim wording may not be removed
until [reference/PRODUCTION_READINESS_CLAIM_GATE.md](reference/PRODUCTION_READINESS_CLAIM_GATE.md)
is satisfied by the later stable release phases. Signing and notarization are
macOS distribution ergonomics, not a messenger security trust boundary.

Production protocol/session lifecycle review input is tracked in
[reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md](reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md).
It records the current 1:1 state machine, replay/retry/cancel/delete semantics,
unresolved review questions, and why production E2EE readiness remains false.

Production key and local storage lifecycle review input is tracked in
[reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md](reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md).
It records the current passphrase-first unlock, encrypted local
profile/session/message store, destructive local actions, backup/migration
boundary, marker-only rollback detection, and why production key-management
readiness remains false.

Desktop Real-User Test Preparation Boundary: tester-facing reports must use
redacted public support diagnostics, failure class, and recovery next action
only. Allowed public fields are app version, build channel, build commit,
platform, checksum result, public diagnostics, failure class, recovery next
action, desktop local-private-flow acceptance status, desktop local-private-flow
blocker summary, and whether app-launch network stayed false. Forbidden fields
include raw logs, onion endpoints, invite codes, pairing/envelope/endpoint
payloads, safety phrases, profile names, message text, local paths,
passphrases, key material, screenshots of private room data, and private
planning notes. Hold criteria are missing redacted diagnostics, forbidden
private data, network before explicit action, or checksum mismatch. Abort criteria
are exposed secrets, requests for raw logs, requests for an external success
claim, or requests to use the beta for sensitive communication. There is no external two-machine success claim, no production readiness claim, and sensitive communication prohibited remains in force.

Public Support Triage: maintainers route reports through
`reference/PUBLIC_SUPPORT_TRIAGE.md`. Public routing may ask for checksum retry,
Gatekeeper recovery, profile recovery, payload retry/cancel, lifecycle
confirmation, redacted diagnostics, or a private security contact path. It must
not request raw logs, local paths, endpoints, invite codes, payloads, message
text, passphrases, private keys, key material, private screenshots, external
delivery proof, or sensitive-use reports.

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
- `COMPONENT_BOUNDARIES.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `OPERATOR_FINAL_HANDOFF.md`
- `MANIFEST.md`

Prepare the ignored local upload folder from the frozen local DMG:

```bash
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

The first command is the source-only release readiness preflight. It includes the desktop public beta source freeze candidate gate, does not require a DMG, does not rebuild a DMG, does not upload, and does not generate release artifacts. Its packaging decision is `proceed-to-packaging-only-with-frozen-ignored-dmg`, but packaging/upload remains held unless the current task explicitly requests release packaging/upload; if the source preflight fails, the fallback is `return-to-desktop-hardening-if-source-preflight-fails`. The release command writes to `apps/desktop-tauri/public-release/unsigned-public-beta/`, which is ignored and must not be committed. It regenerates public provenance for the public DMG file name, records the source provenance SHA-256, records the same-GitHub-Release-assets authority, rejects branch/source archive release authority for DMG verification, and fails if the expected checksum, GitHub Release body non-claims, update-integrity note, supply-chain baseline, dependency inventory, dependency lockfile hash evidence, public threat model, privacy model comparison, independent review packet, public intake policy, repository governance guardrails, component boundary map, explicit review-gap evidence, private-reporting boundary, and fabricated-review/peer-evidence-forbidden evidence are missing. The dependency evidence is exactly three lockfiles: `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`; it is not a live dependency scan, vulnerability triage signoff, SBOM, audit, or reproducible-build proof. Public users must verify the `.sha256` file before using the normal macOS Privacy & Security manual allow path. Updates are manual GitHub Release downloads only; there is no auto-update channel.

Future public Windows, Android, and iOS artifacts must follow the same manual
GitHub Release integrity model: matching checksum, public provenance, manifest,
release notes, update-integrity note, and dependency evidence attached to the
same GitHub Release as the artifact. Signing, notarization, app-store approval,
Play Store approval, TestFlight, Developer ID, SmartScreen reputation, or mobile
store review may improve distribution ergonomics later, but none is a trusted
security boundary for v0.1.

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
- Desktop Default Practical Transport Boundary: the desktop default practical
  path is local manual encrypted envelope exchange. It is the only default
  source boundary for v0.1 and has `network_io=false`,
  `automatic_delivery=false`, `central_message_server=false`,
  `push_notification_dependency=false`, and `central_contact_discovery=false`.
  The high-risk onion/Tor path is separate, explicit-user-triggered,
  fail-closed, onion-only, and has `direct_fallback=false`. This boundary is a
  product decision and first implementation slice, not a claim of reliable
  external delivery, production readiness, audited security, or sensitive-use
  safety.
- Manual update integrity evidence for the unsigned public beta release path: DMG `.sha256`, public provenance JSON, release manifest, update-integrity policy, supply-chain baseline note, dependency inventory, and a three-lockfile SHA-256 list for `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`.
- Public threat model and independent review packet that state allowed claims, non-claims, known gaps, public-safe review commands, private-reporting boundary, and the current no-reviewer-signoff/no-public-user-safety-signoff/no-completed-review gap.
- Public intake policy and GitHub issue templates that require redacted public support diagnostics or minimal private-contact requests instead of raw logs, payloads, endpoints, paths, passphrases, private keys, key material, crash dumps, or private planning notes.
- Repository governance guardrails for maintainer-driven main-branch work, unsigned beta non-claims, no-central-trusted-server scope, release file discipline, and private-data redaction.
- A local Tauri desktop beta shell for invite-code rooms, safety phrase confirmation, encrypted local profile/session/message records, saved-room resume, manual private-delivery exchange UI, explicit receive start/stop, retry/cancel recovery, and redacted field-test reports.
- Desktop-only v0.1 acceptance matrix: `desktop local/manual beta readiness`
  covers `invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim`.
  It excludes
  `android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication`.
  Passing this matrix does not claim external onion delivery, audited security,
  production readiness, security readiness, or permission for sensitive
  communication.
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
- In-app unsigned public beta warnings and public support diagnostics export
  limited to app status, build identity, broad failure class, recovery next
  action, desktop local-private-flow acceptance blockers, explicit non-claims,
  and app-launch network boundary; no workflow-state export, crash upload,
  telemetry, raw log export, crash dump export, automated log
  collection, support bundle export, raw diagnostic file export, codes,
  endpoints, messages, profile names, paths, passphrases, or key material.
  Desktop acceptance diagnostics are not external onion delivery evidence, not a
  production-ready claim, not audited status, and not permission for sensitive
  communication.
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
  for a release artifact. Windows desktop readiness source audit keeps this as
  local build candidate only: no public Windows artifact, no Windows installer,
  no public artifact upload, WebView2 runtime smoke still required, app-data and
  path separator review still required, redacted diagnostics and explicit user
  action review still required, local deletion behavior review still required,
  no auto-update, and signing/Microsoft Store or SmartScreen reputation is not a
  security boundary.
- Windows local usable criteria are source-defined separately from Windows
  public artifact prerequisites; local usability does not imply installer,
  signing, SmartScreen, store, upload, or production readiness.
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

GitHub Actions runs the lightweight verify workflow on `main`, pull requests,
and manual dispatch. It runs source/test validation only; it does not build,
sign, notarize, upload, or commit release artifacts.

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

For a heavier local engineering pass before risky cross-cutting changes, run:

```bash
scripts/verify_full.sh
```

This is not a packaging readiness, audit readiness, or release go signal. Public release staging still requires `scripts/public_release_readiness_preflight.sh` and the pinned frozen DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`.

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
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

Run the source-only preflight before staging artifacts; it does not require a DMG and does not generate release files. Treat `decision=proceed-to-packaging-only-with-frozen-ignored-dmg` as a packaging go signal only when the current task explicitly requests release packaging/upload; otherwise hold, do not stage, do not upload, and continue desktop hardening. Upload only the generated public release files from `apps/desktop-tauri/public-release/unsigned-public-beta/`. Use `GITHUB_RELEASE_BODY.md` as the GitHub Release body. The public release body, notes, install guide, manifest, provenance, privacy model comparison, and component boundary map must keep the unsigned experimental beta warning, sensitive communication prohibition, not audited status, not production-ready status, external two-machine onion delivery non-claim, Briar/Cwtch-equivalent non-claim, backup/migration non-claims, and public support diagnostics redaction boundary. Users must treat every update as a fresh manual download and verify the matching `.sha256` file.

For the current local field-test handoff, send only the per-peer delivery folder contents from:

- `apps/desktop-tauri/beta-artifacts/peer-delivery-a/`
- `apps/desktop-tauri/beta-artifacts/peer-delivery-b/`

Each folder should contain the transfer zip, matching `.sha256`, `PEER_HANDOFF_MESSAGE.md`, and `MANIFEST.md`. The peer-side preflight verifier must be run from the extracted `another-dimension-beta-handoff` folder. It checks bundle contents without launching the app or starting network/onion work.

Do not publish `docs/`, app data, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw logs, crash dumps, screenshots of private room data, `target/`, `dist/`, `node_modules/`, or `beta-artifacts/`. Use the public issue templates for redacted support reports and use private vulnerability reporting for sensitive security details when available.

For desktop-specific commands and beta notes, see [apps/desktop-tauri/README.md](apps/desktop-tauri/README.md).
For the public-safe beta handoff checklist, see [reference/BETA_RELEASE_CHECKLIST.md](reference/BETA_RELEASE_CHECKLIST.md).
For public-safe screenshot rules, see [reference/PUBLIC_SCREENSHOT_CHECKLIST.md](reference/PUBLIC_SCREENSHOT_CHECKLIST.md).
For dependency evidence boundaries, see [reference/DEPENDENCY_INVENTORY.md](reference/DEPENDENCY_INVENTORY.md) and [reference/SUPPLY_CHAIN_BASELINE.md](reference/SUPPLY_CHAIN_BASELINE.md).
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

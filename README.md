# Another Dimension Chat

[![Verify](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml/badge.svg)](https://github.com/answndud/another-dimension-chat/actions/workflows/verify.yml)
[![Release](https://img.shields.io/badge/release-unsigned%20macOS%20beta-orange)](https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned)
[![Status](https://img.shields.io/badge/status-not%20production--ready-red)](SECURITY.md)

English | [한국어](README.ko.md)

Another Dimension Chat is a no-central-trusted-server 1:1 private messenger app
candidate built in Rust/Tauri.

It is useful when two people want no phone number, no email identity, no global
account, a pairwise invite, mandatory safety comparison, encrypted
user-mediated message exchange, and local data ownership.

It is not a generic "serverless chat" demo. The project deliberately keeps
phone numbers, email identity, global accounts, searchable usernames,
centralized contact discovery, centralized message servers, push notifications,
and cloud backup out of the v0.1 default scope.

The current public build is an **unsigned experimental macOS Apple Silicon
beta**. It is not notarized, not audited, not production-ready, and sensitive communication prohibited.

![Another Dimension Chat first-run beta screen](reference/screenshots/macos-public-beta-first-run-desktop.png)

Public-safe screenshots are listed in
[reference/screenshots/README.md](reference/screenshots/README.md). Please do not post screenshots that show private room data; use
[reference/PUBLIC_SCREENSHOT_CHECKLIST.md](reference/PUBLIC_SCREENSHOT_CHECKLIST.md) before publishing any other app image.

## Download

The current source-prepared unsigned packet is staged for this GitHub Release
tag, but replacing the live GitHub Release assets remains an explicit owner
action:

<https://github.com/answndud/another-dimension-chat/releases/tag/v0.1.0-beta-onion-unsigned>

After that upload, download both files from the same release:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`

Verify the DMG before opening it:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

Expected SHA-256:

```text
ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13
```

Artifact identity:

```text
artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13#beta-onion#e724bd39#v0.1.0-beta-onion-unsigned#macos-aarch64
artifact_current_head_aligned=true
public_artifact_stale=false
public_artifact_state=current
next_owner_action=upload-current-unsigned-public-beta-packet
```

This means the generated packet is aligned to current source HEAD. Do not treat
the GitHub Release as current until the explicit owner action uploads the
matching DMG, checksum, provenance, manifest, and release body.

Because this build is unsigned, macOS may block it. Open the DMG, try to open
the app once, then allow the blocked app from System Settings > Privacy &
Security only after the checksum matches. Do not use terminal
quarantine-removal commands as an install step.

Detailed install guide: [reference/UNSIGNED_PUBLIC_BETA_INSTALL.md](reference/UNSIGNED_PUBLIC_BETA_INSTALL.md)

## What It Does Today

The v0.1 public app lets you exercise the current private-message flow within
the implemented boundaries:

- create and unlock a local profile
- create or join an invite-code room
- compare safety material before trusting a room
- exercise local encrypted profile, session, and message stores
- export and import manual encrypted envelopes
- retry, cancel, and recover pending local envelope flows
- delete local conversation, session, profile, or app-owned data through
  explicit destructive actions
- copy redacted public diagnostics for support reports
- confirm that network/onion work does not start on app launch

The practical default transport is **manual encrypted envelope exchange**.
Advanced onion/Tor paths are separate, explicit-user-triggered, and
fail-closed. The beta does not claim reliable real-network onion delivery.
External onion delivery is outside the v0.1 public product claim, and no external delivery claim is made.

## High-Risk Mode Boundary

High-Risk Mode is a defined threat-model target, not a universal safety claim.
It combines mandatory safety comparison, encrypted user-mediated exchange,
onion-only advanced transport, local-at-rest hardening, and redacted support
reports. It aims to mitigate remote passive observers, remote active attackers,
malicious peers, local-at-rest attackers, and supply-chain/update attackers.
It does not protect compromised endpoints, direct coercion, or full global
traffic correlation. The project does not claim audited security, full
censorship resistance, Briar/Cwtch-equivalent privacy, compromised-device
safety, coercion safety, or reliable external onion delivery.

The fixed public matrix is [reference/HIGH_RISK_THREAT_MODEL.md](reference/HIGH_RISK_THREAT_MODEL.md).
The beta does not claim Briar/Cwtch equivalence, reliable external onion
delivery, audited security, production readiness, or sensitive-use safety.

![Manual encrypted envelope flow](reference/screenshots/macos-public-beta-manual-envelope-desktop.png)

### Local Data Lifecycle

The desktop beta has separate local destructive actions:

- conversation delete removes local message records while preserving session records
- session delete removes local session resume records while preserving message records
- profile delete requires the exact local profile name and removes that profile store
- full local wipe requires typing `WIPE LOCAL DATA` and removes app-owned local data

These controls do not provide cloud backup recovery, cloud sync, rollback
prevention, or secure deletion from storage media.

## What This Is Not

This project does not currently provide a secure messenger.

The current beta does not claim:

- secure production messaging
- audited or production-ready end-to-end encryption
- safety for sensitive communication
- reliable external Tor/onion delivery
- Briar/Cwtch-equivalent privacy or security
- bridge or censorship-circumvention readiness
- Windows, Android, or iOS public release artifacts
- signed, notarized, auto-updating, reproducible, or supply-chain-audited
  release status
- protection against endpoint compromise, coercion, or full global traffic
  correlation
- audited proof against malicious contacts; current handling is a mitigation
  target through signed invites, safety checks, and malformed payload rejection

Read the full public security boundary in [SECURITY.md](SECURITY.md).

## Source Gates

- Desktop-only v0.1 acceptance matrix: desktop local/manual beta readiness and desktop local-private-flow acceptance blockers are checked by
  `scripts/public_release_readiness_preflight.sh`.
- Accepted flow items: `invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim`.
- Public blockers: `android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication`.
- Desktop public beta source freeze candidate: source-only candidate for the desktop beta freeze, no DMG rebuild, no release upload, no upload, and no release packaging/upload without an explicit user request.
- Public support evidence is limited to redacted diagnostics.
- Source-only desktop flow blocker checks do not create release artifacts.
- Next source-only axes: Windows, real-user test preparation, default-transport-boundary; non-claims remain in force.
- Windows desktop cross-platform parity intake uses `apps/desktop-tauri/windows_desktop_parity_intake.json`; Windows local build candidate only, no public Windows artifact, no Windows installer, no public artifact upload; Windows local runtime smoke boundary remains source-only and still requires WebView2 runtime smoke, Tauri app-data storage, path separator, local deletion behavior, redacted diagnostics, explicit user action, and local-manual envelope default path checks.
- Windows local runtime smoke handoff uses `apps/desktop-tauri/windows_local_runtime_smoke_handoff.json` and `npm --prefix apps/desktop-tauri run test:windows-boundary`; this is not a Windows local runtime smoke passed claim and still requires WebView2 runtime smoke, Tauri app-data path review, path separator review, local deletion behavior review, redacted diagnostics behavior review, explicit user action, local-manual envelope default path review, no auto-update, and public non-claim checks on a real Windows machine.
- macOS unsigned public beta source closure references [reference/RELEASE_PAGE_UPDATE_POLICY.json](reference/RELEASE_PAGE_UPDATE_POLICY.json), [reference/MACOS_FRESH_INSTALL_REHEARSAL.md](reference/MACOS_FRESH_INSTALL_REHEARSAL.md), [reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md](reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md), [reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md](reference/MACOS_PUBLIC_BETA_FINAL_REPORT.md), [reference/screenshots/README.md](reference/screenshots/README.md), and [reference/PUBLIC_SUPPORT_TRIAGE.md](reference/PUBLIC_SUPPORT_TRIAGE.md); readiness target is 100% for source closure only, while the production readiness definition and claim gate still blocks production/security claims.
- The current unsigned packet is a source-prepared packet accepted by
  `scripts/prepare_unsigned_public_beta_release.sh`, build channel
  `beta-onion`, commit `e724bd39`, release tag
  `v0.1.0-beta-onion-unsigned`, and SHA-256
  `ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13`.
- Artifact status is machine-checkable: `artifact_current_head_aligned=true`,
  `public_artifact_stale=false`, `public_artifact_state=current`, and
  `next_owner_action=upload-current-unsigned-public-beta-packet`.
  The GitHub Release is not current until that upload owner action is complete.
- This is not a packaging readiness, audit readiness, or release go signal.
- Production claim removal is blocked by
  [reference/PRODUCTION_READINESS_CLAIM_GATE.md](reference/PRODUCTION_READINESS_CLAIM_GATE.md)
  and [reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md](reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md).

## Project Direction

The core design rule is that security-sensitive behavior belongs in Rust, not
in thin UI shells.

```text
crates/
  identity/    pairwise identity and contact types
  pairing/     pairing payloads and safety transcript logic
  crypto/      cryptographic boundary code and test fixtures
  protocol/    message envelopes, replay windows, and retention rules
  transport/   fail-closed transport policy, onion/runtime boundaries
  storage/     encrypted local storage and lifecycle policy boundary
  core/        profile, pairing, messaging, and orchestration

apps/
  cli/              development and boundary-check CLI
  desktop-tauri/    macOS desktop beta shell
  mobile/           source-only mobile shell candidates
```

UI shells may request redacted status and explicit user-triggered actions. They
must not invent separate protocol, storage, transport, pairing, contact
discovery, account, push-notification, or cloud-backup behavior.

## Architecture Reading Map

The product is intentionally local-first and pairwise. The design avoids a
central account/contact/message/backup authority in the v0.1 default path, then
accepts the cost: users must create pairwise rooms, compare safety material,
and move encrypted envelopes manually unless they choose an explicit advanced
network attempt.

The manual envelope path changes the tradeoff. It is worse for convenience and
automatic delivery, but it keeps the public beta from implying a central
mailbox, push provider, automatic network route, or reliable onion delivery.
Advanced onion/Tor work stays explicit and fail-closed.

Read these in order when reviewing the architecture:

- [blog/00-public-beta-launch.md](blog/00-public-beta-launch.md) for the public
  product story and non-claims.
- [reference/COMPONENT_BOUNDARIES.md](reference/COMPONENT_BOUNDARIES.md) for
  which layer owns identity, pairing, protocol, storage, transport, UI, support,
  and release boundaries.
- [reference/PRIVACY_MODEL_COMPARISON.md](reference/PRIVACY_MODEL_COMPARISON.md)
  for the metadata/trust tradeoff and current gap map.
- [reference/learning/README.md](reference/learning/README.md) for a
  beginner-friendly Korean guide. The learning guide is explanatory material,
  not a release claim source.

Current high-risk threat-model status is deliberately narrow:

- `mitigated`: remote passive observer, remote active attacker, malicious peer,
  local-at-rest attacker, and supply-chain/update attacker targets, within the
  current source boundaries and non-claims.
- `not_protected`: compromised endpoint, direct coercion, and full global
  traffic correlation.

## Current Platform Status

| Platform | Status |
| --- | --- |
| macOS Apple Silicon | Current unsigned experimental public beta DMG |
| macOS Intel / Universal | Not claimed; future artifact work required |
| Windows | Local build candidate only; no public artifact or installer |
| Android | Source shell candidate only; no APK/AAB/public artifact |
| iOS | Source shell candidate only; no IPA/TestFlight/App Store artifact |

Signing, notarization, app-store approval, SmartScreen reputation, Google Play,
TestFlight, APNs, FCM, iCloud, or cloud backup may affect distribution
ergonomics later. None of them is treated as the trusted security boundary for
this messenger direction.

## Build From Source

Requirements:

- Rust stable toolchain
- `rustfmt`
- `clippy` for the full verification pass
- Node.js and npm for the desktop Tauri shell

Install Rust components:

```bash
rustup component add rustfmt clippy
```

Run the lightweight repository verification:

```bash
scripts/verify_all.sh
```

Run the heavier local engineering pass before risky cross-cutting changes:

```bash
scripts/verify_full.sh
```

Install desktop dependencies:

```bash
cd apps/desktop-tauri
npm ci --workspaces=false
```

Run the frontend preview:

```bash
npm run dev
```

Run the local Tauri beta shell with the manual onion attempt feature compiled in:

```bash
npm run tauri:dev:beta-onion
```

Build a local-only Tauri desktop artifact:

```bash
npm run tauri:build
```

That generic local build output is not a public release upload artifact.

## CLI Boundary Checks

The default CLI build exposes boundary checks only. Here, "production" means
the default non-`dev-insecure` build boundary, not deployable security.

```bash
cargo run -q -- production self-test
cargo run -q -- production preflight
```

Development-only prototype commands require the `dev-insecure` feature and are
not for real communication:

```bash
cargo run -q --features dev-insecure -- demo local
scripts/demo_dev_cli.sh
scripts/smoke_dev_cli.sh
```

`dev-insecure` builds print a warning and must not be used for real messages.

## Release Discipline

The release authority for a DMG is the matching set of assets attached to the
same GitHub Release. The `main` branch may contain later documentation or source
changes, so do not verify downloaded app artifacts against branch files or
GitHub source archives.

Maintainer-only public beta staging commands:

```bash
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

Generated release folders are ignored and must not be committed:

- `apps/desktop-tauri/beta-artifacts/`
- `apps/desktop-tauri/public-release/`

Do not publish `docs/`, app data, bridge lines, onion endpoints, invite codes,
pairing/envelope/endpoint payloads, safety phrases, plaintext messages,
passphrases, private keys, key material, raw logs, crash dumps, screenshots of
private room data, `target/`, `dist/`, `node_modules/`, or generated beta
artifacts.

## Public Support

Use public issues only for redacted support reports. Include broad failure
class, checksum result, platform, app version/build channel, recovery next
action, and diagnostics copied from the app.

Do not post raw logs, local paths, endpoints, invite codes, payloads, message
text, passphrases, private keys, key material, private screenshots, or private
planning notes.

For sensitive security reports, use GitHub private vulnerability reporting when
available. If it is unavailable, open only a minimal public security-contact
request without exploit details.

See [SUPPORT.md](SUPPORT.md) and [reference/PUBLIC_INTAKE_POLICY.md](reference/PUBLIC_INTAKE_POLICY.md).

## Engineering Notes

For a portfolio-style explanation of why this exists and how it is built, read
the public-safe engineering notes in [blog/](blog/).

For a Korean beginner-friendly guide to the security, communication, storage,
transport, and release concepts used in this project, read
[reference/learning/](reference/learning/).

Public roadmap and boundary documents:

- [reference/ROADMAP.md](reference/ROADMAP.md)
- [reference/PUBLIC_THREAT_MODEL.md](reference/PUBLIC_THREAT_MODEL.md)
- [reference/PRIVACY_MODEL_COMPARISON.md](reference/PRIVACY_MODEL_COMPARISON.md)
- [reference/COMPONENT_BOUNDARIES.md](reference/COMPONENT_BOUNDARIES.md)
- [reference/PRODUCTION_READINESS_CLAIM_GATE.md](reference/PRODUCTION_READINESS_CLAIM_GATE.md)
- [reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md](reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md)
- [reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md](reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md)
- [reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md](reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md)

Beta, non-production, non-audited, and sensitive-use-prohibited wording must
remain until the production readiness claim gate is actually satisfied.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening public issues or pull
requests.

In short:

- preserve the no-central-trusted-server product direction
- keep fake or development behavior behind `dev-insecure`
- keep private planning notes out of public changes
- do not add central accounts, contact discovery, central relays, push
  notification dependencies, telemetry, crash upload, auto-update, or cloud
  backup as v0.1 defaults
- keep public docs aligned with current implementation evidence and non-claims

## License

This repository is currently marked `UNLICENSED` in the Rust workspace metadata.

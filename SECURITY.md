# Security Policy

## Current Security Status

Another Dimension Chat is not ready for real communication.

The current public repository contains a Rust/Tauri prototype and a local desktop beta candidate. It is useful for testing development flow, local encrypted-store boundaries, invite-room recovery, explicit user-mediated private-delivery actions, and fail-closed advanced onion/Tor attempt behavior, but it does not provide production-grade confidentiality, anonymity, metadata resistance, endpoint protection, or user safety.

For the v0.1 unsigned public beta, the product surface is the desktop Tauri
beta shell. Android is only the next mobile client candidate after the shared
Rust core/API boundary remains platform-neutral; iOS follows after the same
boundary is preserved. Mobile clients are not part of this public beta, and
the platform split is not a security-readiness or production-readiness claim.
The Android candidate is a thin Kotlin shell over UniFFI or another narrow FFI
boundary into the shared Rust core. It must not define independent protocol,
storage, transport, pairing, or contact-discovery semantics.
The later iOS candidate follows the same shape as a thin Swift shell over
UniFFI or another narrow FFI boundary into the shared Rust core. iOS-specific
distribution constraints are product constraints, not security claims.
The public desktop artifact is currently the unsigned macOS DMG path. Windows
is a local desktop build candidate only; before any public Windows artifact, it
must keep the same Tauri app-data resolver semantics, encrypted local store,
local deletion controls, redacted diagnostics, explicit user-action boundary,
no auto-update channel, and no signing/notarization/store trust claim.

The shared core boundary means Rust owns profile identity, pairing payload and
safety transcript logic, message orchestration, protocol envelopes and replay,
encrypted local storage policy, and fail-closed transport policy. UI shells may
request redacted status and explicit user-triggered actions only; they must not
define separate security-sensitive protocol, storage, transport, pairing, or
contact-discovery behavior.

Default-build production code now includes narrow decision boundaries for pairing, session setup, durable local session lifecycle records, local data lifecycle controls, forward-only schema versioning, marker-only rollback detection, envelope handling, explicit manual envelope export/import runtime gating, local manual E2EE runtime failure-model gating, passphrase-first key and rollback non-claim policy gating, explicit transport envelope I/O non-claim gating, replay rejection, transport policy, fail-closed onion transport behavior, pre-network transport blockers, backup-exclusion verification boundaries, onion service key lifecycle policy boundaries, onion service launch preflight boundaries, bridge/censorship readiness policy boundaries, bootstrap execution boundaries, bounded Arti adapter spikes, local-only manual bootstrap gates, profile-scoped transport directory resolution, persistent Arti client lifecycle ownership, storage policy tests, SQLCipher-backed storage work, passphrase unlock tests, high-risk unlock policy tests, replay-window persistence tests, receive-flow replay commit-order tests, session-scoped opaque replay record-id derivation, and desktop beta recovery UI checks. These are implementation guardrails, not a secure messenger release.

The public cross-component replacement inventory is tracked in `reference/COMPONENT_BOUNDARIES.md`. It is a boundary map for future work, not a production-readiness statement.

The production readiness claim gate is tracked in
`reference/PRODUCTION_READINESS_CLAIM_GATE.md`. Beta and non-claim wording must
remain until that gate and the later stable release phases are complete.
Signing and notarization are distribution ergonomics, not a messenger security
trust boundary.
RB-8 selected the lower release class path in
`reference/PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md`: signed public beta or
RC only, with stable/production, audited, security-ready, reliable-delivery,
and sensitive-use claims still false.
RB-9 publication scope-down is tracked in
`reference/GITHUB_RELEASE_PUBLICATION_SCOPE_DOWN.md`: the existing
`v0.1.0-beta-onion-unsigned` public prerelease remains the current lower-class
publication, with no stable release upload or release edit.
RB-10 Windows public artifact scope-down is tracked in
`reference/WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md`: Windows remains a local
build candidate only, with no public Windows artifact, installer, signing,
upload, or Windows production claim.
RB-11 Android implementation authorization is tracked in
`reference/ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md`: Android remains
a source shell over the shared-core boundary only, with no APK, AAB, Play Store
distribution, runtime messaging, cloud backup, FCM, or Android public artifact
claim.
RB-12 iOS implementation authorization is tracked in
`reference/IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md`: iOS remains a
source shell over the shared-core boundary only, with no IPA, TestFlight/App
Store distribution, runtime messaging, iCloud backup, APNs, or iOS public
artifact claim.
RB-13 cross-platform target-standard final closure is tracked in
`reference/CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md`: the next release
class is `signed-public-beta-or-rc`, platform claims are aligned to actual
artifacts/source shells, and whole-product 100%, stable, production-ready,
audited, security-ready, reliable-delivery, Briar/Cwtch-equivalent,
censorship-resistant, and sensitive-use claims remain false.
P100-0 100% definition lock is tracked in
`reference/TARGET_STANDARD_100_EVIDENCE_MATRIX.md`: it defines the evidence
matrix for judging general macOS public app 100% and full target-standard 100%
while keeping the current non-claims unchanged.
The current active queue source/hold closure is tracked in
`reference/TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md`: each remaining
100% phase is mapped to a source-side or explicit hold gate, with macOS 100%,
whole-product 100%, stable, production-ready, audited, reliable-delivery, and
sensitive-use claims still false.

The production protocol/session lifecycle review input is tracked in
`reference/PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md`. It documents the current
1:1 state machine, replay/retry/cancel/delete semantics, unresolved review
questions, and why production E2EE readiness remains false.

Pairwise identity and safety product closure is tracked in
`reference/PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md`. It connects pairwise
local identity persistence, signed invite payloads, canonical safety
transcripts, duplicate-contact rejection, explicit rebuild/re-pairing, and
safety mismatch revocation while identity audit, security-ready, and
sensitive-use claims remain false.

Supported local/manual E2EE claim closure is tracked in
`reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`. It allows only the narrow
supported 1:1 local/manual envelope message-content encryption statement while
keeping broad `production_e2ee_ready=false`, audited E2EE, secure messenger,
sensitive-use, automatic network messaging, remote acknowledgement, and external
delivery claims false.

The production key and local storage lifecycle review input is tracked in
`reference/PRODUCTION_KEY_STORAGE_LIFECYCLE.md`. It documents the current
passphrase-first unlock, encrypted profile/session/message store, destructive
local actions, backup/migration boundary, marker-only rollback detection, and
why production key-management readiness remains false.

Supported key/rollback/deletion claim closure is tracked in
`reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md`. It allows only the local
desktop scope: passphrase-first SQLCipher-backed local profile store access,
OS-keystore-only rejection, marker-only rollback detection with user-visible
reset/rebuild recovery, and explicit local logical delete / owned app-data wipe.
`production_key_management_ready=false`, app key wrapping, rollback prevention,
secure media deletion, backup recovery, security-ready, and sensitive-use claims
remain false.

The production default transport product path review input is tracked in
`reference/PRODUCTION_DEFAULT_TRANSPORT_PATH.md`. It documents the local manual
encrypted envelope exchange default, the separate explicit fail-closed
onion/Tor advanced path, the no-central-server boundaries, the evidence order,
and why reliable external delivery remains false.

Supported default practical transport closure is tracked in
`reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md`. It makes the
desktop default transport local/manual courier envelope exchange only. The app
still claims no automatic network delivery, no central message server, no
reliable external onion delivery, no production transport readiness, and no
sensitive-use safety.

The macOS production UX and onboarding review input is tracked in
`reference/MACOS_PRODUCTION_UX_ONBOARDING.md`. It documents the first-run
checklist, invite/verify/message flow, manual envelope guide, recovery guide,
redacted diagnostics, destructive local lifecycle confirmations, advanced
transport UX boundary, and why production wording stays blocked.

macOS usability and recovery closure is tracked in
`reference/MACOS_USABILITY_RECOVERY_CLOSURE.md`. It provides the owner-observed
critical desktop task script and recovery vocabulary alignment while keeping
`usability_study_completed=false` until real representative user evidence
exists.

The macOS production distribution gate status is tracked in
`reference/MACOS_PRODUCTION_DISTRIBUTION_GATE.md`. It documents the current
unsigned beta distribution state, signing/notarization holds, same-release
checksum/provenance authority, update-channel blockers, and why stable signed
distribution readiness remains false. RB-7 release-class scope-down is tracked
in `reference/MACOS_STABLE_ARTIFACT_RELEASE_CLASS_SCOPE_DOWN.md`; it allows
lower release classes to continue while stable signed/notarized artifact,
production distribution, and security-ready claims remain false.
The macOS update and rollback-safe release channel source gate is tracked in
`reference/MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md`. The current update
path remains manual same-release GitHub Release verification only, with no
auto-update, signed update manifest, release upload, rollback-prevention, or
stable distribution claim.

External review and audit readiness is tracked in
`reference/EXTERNAL_REVIEW_AUDIT_READINESS.md`, with the public-safe finding
tracker in `reference/AUDIT_FINDING_TRACKER.md`, and the RB-6 release-class
scope-down in `reference/EXTERNAL_REVIEW_RELEASE_CLASS_SCOPE_DOWN.md`. These
files define reviewer scope, fix/hold/waive triage, and the
lower-release-class workaround while keeping external review, audit completion,
reviewer signoff, audited wording, and security-ready claims false.

Field evidence and reliability readiness is tracked in
`reference/FIELD_EVIDENCE_RELIABILITY_PROGRAM.md`, with the redacted field
report template in `reference/REDACTED_FIELD_REPORT_PACKET.md`, and the RB-5
release-class scope-down in
`reference/FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md`. These files define the
evidence ladder, report data boundary, reliability decision rule, and
lower-release-class workaround while keeping real macOS two-machine repeated
evidence, reliable external delivery, production field evidence, and
sensitive-use claims false.

Operational support, incident, and vulnerability process readiness is tracked in
`reference/OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md`, with the tabletop record in
`reference/INCIDENT_TABLETOP_RECORD.md`. These files define public/private
intake separation, key-compromise guidance, manual emergency release/update
handling, dependency vulnerability triage, and template review while keeping
production operational readiness and security-ready claims false.

The stable macOS v1.0 release gate is tracked in
`reference/STABLE_MACOS_V1_RELEASE_GATE.md`, with the public-safe hold report in
`reference/STABLE_RELEASE_HOLD_REPORT.md`. The current decision is hold: no
stable release, beta wording removal, release upload, DMG rebuild,
production-ready claim, audited claim, reliable external delivery claim, or
sensitive-use permission is authorized.

Release authority and credential unblock status is tracked in
`reference/RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md`. The repository admin path
and Xcode/notarytool availability are recorded, but no Apple Developer ID
signing identity or notarization credential is available locally; stable
signed/notarized release remains scoped down until credentials and explicit
release authorization exist.
macOS architecture support policy is tracked in
`reference/MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md`: the current public
artifact is explicitly Apple Silicon `aarch64` only, with universal and Intel
support claims false until matching build/provenance evidence exists.
Signed/notarized RC artifact handling is tracked in
`reference/MACOS_SIGNED_NOTARIZED_RC_ARTIFACT.md`: the runbook and verifier
exist, but no signed/notarized RC artifact is present.

The public privacy-model comparison is tracked in `reference/PRIVACY_MODEL_COMPARISON.md`. It maps the intended Korean Briar/Cwtch-style direction to current public beta gaps and LINDDUN categories; it is not a claim that the current beta has reached that level.

The public threat model is tracked in `reference/PUBLIC_THREAT_MODEL.md`, and the independent review packet is tracked in `reference/INDEPENDENT_REVIEW_PACKET.md`. These are review inputs, not evidence that a review has been completed. The public beta upload set explicitly records the current review gap, private-reporting boundary, public-safe review-command boundary, and fabricated-review/peer-evidence-forbidden boundary; it does not claim reviewer signoff or public user safety signoff.

Do not use this project to communicate sensitive information.

## Reporting Security Issues

If you find a security issue, please use GitHub's private vulnerability reporting feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue that does not include exploit details or sensitive information, and ask for a private contact path.

Public issues, release comments, and support requests must follow
`reference/PUBLIC_INTAKE_POLICY.md`. Use only redacted public support diagnostics or a
minimal private-contact request. Do not post bridge lines, onion endpoints,
invite codes, pairing/envelope/endpoint payloads, safety phrases, profile names,
message text, local paths, raw logs, crash dumps, screenshots of private room
data, passphrases, private keys, key material, private planning notes, files
from `docs/`, or local app data.

Public support diagnostics may include desktop local-private-flow acceptance
status, blockers, recovery next action, and explicit non-claims. This is not
external onion delivery evidence, not a production-ready claim, not audited
status, and not permission for sensitive communication.

Maintainers should triage public beta reports with
`reference/PUBLIC_SUPPORT_TRIAGE.md`. Public responses may ask for checksum
retry, Gatekeeper recovery, profile recovery, payload retry/cancel, lifecycle
confirmation, redacted diagnostics, or a private security contact path. They
must not request raw logs, local paths, onion endpoints, invite codes, payloads,
message text, passphrases, private keys, key material, private screenshots, or
external delivery proof in public.

## Non-Claims

This project does not currently claim:

- A serverless product in the broad sense, a public relay-free availability guarantee, or a no-infrastructure availability guarantee.
- Phone-number, email, global-account, searchable-username, centralized contact-discovery, centralized message-server, push-notification, or cloud-backup support.
- Secure production end-to-end encryption.
- The local manual envelope runtime has a reviewed Noise XX/session/key/replay
  failure-model gate, but this is not an audit, production-ready E2EE claim, or
  sensitive-communication guarantee. The only allowed E2EE wording is the
  supported local/manual envelope message-content scope tracked in
  `reference/PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md`.
- Reliable real-network Tor/onion delivery.
- Completed independent external two-machine onion delivery evidence. Current
  single-machine local rehearsal is not external peer evidence.
- Automatic network-on-launch, automatic background delivery, direct fallback,
  central message server delivery, push-notification delivery dependency,
  central contact discovery, or usable send/receive transport messaging. The
  default practical transport path is explicit local manual encrypted envelope
  exchange, and the advanced onion/Tor envelope I/O boundary is fail-closed and
  explicit user-triggered only.
- Desktop Default Practical Transport Boundary: the desktop default practical
  path is local manual encrypted envelope exchange. It is the only default
  source boundary for v0.1 and has `network_io=false`,
  `automatic_delivery=false`, `central_message_server=false`,
  `push_notification_dependency=false`, and `central_contact_discovery=false`.
  The supported default transport scope is local manual courier envelope
  exchange only, as recorded in
  `reference/PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md`.
  The high-risk onion/Tor path is separate, explicit-user-triggered,
  fail-closed, onion-only, and has `direct_fallback=false`. This boundary is a
  product decision and first implementation slice, not a reliable external
  delivery claim, production-ready claim, audited security claim, or
  sensitive-communication allowance.
- Audited production transport adapter implementation.
- Audited bridge or censorship-circumvention support.
- Production-ready Arti transport bootstrap, onion service launch, system Tor discovery, runtime Tor connectivity, or bridge/censorship behavior.
- Onion service key generation, rotation, persistence, backup, or migration.
- Actual onion service private key material.
- Complete production key management. The desktop shell has a supported local
  key/rollback/deletion scope recorded in
  `reference/PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md`, but app key wrapping,
  secure deletion from media, rollback prevention, audited E2EE readiness,
  automatic messaging readiness, and network send/receive readiness are still
  not claimed.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle with cloud backup/sync,
  backup recovery, rollback prevention, or secure deletion guarantees. The
  current product lifecycle matrix only distinguishes local conversation delete,
  session resume-record delete, profile delete, and full local app-data wipe
  scopes.
- Desktop-only v0.1 acceptance matrix: `desktop local/manual beta readiness`
  covers `invite#create#join#verify#send#export#import#reply#receive#retry#cancel#delete#unlock#reopen#diagnostics#release-non-claim`
  only. It excludes
  `android-ios-runtime#external-peer-evidence#audit#production-ready#security-ready#sensitive-communication`,
  and it is not external onion delivery evidence, an audit result, a
  production-ready claim, a security-ready claim, or permission for sensitive
  communication.
- Durable production key storage.
- Audited or security-ready durable production session lifecycle.
- Replay rollback prevention against encrypted database snapshot restore.
- Cloud backup/sync, backup recovery, destructive migration, secure media deletion, or rollback prevention.
- Signed, notarized, reproducible, auto-updating, or supply-chain-reviewed releases.
- Public Windows installer readiness. Windows is currently a local build
  candidate only and does not add DPAPI-only unlock, auto-update, store approval,
  or a platform signing trust boundary.
- Android app readiness. Android is currently only a shared-core shell
  candidate and does not add Google-account identity, Play Services, Firebase
  Cloud Messaging, Play Store trust, Android Keystore-only unlock, cloud backup,
  or wrapper-specific protocol/storage/transport semantics.
- iOS app readiness. iOS is currently only a shared-core shell candidate and
  does not add Apple-account identity, iCloud, APNs, App Store/TestFlight trust,
  Developer ID, notarization, iOS Keychain-only unlock, cloud backup, or
  wrapper-specific protocol/storage/transport semantics.
- External audit, independent review, reviewer signoff, or public user safety signoff.
- Protection against device compromise.
- Protection against coercion.
- Protection against malicious contacts.
- Protection against global traffic correlation.
- Security superiority over Signal.
- Briar/Cwtch-equivalent privacy or security level, repeated external onion
  evidence, offline mesh delivery, or security-ready status.

## Beta Distribution Boundary

Internal beta artifacts are for field testing only. A beta handoff may exercise local encrypted stores, invite-room recovery, explicit receive start/stop, retry/cancel recovery, local manual encrypted envelope exchange, and explicit advanced onion/Tor attempts, but it must not be described as secure, anonymous, audited, hardened, or suitable for sensitive communication.

The current internal field-test handoff record, when present in ignored local artifacts, uses transfer bundle SHA-256 `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907` and app DMG SHA-256 `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`. A different transfer bundle hash is a different handoff and must update the peer message, checksum file, and intake expectation before testers use it.

Beta peers must verify the transfer zip with its `.sha256` file before opening it, then run the extracted `./VERIFY_FIELD_TEST_BUNDLE.sh` preflight. That verifier checks the DMG/provenance/plist/signing boundary without launching the app or starting network/onion work.

Beta artifacts must not include local app data, private planning notes, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, raw diagnostic logs, build caches, or ignored `beta-artifacts/` contents in the public repository.

Completed field-test reports must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, passphrases, profile names, message text, local app data paths, raw logs, or key material.

## Unsigned Public Beta Boundary

The public GitHub DMG path is an unsigned experimental public beta distribution path only. It is not signed, not notarized, not audited, not production-ready, and sensitive communication prohibited.

There is no public Windows beta artifact yet. A local Windows build must preserve
the same local app-data, encrypted-store, local deletion, diagnostics redaction,
explicit network action, and no-auto-update semantics as the macOS desktop shell
before it can be documented as a public artifact.

Windows desktop readiness source audit status is local build candidate only.
There is no public Windows artifact, no Windows installer, no public artifact
upload, and no production-ready claim. Windows remains blocked on WebView2
runtime smoke, app-data path review, path separator review, redacted diagnostics
review, and explicit user action review. Signing, Microsoft Store approval, and
SmartScreen reputation are distribution concerns, not a security boundary, and
sensitive communication prohibited remains in force.

Windows local usable criteria are source-defined before artifact work: WebView2
rendering, Tauri app-data storage roots, encrypted profile stores, local
deletion behavior, redacted diagnostics, explicit user actions before network
work, no auto-update, and the same local-manual envelope default path must hold.
Windows public artifact prerequisites are separate and still require an explicit
release request, local runtime smoke on a real Windows machine, packaging
review, installer/signing decisions, checksum provenance, and public upload hold
review.

Windows local runtime smoke boundary is source-only until a real Windows machine
runs the local app. The source command is
`npm --prefix apps/desktop-tauri run test:windows-boundary`; it checks that the
required Windows smoke still covers WebView2 runtime smoke, app-data path review,
path separator review, local deletion behavior, redacted diagnostics behavior,
and explicit user action review. Passing this source command is not a Windows
local runtime smoke passed result, not a public Windows artifact, not a Windows
installer, not a public artifact upload, not production-ready, and sensitive
communication prohibited.

External onion delivery is outside the v0.1 public product claim for this public
beta. Do not treat same-machine dual-profile rehearsal, local smoke tests, or
operator-prepared peer packets as proof of real external onion delivery. No peer
report is expected or required for this v0.1 claim, and no external delivery
claim is made.

The current public upload set is prepared from the pinned ignored public-release source DMG accepted by `scripts/prepare_unsigned_public_beta_release.sh`: build channel `beta-onion`, commit `e8954df9`, and SHA-256 `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`.

Desktop public beta source freeze candidate means source-only candidate status:
no DMG rebuild, no upload, and no generated release artifact commit. Final
source acceptance is limited to non-claims, redacted diagnostics, release
boundary, and desktop flow blocker checks. The next development axis must be
one of release packaging/upload only after explicit user request, Windows
readiness, real-user test preparation, or default-transport-boundary.

Desktop Real-User Test Preparation Boundary means tester-facing reports must use
redacted public support diagnostics, failure class, and recovery next action
only. Allowed public fields are app version, build channel, build commit,
platform, checksum result, public diagnostics, failure class, recovery next
action, and whether app-launch network stayed false. Forbidden fields include
raw logs, onion endpoints, invite codes, pairing/envelope/endpoint payloads,
safety phrases, profile names, message text, local paths, passphrases, key
material, and private planning notes. Hold criteria are missing redacted
diagnostics, forbidden private data, network before explicit action, or checksum
mismatch. Abort criteria are exposed secrets, requests for raw logs, requests
for an external success claim, or requests to use the beta for sensitive
communication. There is no external two-machine success claim, no production
readiness claim, and sensitive communication prohibited remains in force.

```bash
scripts/public_release_readiness_preflight.sh
scripts/prepare_unsigned_public_beta_release.sh
```

Run the source-only preflight before staging artifacts; it includes the desktop public beta source freeze candidate gate, does not require a DMG, does not rebuild a DMG, does not upload, and does not generate release files. The packaging decision is `proceed-to-packaging-only-with-frozen-ignored-dmg`, but packaging/upload remains held unless the current task explicitly requests release packaging/upload; if the source preflight fails, return to desktop hardening instead of staging artifacts.

The generated public release folder is `apps/desktop-tauri/public-release/unsigned-public-beta/`. It is ignored and should contain only the DMG, matching `.sha256`, public provenance JSON, `INSTALL_UNSIGNED_MACOS.md`, `RELEASE_NOTES.md`, `GITHUB_RELEASE_BODY.md`, `UPDATE_INTEGRITY.md`, `SUPPLY_CHAIN_BASELINE.md`, `DEPENDENCY_INVENTORY.md`, `PUBLIC_THREAT_MODEL.md`, `PRIVACY_MODEL_COMPARISON.md`, `INDEPENDENT_REVIEW_PACKET.md`, `PUBLIC_INTAKE_POLICY.md`, `REPOSITORY_GOVERNANCE.md`, `COMPONENT_BOUNDARIES.md`, `DEPENDENCY_LOCKFILES.sha256`, `OPERATOR_FINAL_HANDOFF.md`, and `MANIFEST.md`.

Public users must verify the DMG checksum before using the normal macOS Privacy & Security manual allow path. This project does not ask users to bypass macOS protections with terminal quarantine removal commands. There is no auto-update channel; every update is a manual GitHub Release download with a matching `.sha256` file.

Future public Windows, Android, and iOS artifacts must use the same manual
GitHub Release download, same-release checksum, public provenance, manifest, and
no-auto-update boundary. Platform signing, notarization, app-store approval,
Play Store approval, TestFlight, Developer ID, SmartScreen reputation, or mobile
store review is not a trusted security boundary for v0.1.

The unsigned release upload set includes public provenance JSON, `GITHUB_RELEASE_BODY.md`, `UPDATE_INTEGRITY.md`, `SUPPLY_CHAIN_BASELINE.md`, `DEPENDENCY_INVENTORY.md`, and `DEPENDENCY_LOCKFILES.sha256` as review evidence. The release script regenerates the public provenance for the public DMG name, records the source provenance SHA-256, records the same-GitHub-Release-assets authority, records that the source branch is not release authority for a downloaded DMG, records exactly three lockfile evidence entries (`Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`), records the public threat model and independent review packet, marks `independent_review_complete=false`, marks `public_review_gap_published=true`, marks `reviewer_signoff_claimed=false`, marks `public_user_safety_signoff_claimed=false`, records public-safe review input, known-review-gap, public-safe command, private-reporting boundary, minimal public contact request, fabricated-review/peer-evidence-forbidden flags, records the backup/migration non-claim boundary, and checks the GitHub Release body non-claims before declaring the upload set ready. These files are not an audit, SBOM, live dependency scan, vulnerability triage signoff, reproducible-build proof, malware review, signing substitute, notarization substitute, external review result, reviewer signoff, public user safety signoff, fabricated external review evidence, cloud backup/sync feature, backup recovery feature, rollback-prevention proof, secure-deletion proof, or secure messenger claim.

The upload set also includes `PUBLIC_THREAT_MODEL.md`, `PRIVACY_MODEL_COMPARISON.md`, `INDEPENDENT_REVIEW_PACKET.md`, `PUBLIC_INTAKE_POLICY.md`, `REPOSITORY_GOVERNANCE.md`, and `COMPONENT_BOUNDARIES.md` so reviewers can inspect allowed claims, non-claims, known gaps, public-safe review commands, private-reporting boundary, public issue/security intake redaction rules, maintainer-driven main-branch governance, component boundaries, and release guardrails without private planning notes.

The app's public support diagnostics export is local-copy only and limited to app status, build identity, broad failure class, recovery next action, desktop local-private-flow acceptance status/blockers/non-claims, and app-launch network boundary. It does not provide workflow-state export, crash upload, telemetry, raw log export, crash dump export, automated log collection, support bundle export, or raw diagnostic file export. It must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, profile names, message text, local paths, raw logs, crash dumps, screenshots of private room data, passphrases, private keys, key material, or private planning notes.

Public unsigned beta artifacts must not include local app data, private planning notes, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw diagnostic logs, crash dumps, build caches, `docs/`, `target/`, `dist/`, `node_modules/`, `beta-artifacts/`, or generated public release folders committed into the repository.

## Development Expectations

- Keep development-only crypto, storage, and transport behavior behind `dev-insecure`.
- Preserve the `WARNING: dev-insecure build. Not for real communication.` runtime warning.
- Do not add new security claims without matching implementation, tests, and review.
- Keep the advanced high-risk onion/Tor transport policy onion-only unless a
  separate ADR changes that rule. Any relay/store-and-forward design must first
  prove it preserves the no-central-trusted-server model.
- Do not persist production private keys, replay state, message envelopes, local message indexes, or session transport state as plaintext.
- Do not publish private planning notes or sensitive threat-model details from ignored local documentation.

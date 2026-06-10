# Security Policy

## Current Security Status

Another Dimension Chat is not ready for real communication.

The current public repository contains a Rust/Tauri prototype and a local desktop beta candidate. It is useful for testing development flow, local encrypted-store boundaries, invite-room recovery, explicit private-delivery actions, and fail-closed onion/Tor attempt behavior, but it does not provide production-grade confidentiality, anonymity, metadata resistance, endpoint protection, or user safety.

Default-build production code now includes narrow decision boundaries for pairing, session setup, durable local session lifecycle records, local data lifecycle controls, forward-only schema versioning, marker-only rollback detection, envelope handling, explicit manual envelope export/import runtime gating, local manual E2EE runtime failure-model gating, passphrase-first key and rollback non-claim policy gating, explicit transport envelope I/O non-claim gating, replay rejection, transport policy, fail-closed onion transport behavior, pre-network transport blockers, backup-exclusion verification boundaries, onion service key lifecycle policy boundaries, onion service launch preflight boundaries, bridge/censorship readiness policy boundaries, bootstrap execution boundaries, bounded Arti adapter spikes, local-only manual bootstrap gates, profile-scoped transport directory resolution, persistent Arti client lifecycle ownership, storage policy tests, SQLCipher-backed storage work, passphrase unlock tests, high-risk unlock policy tests, replay-window persistence tests, receive-flow replay commit-order tests, session-scoped opaque replay record-id derivation, and desktop beta recovery UI checks. These are implementation guardrails, not a secure messenger release.

The public cross-component replacement inventory is tracked in `reference/COMPONENT_BOUNDARIES.md`. It is a boundary map for future work, not a production-readiness statement.

The public privacy-model comparison is tracked in `reference/PRIVACY_MODEL_COMPARISON.md`. It maps the intended Korean Briar/Cwtch-style direction to current public beta gaps and LINDDUN categories; it is not a claim that the current beta has reached that level.

The public threat model is tracked in `reference/PUBLIC_THREAT_MODEL.md`, and the independent review packet is tracked in `reference/INDEPENDENT_REVIEW_PACKET.md`. These are review inputs, not evidence that a review has been completed. The public beta upload set explicitly records the current review gap, private-reporting boundary, public-safe review-command boundary, and fabricated-review/peer-evidence-forbidden boundary; it does not claim reviewer signoff or public user safety signoff.

Do not use this project to communicate sensitive information.

## Reporting Security Issues

If you find a security issue, please use GitHub's private vulnerability reporting feature if it is enabled for the repository.

If private vulnerability reporting is not enabled, open a minimal public issue that does not include exploit details or sensitive information, and ask for a private contact path.

Public issues, release comments, and support requests must follow
`reference/PUBLIC_INTAKE_POLICY.md`. Use only redacted public diagnostics or a
minimal private-contact request. Do not post bridge lines, onion endpoints,
invite codes, pairing/envelope/endpoint payloads, safety phrases, profile names,
message text, local paths, raw logs, crash dumps, screenshots of private room
data, passphrases, private keys, key material, private planning notes, files
from `docs/`, or local app data.

## Non-Claims

This project does not currently claim:

- A serverless product in the broad sense, a public relay-free availability guarantee, or a no-infrastructure availability guarantee.
- Phone-number, email, global-account, searchable-username, centralized contact-discovery, centralized message-server, push-notification, or cloud-backup support.
- Secure production end-to-end encryption.
- The local manual envelope runtime has a reviewed Noise XX/session/key/replay
  failure-model gate, but this is not an audit, production-ready E2EE claim, or
  sensitive-communication guarantee.
- Reliable real-network Tor/onion delivery.
- Completed independent external two-machine onion delivery evidence. Current
  single-machine local rehearsal is not external peer evidence.
- Automatic network-on-launch, direct fallback, or usable send/receive transport
  messaging. The transport envelope I/O boundary is fail-closed and explicit
  user-triggered only.
- Audited production transport adapter implementation.
- Audited bridge or censorship-circumvention support.
- Production-ready Arti transport bootstrap, onion service launch, system Tor discovery, runtime Tor connectivity, or bridge/censorship behavior.
- Onion service key generation, rotation, persistence, backup, or migration.
- Actual onion service private key material.
- Complete production key management. The desktop shell has a passphrase-first local product unlock/lock path, local durable session lifecycle records, local data lifecycle controls, an explicit manual envelope export/import runtime gate, a local manual E2EE runtime failure-model gate, and a v0.1 key/rollback policy decision, but app key wrapping, secure deletion from media, rollback prevention, audited E2EE readiness, automatic messaging readiness, and network send/receive readiness are still not claimed.
- OS keychain/DPAPI/Keystore wrapping.
- Complete production encrypted local storage lifecycle with cloud backup/sync, backup recovery, or secure deletion guarantees.
- Durable production key storage.
- Audited or security-ready durable production session lifecycle.
- Replay rollback prevention against encrypted database snapshot restore.
- Cloud backup/sync, backup recovery, destructive migration, secure media deletion, or rollback prevention.
- Signed, notarized, reproducible, auto-updating, or supply-chain-reviewed releases.
- External audit, independent review, reviewer signoff, or public user safety signoff.
- Protection against device compromise.
- Protection against coercion.
- Protection against malicious contacts.
- Protection against global traffic correlation.
- Security superiority over Signal.
- Briar/Cwtch-equivalent privacy or security level, repeated external onion
  evidence, offline mesh delivery, or security-ready status.

## Beta Distribution Boundary

Internal beta artifacts are for field testing only. A beta handoff may exercise local encrypted stores, invite-room recovery, explicit receive start/stop, retry/cancel recovery, and explicit onion/Tor attempts, but it must not be described as secure, anonymous, audited, hardened, or suitable for sensitive communication.

The current internal field-test handoff record, when present in ignored local artifacts, uses transfer bundle SHA-256 `f231dcc3a95b63d5d32b6b36cb503443a46547fa1dcbb44d58f772be831d0907` and app DMG SHA-256 `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`. A different transfer bundle hash is a different handoff and must update the peer message, checksum file, and intake expectation before testers use it.

Beta peers must verify the transfer zip with its `.sha256` file before opening it, then run the extracted `./VERIFY_FIELD_TEST_BUNDLE.sh` preflight. That verifier checks the DMG/provenance/plist/signing boundary without launching the app or starting network/onion work.

Beta artifacts must not include local app data, private planning notes, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, raw diagnostic logs, build caches, or ignored `beta-artifacts/` contents in the public repository.

Completed field-test reports must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, passphrases, profile names, message text, local app data paths, raw logs, or key material.

## Unsigned Public Beta Boundary

The public GitHub DMG path is an unsigned experimental public beta distribution path only. It is not signed, not notarized, not audited, not production-ready, and sensitive communication prohibited.

External two-machine onion delivery has not yet been independently verified for
this public beta. Do not treat same-machine dual-profile rehearsal, local smoke
tests, or operator-prepared peer packets as proof of real external onion
delivery.

The current public upload set is prepared from the ignored local beta DMG with:

```bash
scripts/prepare_unsigned_public_beta_release.sh
```

The generated public release folder is `apps/desktop-tauri/public-release/unsigned-public-beta/`. It is ignored and should contain only the DMG, matching `.sha256`, public provenance JSON, `INSTALL_UNSIGNED_MACOS.md`, `RELEASE_NOTES.md`, `GITHUB_RELEASE_BODY.md`, `UPDATE_INTEGRITY.md`, `SUPPLY_CHAIN_BASELINE.md`, `DEPENDENCY_INVENTORY.md`, `PUBLIC_THREAT_MODEL.md`, `INDEPENDENT_REVIEW_PACKET.md`, `PUBLIC_INTAKE_POLICY.md`, `REPOSITORY_GOVERNANCE.md`, `DEPENDENCY_LOCKFILES.sha256`, and `MANIFEST.md`.

Public users must verify the DMG checksum before using the normal macOS Privacy & Security manual allow path. This project does not ask users to bypass macOS protections with terminal quarantine removal commands. There is no auto-update channel; every update is a manual GitHub Release download with a matching `.sha256` file.

The unsigned release upload set includes public provenance JSON, `GITHUB_RELEASE_BODY.md`, `UPDATE_INTEGRITY.md`, `SUPPLY_CHAIN_BASELINE.md`, `DEPENDENCY_INVENTORY.md`, and `DEPENDENCY_LOCKFILES.sha256` as review evidence. The release script regenerates the public provenance for the public DMG name, records the source provenance SHA-256, records the same-GitHub-Release-assets authority, records that the source branch is not release authority for a downloaded DMG, records exactly three lockfile evidence entries (`Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`, and `apps/desktop-tauri/package-lock.json`), records the public threat model and independent review packet, marks `independent_review_complete=false`, marks `public_review_gap_published=true`, marks `reviewer_signoff_claimed=false`, marks `public_user_safety_signoff_claimed=false`, records public-safe review input, known-review-gap, public-safe command, private-reporting boundary, minimal public contact request, fabricated-review/peer-evidence-forbidden flags, records the backup/migration non-claim boundary, and checks the GitHub Release body non-claims before declaring the upload set ready. These files are not an audit, SBOM, live dependency scan, vulnerability triage signoff, reproducible-build proof, malware review, signing substitute, notarization substitute, external review result, reviewer signoff, public user safety signoff, fabricated external review evidence, cloud backup/sync feature, backup recovery feature, rollback-prevention proof, secure-deletion proof, or secure messenger claim.

The upload set also includes `PUBLIC_THREAT_MODEL.md`, `INDEPENDENT_REVIEW_PACKET.md`, `PUBLIC_INTAKE_POLICY.md`, and `REPOSITORY_GOVERNANCE.md` so reviewers can inspect allowed claims, non-claims, known gaps, public-safe review commands, private-reporting boundary, public issue/security intake redaction rules, maintainer-driven main-branch governance, and release guardrails without private planning notes.

The app's public diagnostics export is local-copy only and limited to status, build, failure class, manual network permission state, and app-launch network boundary. It does not provide crash upload, telemetry, raw log export, crash dump export, automated log collection, support bundle export, or raw diagnostic file export. It must not include bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, profile names, message text, local paths, raw logs, crash dumps, screenshots of private room data, passphrases, private keys, key material, or private planning notes.

Public unsigned beta artifacts must not include local app data, private planning notes, bridge lines, onion endpoints, invite codes, pairing/envelope/endpoint payloads, safety phrases, plaintext messages, passphrases, private keys, key material, raw diagnostic logs, crash dumps, build caches, `docs/`, `target/`, `dist/`, `node_modules/`, `beta-artifacts/`, or generated public release folders committed into the repository.

## Development Expectations

- Keep development-only crypto, storage, and transport behavior behind `dev-insecure`.
- Preserve the `WARNING: dev-insecure build. Not for real communication.` runtime warning.
- Do not add new security claims without matching implementation, tests, and review.
- Keep high-risk transport policy onion-only unless a separate ADR changes that rule.
- Do not persist production private keys, replay state, message envelopes, local message indexes, or session transport state as plaintext.
- Do not publish private planning notes or sensitive threat-model details from ignored local documentation.

# Another Dimension Chat 0.1.0 unsigned public beta

This is an unsigned experimental public beta for GitHub Release distribution.

It is not notarized, not audited, not production-ready, and sensitive communication prohibited.

## Artifact

- File: `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- SHA-256: `625ee389d930330b0f2e369a53c4f582df076dd612920f6cf0366aab4a3edb95`
- Build channel: `beta-onion`
- Build commit: `806ecad1`
- Platform: macOS aarch64

## What This Beta Is For

- Local desktop beta testing.
- Invite-code room flow.
- Safety phrase confirmation.
- Local encrypted profile/session/message store exercise.
- Saved-room restart/resume recovery.
- Manual private-route exchange.
- Explicit receive start/stop.
- Retry/cancel recovery.
- Explicit onion/Tor attempt paths after manual user action.
- Redacted diagnostics and field-test reporting.
- Public diagnostics limited to status, build, failure class, manual network
  permission, and app-launch network boundary, with no crash upload, telemetry,
  raw log export, crash dump export, automated log collection, support bundle
  export, or raw diagnostic file export.
- Manual GitHub Release download with SHA-256 verification.
- Same GitHub Release assets are the release authority; source branch files and
  GitHub source archives are not DMG verification authority.
- Public provenance JSON for the public DMG upload name.
- Public dependency inventory for reviewers.
- Public dependency lockfile hash baseline for reviewers.
- Public threat model and independent review packet for claim review.
- Public privacy model comparison for the Korean Briar/Cwtch-style direction
  as a gap map, not a current capability claim.
- Explicit review-gap provenance showing no completed review and no reviewer
  signoff claim.
- Explicit no-public-user-safety-signoff, private-reporting boundary, and
  no-fabricated-review/peer-evidence boundary.
- Local backup-exclusion verification and forward-only schema migration
  boundary, with destructive migration blocked.
- Public intake policy and GitHub issue templates for redacted support reports
  and minimal security contact requests.
- Repository governance guardrails for maintainer-driven main work, unsigned
  beta non-claims, release discipline, and no fabricated external evidence.

## What This Beta Does Not Claim

- Secure production messaging.
- Audited security.
- Production-ready E2EE.
- Reliable real-network Tor/onion delivery.
- Independently verified external two-machine onion delivery.
- Bridge/censorship support beyond tested configurations.
- Briar/Cwtch-equivalent privacy or security level, repeated external onion
  evidence, offline mesh delivery, or security-ready status.
- Cloud backup/sync, backup recovery, destructive migration, rollback
  prevention, or secure deletion from storage media.
- Signed, notarized, auto-updating, reproducible, or supply-chain-reviewed release status.
- SBOM, dependency audit completion, live dependency scan, or vulnerability triage signoff.
- Completed independent review.
- Reviewer signoff or public user safety signoff.
- Fabricated external review or external peer evidence.
- Protection against device compromise, coercion, malicious contacts, or global traffic correlation.
- Crash upload, telemetry, raw log export, crash dump export, automated log
  collection, support bundle export, raw diagnostic file export, or safe
  publication of private logs.
- Safe public issue posting of endpoints, payloads, messages, local paths,
  passphrases, private keys, key material, crash dumps, screenshots of private
  room data, or private planning notes.

## Install

Read `INSTALL_UNSIGNED_MACOS.md` before opening the DMG.

Verify the checksum before using the macOS Privacy & Security manual allow path.
Do not use terminal quarantine-removal commands as an install step.

Do not use this beta for sensitive communication.

External two-machine onion delivery has not yet been independently verified.
Same-machine dual-profile rehearsal is development evidence only, not peer
field-test evidence.

There is no auto-update. Every update is a manual GitHub Release download and
must be verified with the matching `.sha256` file.

The provenance JSON, `DEPENDENCY_INVENTORY.md`, and
`DEPENDENCY_LOCKFILES.sha256` are upload-set evidence only. The lockfile
evidence is exactly `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`,
and `apps/desktop-tauri/package-lock.json`. They are not signing,
notarization, reproducible-build proof, SBOM, dependency audit completion, live
dependency scan, vulnerability triage signoff, or a secure messenger claim.

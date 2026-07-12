# Another Dimension Chat 0.1.0 unsigned public beta

This is an unsigned experimental public beta for GitHub Release distribution.

It is not signed, not notarized, not audited, not production-ready, and sensitive communication prohibited.

Apple Developer Program, Developer ID, notarization, App Store, and TestFlight
credentials are not used or required for this OSS public beta. Users should
expect possible Gatekeeper warnings, verify the checksum first, and use the
normal macOS Privacy & Security manual allow path. Do not disable Gatekeeper
globally and do not use terminal quarantine-removal commands as an install step.

## Artifact

- File: `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- SHA-256: `ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13`
- Build channel: `beta-onion`
- Build commit: `e724bd39`
- Platform: macOS aarch64

## Shared Packet Boundary

These values must stay identical across the install guide, release notes,
GitHub Release body, and beta checklist:

- `artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13#beta-onion#e724bd39#v0.1.0-beta-onion-unsigned#macos-aarch64`
- `artifact_identity_fields=artifact#artifact_sha256#build_channel#build_commit#release_tag#platform`
- `artifact_current_head_aligned=true`
- `public_artifact_stale=false`
- `public_artifact_state=current`
- `next_owner_action=run-clean-macos-fresh-install-with-disposable-profile`
- `trust_model=same-github-release-assets#same-release-sha256#manual-privacy-security-allow-after-checksum#no-auto-update`
- `support_intake=redacted-diagnostics-only#no-raw-logs#no-crash-dumps#no-private-room-data#no-payloads#no-key-material`
- `generated_artifact_boundary=do-not-commit-public-release-or-beta-artifacts#no-dmg-rebuild#no-release-upload-or-edit`

The generated DMG packet is aligned to the current public packet source. Use
the same-release checksum and provenance to verify that packet; the matching
GitHub Release asset set is current.

## User Path

1. Download the DMG and matching `.sha256` from the same GitHub Release.
2. Verify the checksum before opening the DMG.
3. If macOS blocks the unsigned app, use the normal Privacy & Security manual
   allow path only after the checksum matches.
4. In the app, test local profile unlock, invite room setup, manual encrypted
   envelope export/import, reply/retry/cancel, local deletion, and redacted
   diagnostics copy.
5. Report only redacted diagnostics, broad failure class, checksum result, and
   recovery next action in public.

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
- Public diagnostics limited to status, build, failure class, recovery next
  action, desktop local-private-flow acceptance status/blockers/non-claims, and
  app-launch network boundary, with no crash upload, telemetry, raw log export,
  crash dump export, automated log collection, support bundle export, or raw
  diagnostic file export.
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

## Known User Limits

- macOS Apple Silicon is the only public app artifact in this release.
- Windows, Android, and iOS do not have public release artifacts here.
- Gatekeeper can block this unsigned/not notarized app until the user manually
  allows it after checksum verification.
- Manual encrypted envelope exchange is the practical default path for this
  beta; external onion delivery success is not claimed.
- Public support cannot use raw logs, endpoints, invite codes, payloads, message
  text, local paths, passphrases, private keys, or key material.

## Install

Read `INSTALL_UNSIGNED_MACOS.md` before opening the DMG.

Verify the checksum before using the macOS Privacy & Security manual allow path.
Do not use terminal quarantine-removal commands as an install step.

Do not use this beta for sensitive communication.

External onion delivery is outside the v0.1 public product claim. Same-machine
dual-profile rehearsal is development evidence only, not peer field-test evidence.
No peer report is expected or required for this v0.1 claim, and no external
delivery claim is made.

There is no auto-update. Every update is a manual GitHub Release download and
must be verified with the matching `.sha256` file.

The provenance JSON, `DEPENDENCY_INVENTORY.md`, and
`DEPENDENCY_LOCKFILES.sha256` are upload-set evidence only. The lockfile
evidence is exactly `Cargo.lock`, `apps/desktop-tauri/src-tauri/Cargo.lock`,
and `apps/desktop-tauri/package-lock.json`. They are not signing,
notarization, reproducible-build proof, SBOM, dependency audit completion, live
dependency scan, vulnerability triage signoff, or a secure messenger claim.

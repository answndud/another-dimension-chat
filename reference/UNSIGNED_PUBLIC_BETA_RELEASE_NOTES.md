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
  or raw log export.
- Manual GitHub Release download with SHA-256 verification.
- Public provenance JSON for the public DMG upload name.
- Public dependency inventory for reviewers.
- Public dependency lockfile hash baseline for reviewers.
- Public threat model and independent review packet for claim review.
- Explicit review-gap provenance showing no completed review and no reviewer
  signoff claim.

## What This Beta Does Not Claim

- Secure production messaging.
- Audited security.
- Production-ready E2EE.
- Reliable real-network Tor/onion delivery.
- Independently verified external two-machine onion delivery.
- Bridge/censorship support beyond tested configurations.
- Signed, notarized, auto-updating, reproducible, or supply-chain-reviewed release status.
- SBOM or dependency audit completion.
- Completed independent review.
- Reviewer signoff or public user safety signoff.
- Protection against device compromise, coercion, malicious contacts, or global traffic correlation.
- Crash upload, telemetry, raw log export, or safe publication of private logs.

## Install

Read `INSTALL_UNSIGNED_MACOS.md` before opening the DMG.

Verify the checksum before using the macOS Privacy & Security manual allow path.

Do not use this beta for sensitive communication.

External two-machine onion delivery has not yet been independently verified.
Same-machine dual-profile rehearsal is development evidence only, not peer
field-test evidence.

There is no auto-update. Every update is a manual GitHub Release download and
must be verified with the matching `.sha256` file.

The provenance JSON, `DEPENDENCY_INVENTORY.md`, and
`DEPENDENCY_LOCKFILES.sha256` are upload-set evidence only. They are not
signing, notarization, reproducible-build proof, SBOM, dependency audit
completion, or a secure messenger claim.

# Repository Governance

Another Dimension Chat is not a secure messenger release today.

This document records public repository guardrails for the unsigned experimental
public beta.

## Workflow

- Development is maintainer-driven on `main`.
- Public issues must use redacted templates.
- Sensitive security details must use private vulnerability reporting when
  available.
- If private reporting is unavailable, public reports must be minimal contact
  requests without exploit details or sensitive material.
- Private planning notes stay in ignored `docs/`.
- Generated public release folders stay ignored and are not committed.
- External peer evidence must come from real external reports, not synthetic
  local files.

## Direction Lock

v0.1 stays within the no-central-trusted-server direction:

- no phone-number identity
- no email identity
- no global account
- no searchable username directory
- no centralized contact discovery
- no central message server
- no push notification service
- no cloud backup
- no automatic network/onion work on app launch

## Release Guardrails

The public beta release remains:

- unsigned experimental public beta
- not notarized
- not audited
- not production-ready
- sensitive communication prohibited
- manual GitHub Release download only
- manual SHA-256 verification only
- no auto-update channel
- no signing/notarization claim
- no reproducible-build claim
- no SBOM or dependency audit claim
- no independent review completion claim
- no reviewer signoff claim
- no public user safety signoff claim
- no external two-machine onion delivery claim
- no fabricated external review or external peer evidence

Future public Windows, Android, and iOS artifacts must follow the same manual
GitHub Release, same-release checksum, public provenance, manifest,
no-auto-update, and non-security-signing boundary as the current macOS DMG path.
Store approval, notarization, Developer ID signing, SmartScreen reputation, Play
Store approval, App Store approval, or TestFlight distribution is not a security
boundary for v0.1.

## Redaction Guardrails

Public docs, issues, PRs, release assets, diagnostics, and support requests must
not include:

- bridge lines
- onion endpoints
- invite codes
- pairing payloads
- endpoint payloads
- envelope payloads
- safety phrases
- profile names
- contact identifiers
- message text
- local paths
- raw logs
- crash dumps
- screenshots that show private room data
- passphrases
- private keys
- key material
- private planning notes
- files from `docs/`
- local app data

## Explicit Non-Goals For Governance

These governance guardrails do not add:

- telemetry
- crash upload
- cloud reporting
- App Store distribution
- notarization
- Developer ID signing
- auto-update
- public security audit claim
- public user safety signoff

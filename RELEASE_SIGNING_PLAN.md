# Release Signing Implementation Plan

Another Dimension Chat does not have release signing today. This plan is a pre-implementation signing design, not signed artifact evidence and not release approval.

## Target Boundary

The first release signing path should use offline detached signatures for release checksums:

- Build release artifacts in a documented release environment.
- Produce a `SHA256SUMS` file that lists every release artifact.
- Sign `SHA256SUMS` with an offline long-term signing key using minisign, signify, or an equivalent detached-signature tool.
- Publish the public signing key fingerprint through a stable release channel.
- Document local verification steps for users and reviewers.

No auto-update or background update check is part of v0.1.

## Required Evidence Before Any Signing Claim

Before public copy can claim release signing is ready, the repository needs:

- A signing-key generation ceremony record.
- Offline signing-key storage, backup, rotation, and revocation procedure.
- A public-key fingerprint publication procedure.
- Release artifact naming and checksum rules.
- A checked command sequence that verifies `SHA256SUMS` and all listed artifacts.
- A dry-run release using disposable test keys that proves the verification procedure works without using real release keys.
- A release checklist that keeps unsigned, partially signed, stale-checksum, and missing-artifact states fail-closed.

## Non-Claims

- This plan does not create a release signing key.
- This plan does not sign any artifact.
- This plan does not prove artifact authenticity.
- This plan does not satisfy reproducible or equivalent binary verification.
- This plan does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Next Implementation Slice

The next signing slice should add a dry-run verification script that uses disposable test fixtures to prove the planned verification flow rejects missing signatures, stale checksums, and unsigned artifacts.

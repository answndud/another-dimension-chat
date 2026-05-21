# Release Signing Implementation Plan

Another Dimension Chat does not have release signing today. This plan is a pre-implementation signing design, not signed artifact evidence and not release approval.

## Target Boundary

The first release signing path should use offline detached signatures for release checksums:

- Build release artifacts in a documented release environment.
- Produce a `SHA256SUMS` file that lists every release artifact.
- Sign `SHA256SUMS` with an offline long-term signing key using the OpenSSL-compatible detached-signature path recorded in [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md).
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

The current dry-run verification prototype is `scripts/verify_release_signing_dry_run.sh`.

It uses disposable test fixtures to prove the planned checksum/signature verification flow rejects missing signatures, stale checksums, stale detached signature markers, and unsigned artifacts. The dry-run marker is not a real release signature and must not be used as release evidence.

The current fixture-only detached-signature prototype is `scripts/verify_release_detached_signature_fixture.sh`.

It uses disposable OpenSSL RSA fixture keys to sign and verify `SHA256SUMS`, then confirms missing signatures, stale checksums, stale detached signatures, and unsigned artifacts are rejected. It does not create a release signing key or sign release artifacts.

## Release Signing Tooling Decision Gate

The release signing tooling path is recorded in [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md).

Before release-candidate signing can proceed, the project must still implement the selected OpenSSL-compatible detached-signature path. The implementation record must cover:

- Operator tooling availability on supported maintainer platforms.
- Public-key fingerprint format and publication instructions.
- Verification command UX for users and external reviewers.
- Key generation, offline storage, backup, rotation, and revocation procedure.
- CI and release-script behavior when the selected tool is missing.
- How stale checksum files, missing signatures, and extra unsigned artifacts fail closed.

The OpenSSL fixture supports the selected tooling path, but it only proves that a detached-signature fixture can exercise checksum/signature verification semantics without release keys.

The first dry-run ceremony and command record is tracked in [RELEASE_SIGNING_CEREMONY_DRY_RUN.md](RELEASE_SIGNING_CEREMONY_DRY_RUN.md). It is a dry-run procedure only, not release signing evidence.

The disposable command harness for the ceremony record is `scripts/verify_release_signing_ceremony_harness.sh`. It uses temporary keys only and is not release signing evidence.

The real key ceremony evidence requirements are tracked in [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md). They define the required evidence package, not a real key ceremony.

The release artifact signing evidence requirements are tracked in [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md). They define the required signed artifact evidence package, not signed artifact evidence.

The release verification UX evidence requirements are tracked in [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md). They define user and reviewer verification evidence requirements, not signed artifact verification evidence.

The release signing candidate evidence package index is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md). It ties the required release-candidate evidence records together, but it is not release signing evidence.

The next signing slice should define a candidate evidence collection runbook while keeping real artifact signing and verification out of local verification until a candidate exists.

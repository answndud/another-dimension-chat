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

The candidate evidence collection runbook is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md). It defines collection order and fail-closed rules, but it is not candidate evidence.

The disposable candidate evidence package fixture is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md), with fixture behavior checked by `scripts/verify_release_signing_candidate_evidence_fixture.sh`. It rejects missing, template-only, placeholder, and mismatched fixture evidence states without creating release evidence.

The candidate evidence package fixture coverage audit is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md), with audit checks in `scripts/verify_release_signing_candidate_evidence_fixture_audit.sh`. It records fixture coverage, not release evidence.

The release-note non-claim guard is tracked in [RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md](RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md), with static checks in `scripts/verify_release_signing_release_note_non_claim_guard.sh`. It constrains release-note wording while signing remains incomplete.

The release signing evidence package directory layout fixture is tracked in [RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_FIXTURE.md](RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_FIXTURE.md), with fixture checks in `scripts/verify_release_signing_evidence_package_layout_fixture.sh`. It checks disposable package layout only, not candidate evidence.

The release signing evidence package layout coverage audit is tracked in [RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md](RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md), with audit checks in `scripts/verify_release_signing_evidence_package_layout_audit.sh`. It records fixture layout coverage, not release evidence.

The release signing candidate evidence manifest consistency fixture is tracked in [RELEASE_SIGNING_CANDIDATE_MANIFEST_CONSISTENCY_FIXTURE.md](RELEASE_SIGNING_CANDIDATE_MANIFEST_CONSISTENCY_FIXTURE.md), with fixture checks in `scripts/verify_release_signing_candidate_manifest_consistency_fixture.sh`. It checks disposable manifest digest consistency only, not candidate evidence.

The release signing candidate evidence manifest consistency coverage audit is tracked in [RELEASE_SIGNING_CANDIDATE_MANIFEST_CONSISTENCY_AUDIT.md](RELEASE_SIGNING_CANDIDATE_MANIFEST_CONSISTENCY_AUDIT.md), with audit checks in `scripts/verify_release_signing_candidate_manifest_consistency_audit.sh`. It records fixture coverage and limits only, not candidate evidence.

The release signing candidate evidence package checksum coverage audit is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_AUDIT.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_AUDIT.md), with audit checks in `scripts/verify_release_signing_candidate_evidence_package_checksum_audit.sh`. It records fixture checksum and digest coverage only, not candidate evidence.

The release signing candidate evidence package checksum non-claim guard is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_NON_CLAIM_GUARD.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_NON_CLAIM_GUARD.md), with guard checks in `scripts/verify_release_signing_candidate_evidence_package_checksum_non_claim_guard.sh`. It prevents fixture checksum coverage from implying release evidence or approval.

The release signing candidate evidence package checksum guard coverage audit is tracked in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_GUARD_AUDIT.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_GUARD_AUDIT.md), with audit checks in `scripts/verify_release_signing_candidate_evidence_package_checksum_guard_audit.sh`. It records guard coverage and limits only, not release evidence.

The next signing slice should define release signing candidate evidence package index checksum binding requirements while keeping real artifact signing and verification out of local verification until a candidate exists.

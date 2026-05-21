# Release Signing Candidate Signed Artifact Verification Guard Audit Coverage Checks

Coverage-check status: signed-artifact verification guard audit coverage checks only, not signed artifact verification evidence.

This document records what `scripts/verify_release_signing_candidate_signed_artifact_verification_guard_audit.sh` must keep checking. It is a verifier coverage map for [RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_GUARD_AUDIT.md](RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_GUARD_AUDIT.md) and [RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md](RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md), not release-candidate evidence, signed artifact verification, detached signature verification evidence, artifact authenticity proof, release signing approval, or release approval.

## Required Coverage Checks

The guard audit verifier must keep checking that the guard audit records:

- `Audit status: signed-artifact verification guard coverage audit only, not signed artifact verification evidence`
- `RELEASE_SIGNING_CANDIDATE_SIGNED_ARTIFACT_VERIFICATION_NON_CLAIM_GUARD.md`
- `fixture signed-artifact verification coverage is not signed artifact verification evidence`
- `no detached signature verification evidence exists`
- `no artifact authenticity proof exists`
- `not release-ready or v0.1-security-ready`
- `real release artifact hashes have been compared against `SHA256SUMS``
- `detached signatures have been verified for a release candidate`
- `signed artifact verification has passed`
- `artifact authenticity has been proven`
- `candidate evidence has been collected`
- `release signing has been approved`
- `a release candidate has been approved`
- `release hardening gates have passed`
- `Signed-artifact verification guard coverage is not signed artifact verification evidence`
- `Signed-artifact verification guard coverage is not detached signature verification evidence`
- `Signed-artifact verification guard coverage is not artifact authenticity proof`
- `Signed-artifact verification guard coverage is not release signing approval`
- `Signed-artifact verification guard coverage is not release approval`

The guard audit verifier must keep checking that the non-claim guard records:

- `Guard status: signed-artifact verification non-claim guard only, not signed artifact verification evidence`
- `Signed-artifact verification coverage remains fixture-only`
- `fixture signed-artifact verification coverage is not signed artifact verification evidence`
- `no detached signature verification evidence exists`
- `no artifact authenticity proof exists`
- `not release-ready or v0.1-security-ready`
- `real release artifact hashes have been compared against `SHA256SUMS``
- `detached signatures have been verified for a release candidate`
- `signed artifact verification has passed`
- `artifact authenticity has been proven`
- `candidate evidence has been collected`
- `release signing has been approved`
- `a release candidate has been approved`
- `release hardening gates have passed`
- `does not sign release artifacts`
- `does not verify detached signatures`
- `does not prove artifact authenticity`

## Known Limits

- These coverage checks do not sign release artifacts.
- These coverage checks do not checksum real release artifacts.
- These coverage checks do not compare real release artifact hashes against `SHA256SUMS`.
- These coverage checks do not verify detached signatures.
- These coverage checks do not prove artifact authenticity.
- These coverage checks do not collect candidate-specific release evidence.
- These coverage checks do not approve release signing.
- These coverage checks do not approve a release candidate or release.
- These coverage checks do not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Guard audit coverage checks are not signed artifact verification evidence.
- Guard audit coverage checks are not detached signature verification evidence.
- Guard audit coverage checks are not artifact authenticity proof.
- Guard audit coverage checks are not release signing approval.
- Guard audit coverage checks are not release approval.

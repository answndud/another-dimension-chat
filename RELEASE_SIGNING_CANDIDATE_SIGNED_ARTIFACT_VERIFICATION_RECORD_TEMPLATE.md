# Release Signing Candidate Signed Artifact Verification Record Template

This template is not signed artifact verification evidence, detached signature verification evidence, artifact authenticity proof, release signing approval, release approval, or a security-ready claim.

Use this template only when preparing a future release-candidate signed-artifact verification record. Every placeholder must be replaced with release-candidate-specific evidence before any signed artifact verification claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Release tag: `TODO-RELEASE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platforms: `TODO-TARGET-PLATFORMS`
- Artifact manifest: `TODO-ARTIFACT-MANIFEST-PATH`
- Artifact manifest SHA-256: `TODO-ARTIFACT-MANIFEST-SHA256`

## Signed Artifact Inputs

- `SHA256SUMS` path: `TODO-SHA256SUMS-PATH`
- `SHA256SUMS` SHA-256: `TODO-SHA256SUMS-SHA256`
- `SHA256SUMS.sig` path: `TODO-SHA256SUMS-SIG-PATH`
- `SHA256SUMS.sig` SHA-256: `TODO-SHA256SUMS-SIG-SHA256`
- Public signing-key fingerprint: `TODO-PUBLIC-SIGNING-KEY-FINGERPRINT`
- Key ceremony record: `TODO-KEY-CEREMONY-RECORD`

## Verification Commands and Transcripts

- Signature verification command: `TODO-SIGNATURE-VERIFICATION-COMMAND`
- Signature verification transcript: `TODO-SIGNATURE-VERIFICATION-TRANSCRIPT`
- Artifact hash verification command: `TODO-ARTIFACT-HASH-VERIFICATION-COMMAND`
- Artifact hash verification transcript: `TODO-ARTIFACT-HASH-VERIFICATION-TRANSCRIPT`
- Failure transcript: `TODO-FAILURE-TRANSCRIPT`

## Required Binding Checks

Before this template can become evidence, the filled record must bind to:

- the same `candidate_commit`, `release_tag`, `artifact_manifest`, and `artifact_manifest_sha256` as `CANDIDATE_EVIDENCE_INDEX`;
- the same `public_key_fingerprint` as the matching key ceremony record;
- the exact `SHA256SUMS` and `SHA256SUMS.sig` files used in the verification transcripts;
- the exact artifact set listed in `artifact_manifest`.

## Reviewer and Blocker State

- Reviewer: `TODO-REVIEWER`
- Review timestamp: `TODO-REVIEW-TIMESTAMP`
- Blocker status: `TODO-BLOCKER-STATUS`
- Unresolved blocker evidence: `TODO-UNRESOLVED-BLOCKER-EVIDENCE`

## Verification Classification

Choose exactly one when real candidate evidence exists:

- `TODO-CLASSIFICATION-SIGNED-ARTIFACT-VERIFICATION-EVIDENCE`
- `TODO-CLASSIFICATION-SIGNED-ARTIFACT-VERIFICATION-BLOCKED`

Until real evidence exists, this template must remain classified as:

```text
not-signed-artifact-verification-evidence
```

## Non-Claims

- This template does not sign release artifacts.
- This template does not checksum real release artifacts.
- This template does not compare real release artifact hashes against `SHA256SUMS`.
- This template does not verify detached signatures.
- This template does not prove artifact authenticity.
- This template does not collect candidate-specific release evidence.
- This template does not create or approve a release candidate.
- This template does not approve release signing.
- This template does not satisfy release hardening gates.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

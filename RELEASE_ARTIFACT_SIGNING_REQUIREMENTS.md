# Release Artifact Signing Evidence Requirements

Another Dimension Chat still does not have release signing, signed artifacts, signed artifact verification evidence, or release approval.

Requirement status: evidence requirements only, not artifact signing evidence.

This document defines the candidate-specific evidence required before signed release artifacts can support any release signing claim. It does not sign artifacts, verify real artifacts, or approve a release candidate.

## Required Artifact Evidence

A candidate-specific signed artifact record must include:

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Release artifact set name: `TODO-ARTIFACT-SET`
- Build profile and target platforms: `TODO-BUILD-PROFILE-AND-PLATFORMS`
- Signing key ceremony reference: `TODO-KEY-CEREMONY-REFERENCE`
- Public key fingerprint: `TODO-PUBLIC-KEY-FINGERPRINT`
- Checksum file path: `TODO-SHA256SUMS-PATH`
- Detached signature path: `TODO-SHA256SUMS-SIG-PATH`
- Signing command transcript: `TODO-SIGNING-COMMAND-TRANSCRIPT`
- Reviewer verification transcript: `TODO-VERIFICATION-TRANSCRIPT`

## Artifact Manifest

Every release artifact must be listed in `SHA256SUMS` and every listed artifact must be present.

| Artifact path | Bytes | SHA-256 | Platform | Signed? |
| --- | ---: | --- | --- | --- |
| `TODO-ARTIFACT-PATH` | `TODO-BYTES` | `TODO-SHA256` | `TODO-PLATFORM` | `TODO-YES-NO` |

## Required Verification Evidence

Before any signed artifact verification claim, the evidence package must contain:

| Evidence item | Required content | Status |
| --- | --- | --- |
| Signed checksum manifest | `SHA256SUMS` with every release artifact and no extra entries | `TODO-STATUS` |
| Detached checksum signature | `SHA256SUMS.sig` produced by the release signing key | `TODO-STATUS` |
| Public key fingerprint | Fingerprint matching the release key ceremony and publication channels | `TODO-STATUS` |
| Signature verification transcript | `openssl dgst -sha256 -verify ... -signature SHA256SUMS.sig SHA256SUMS` output | `TODO-STATUS` |
| Artifact hash verification transcript | `shasum -a 256 --check SHA256SUMS` output | `TODO-STATUS` |
| Fail-closed checks | Missing signature, stale checksum, stale signature, missing artifact, extra artifact rejection | `TODO-STATUS` |

## Gate To Signing Claim

Signed artifact evidence is incomplete until a candidate-specific record proves that:

- The signing key ceremony evidence exists and matches the public fingerprint used for verification.
- The exact release candidate artifact set is listed in `SHA256SUMS`.
- `SHA256SUMS.sig` verifies against the published public key.
- Each listed artifact hash matches the candidate artifact.
- No unsigned extra artifact is present in the release artifact set.
- User/reviewer verification commands are documented and tested against the candidate artifact set.

## Non-Claims

- This requirements document does not sign release artifacts.
- This requirements document does not verify real release artifacts.
- This requirements document does not prove artifact authenticity.
- This requirements document does not satisfy release signing.
- This requirements document does not make Another Dimension Chat release-ready or v0.1-security-ready.

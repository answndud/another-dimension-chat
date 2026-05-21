# Release Verification UX Evidence Requirements

Another Dimension Chat does not have release signing today. It does not have signed release artifacts, signed artifact verification evidence, release verification UX approval, or release approval.

Requirement status: evidence requirements only, not signed artifact verification evidence.

This document defines the evidence package required before user-facing or reviewer-facing verification instructions can support any release signing claim. It is a requirements document, not a release record.

## Scope

The verification UX evidence package must cover the manual detached-signature path from [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md):

- `SHA256SUMS` lists every release artifact for the exact candidate.
- `SHA256SUMS.sig` is a detached signature over that checksum file.
- A public signing-key fingerprint is published through a stable release channel.
- Users and reviewers can verify the signature and every listed artifact hash without relying on a central trusted server.

No auto-update or background update verification UX is part of this v0.1 requirement.

## Required Evidence Fields

| Field | Required placeholder | Requirement |
| --- | --- | --- |
| Candidate identity | `TODO-CANDIDATE-COMMIT` | Exact release-candidate commit, tag, build profile, and supported platform set. |
| Artifact set | `TODO-ARTIFACT-SET` | Complete list of expected archives, installers, checksums, and signatures for the candidate. |
| Fingerprint copy | `TODO-PUBLIC-KEY-FINGERPRINT-COPY` | Exact public-key fingerprint text and the location where users see it. |
| Release/download copy | `TODO-RELEASE-PAGE-COPY` | User-facing instructions shown near downloads, including warnings when verification cannot be completed. |
| Signature command | `TODO-SIGNATURE-VERIFY-COMMAND` | Copy-pasteable command that verifies `SHA256SUMS.sig` against `SHA256SUMS` and the release public key. |
| Hash command | `TODO-HASH-VERIFY-COMMAND` | Copy-pasteable command that verifies every artifact listed in `SHA256SUMS`. |
| Expected success output | `TODO-EXPECTED-SUCCESS-OUTPUT` | Reviewer transcript showing expected signature and hash verification success for the candidate. |
| Expected failure copy | `TODO-EXPECTED-FAILURE-COPY` | User-facing failure copy for missing signatures, stale signatures, stale checksums, unsigned artifacts, extra artifacts, and fingerprint mismatch. |
| Reviewer transcript | `TODO-REVIEWER-TRANSCRIPT` | Independent reviewer transcript of signature verification, hash verification, and failure-state checks. |
| Non-claim copy | `TODO-NON-CLAIM-COPY` | Copy that says verification instructions do not make the app a secure messenger release. |

## Required UX Checks

Before this requirement can be satisfied for a candidate, a reviewer must confirm:

- The fingerprint display location is stable and visible before artifact download.
- The release/download page does not imply the app is safe for high-risk communication.
- The signature verification command fails closed for a missing signature, stale signature, stale checksum, and fingerprint mismatch.
- The hash verification command fails closed for a missing artifact, extra artifact, modified artifact, and unlisted artifact.
- The success transcript and failure transcript include the exact candidate commit, tag, artifact set, and platform.
- Failure copy instructs users not to run the artifact when verification cannot be completed.
- The UX does not ask users to trust a central account, central discovery service, central message server, or silent updater.

## Non-Claims

- This document does not verify real release artifacts.
- This document does not prove artifact authenticity.
- This document does not satisfy release signing.
- This document does not approve verification UX for a release candidate.
- This document does not satisfy reproducible or equivalent binary verification.
- This document does not make Another Dimension Chat release-ready or v0.1-security-ready.

# Release Signing Candidate Evidence Index Checksum Binding Requirements

Requirement status: index checksum binding requirements only, not candidate evidence.

Another Dimension Chat does not have a release-candidate evidence package today. This document defines the checksum and digest fields that a future candidate evidence index must bind together before release signing can be claimed. It does not create release evidence, checksum real artifacts, verify detached signatures, prove artifact authenticity, approve release signing, or approve a release.

## Required Index Fields

A future candidate evidence index must record:

- `candidate_commit`: exact release-candidate commit under review.
- `release_tag`: exact release tag under review.
- `artifact_manifest`: relative path to the release artifact manifest inside the candidate evidence package.
- `artifact_manifest_sha256`: SHA-256 digest of that artifact manifest file.
- `classification`: evidence classification for the index.
- `blocker_status`: explicit blocker state for the candidate evidence package.

The index must also list every required gate record path for:

- key ceremony;
- signed artifact evidence;
- verification UX evidence;
- binary verification evidence;
- dependency review evidence;
- release-candidate signoff evidence;
- external review readiness evidence;
- update and installer integrity evidence.

## Required Record Binding

Every required evidence record must bind back to the index by recording the same:

- `candidate_commit`;
- `release_tag`;
- `artifact_manifest`;
- `artifact_manifest_sha256`.

Every required evidence record must also record:

- `classification`;
- `blocker_status`.

## Fail-Closed Requirements

A future candidate evidence package verifier must reject:

- missing candidate index;
- missing `artifact_manifest`;
- missing `artifact_manifest_sha256`;
- empty artifact manifest file;
- stale `artifact_manifest_sha256`;
- mismatched record `candidate_commit`;
- mismatched record `release_tag`;
- mismatched record `artifact_manifest`;
- mismatched record `artifact_manifest_sha256`;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Non-Claims

- These requirements do not checksum real release artifacts.
- These requirements do not compare real release artifact hashes against `SHA256SUMS`.
- These requirements do not verify detached signatures.
- These requirements do not prove artifact authenticity.
- These requirements do not collect candidate-specific release evidence.
- These requirements do not create or approve a release candidate.
- These requirements do not approve release signing.
- These requirements do not satisfy release hardening gates.
- These requirements do not make Another Dimension Chat release-ready or v0.1-security-ready.

# Release Signing Candidate Signed Artifact Verification Requirements

Requirement status: signed-artifact verification requirements only, not signed artifact verification evidence.

Another Dimension Chat does not have a release-candidate signed artifact verification record today. This document defines the required fields and fail-closed checks for a future candidate evidence package. It does not sign artifacts, verify real release artifacts, prove artifact authenticity, approve release signing, or approve a release.

## Required Record Fields

A future candidate signed-artifact verification record must include:

- `candidate_commit`: exact release-candidate commit under review.
- `release_tag`: exact release tag under review.
- `artifact_manifest`: relative path to the release artifact manifest inside the candidate evidence package.
- `artifact_manifest_sha256`: SHA-256 digest of that artifact manifest file.
- `sha256sums_path`: relative path to `SHA256SUMS`.
- `sha256sums_sha256`: SHA-256 digest of `SHA256SUMS`.
- `sha256sums_sig_path`: relative path to `SHA256SUMS.sig`.
- `sha256sums_sig_sha256`: SHA-256 digest of `SHA256SUMS.sig`.
- `public_key_fingerprint`: release signing public key fingerprint used for verification.
- `key_ceremony_record`: relative path to the matching key ceremony record.
- `signature_verification_command`: exact command used to verify the detached signature.
- `signature_verification_transcript`: transcript proving `SHA256SUMS.sig` verifies `SHA256SUMS`.
- `artifact_hash_verification_command`: exact command used to verify listed artifact hashes.
- `artifact_hash_verification_transcript`: transcript proving listed artifact hashes match candidate artifacts.
- `failure_transcript`: transcript covering required failure states.
- `reviewer`: reviewer identity or review handle for the verification record.
- `review_timestamp`: review timestamp for the exact candidate.
- `classification`: evidence classification for the record.
- `blocker_status`: explicit blocker state for signed-artifact verification.

## Required Binding

The future candidate signed-artifact verification record must bind to:

- the same `candidate_commit`, `release_tag`, `artifact_manifest`, and `artifact_manifest_sha256` as `CANDIDATE_EVIDENCE_INDEX`;
- the same `public_key_fingerprint` as the matching key ceremony record;
- the exact `SHA256SUMS` and `SHA256SUMS.sig` files used in the verification transcripts;
- the exact artifact set listed in `artifact_manifest`.

## Fail-Closed Requirements

A future candidate evidence package verifier must reject:

- missing signed-artifact verification record;
- missing `SHA256SUMS`;
- missing `SHA256SUMS.sig`;
- missing public key fingerprint;
- mismatched `candidate_commit`;
- mismatched `release_tag`;
- mismatched `artifact_manifest`;
- mismatched `artifact_manifest_sha256`;
- mismatched `sha256sums_sha256`;
- mismatched `sha256sums_sig_sha256`;
- key ceremony fingerprint mismatch;
- missing signature verification transcript;
- missing artifact hash verification transcript;
- missing failure transcript;
- stale signature transcript;
- stale artifact hash transcript;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Non-Claims

- These requirements do not sign release artifacts.
- These requirements do not checksum real release artifacts.
- These requirements do not compare real release artifact hashes against `SHA256SUMS`.
- These requirements do not verify detached signatures.
- These requirements do not prove artifact authenticity.
- These requirements do not collect candidate-specific release evidence.
- These requirements do not create or approve a release candidate.
- These requirements do not approve release signing.
- These requirements do not satisfy release hardening gates.
- These requirements do not make Another Dimension Chat release-ready or v0.1-security-ready.

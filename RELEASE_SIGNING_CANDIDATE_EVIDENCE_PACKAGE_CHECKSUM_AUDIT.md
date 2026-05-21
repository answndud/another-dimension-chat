# Release Signing Candidate Evidence Package Checksum Coverage Audit

Audit status: evidence package checksum coverage audit only, not candidate evidence.

This audit records the checksum and digest coverage currently provided by disposable release signing candidate evidence fixtures. It is a coverage map for fixture behavior only, not release-candidate evidence, signed artifact verification, artifact authenticity proof, or release approval.

## Covered Fixture Behavior

The disposable candidate evidence package fixture checks that:

- `CANDIDATE_EVIDENCE_INDEX` records an `artifact_manifest` value.
- Every required evidence record binds to the same fixture `artifact_manifest` value as the index.
- Mismatched artifact manifest values are rejected.
- Template-only, placeholder, and empty-blocker records are rejected before they can be treated as evidence.

The disposable manifest consistency fixture extends that coverage by checking that:

- `ARTIFACT_MANIFEST` exists and is non-empty.
- `CANDIDATE_EVIDENCE_INDEX` records `artifact_manifest_sha256`.
- The index `artifact_manifest_sha256` matches the SHA-256 digest of the disposable `ARTIFACT_MANIFEST`.
- Every required evidence record records the same `artifact_manifest_sha256` as the index.
- Stale index manifest digests and mismatched record manifest digests are rejected.

## Required Reject States

The checksum coverage remains useful only if the fixture verifiers reject:

- mismatched artifact manifest
- missing artifact manifest
- empty artifact manifest
- stale index manifest digest
- mismatched record manifest digest
- template-only evidence
- placeholder evidence
- empty blocker status

## Known Limits

- This audit does not checksum real release artifacts.
- This audit does not compare real release artifact hashes against `SHA256SUMS`.
- This audit does not verify detached signatures.
- This audit does not prove artifact authenticity.
- This audit does not create or approve candidate evidence.
- This audit does not approve release signing.
- This audit does not approve a release candidate or release.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Fixture checksum coverage is not candidate evidence.
- Fixture checksum coverage is not signed artifact verification.
- Fixture checksum coverage is not artifact authenticity proof.
- Fixture checksum coverage is not release signing approval.
- Fixture checksum coverage is not release approval.

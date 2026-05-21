# Release Signing Candidate Manifest Consistency Coverage Audit

Audit status: manifest consistency coverage audit only, not candidate evidence.

This audit records what the disposable manifest consistency fixture covers today. It is a coverage map for `scripts/verify_release_signing_candidate_manifest_consistency_fixture.sh`, not release-candidate evidence, signed artifact verification, or release approval.

## Covered Fixture Behavior

The fixture builds a disposable candidate evidence package and checks that:

- `ARTIFACT_MANIFEST` exists and is non-empty.
- `CANDIDATE_EVIDENCE_INDEX` contains the fixture `candidate_commit`.
- `CANDIDATE_EVIDENCE_INDEX` contains the fixture `release_tag`.
- `CANDIDATE_EVIDENCE_INDEX` contains `artifact_manifest_sha256`.
- Every required record binds to the same candidate commit as the index.
- Every required record binds to the same release tag as the index.
- Every required record binds to the same artifact manifest digest as the index.
- Every required record remains classified as `fixture-filled-not-release-evidence`.

The fixture rejects:

- missing artifact manifest
- empty artifact manifest
- stale index manifest digest
- mismatched record candidate commit
- mismatched record release tag
- mismatched record manifest digest
- template-only evidence
- placeholder evidence

## Known Limits

- This audit does not inspect real release artifacts.
- This audit does not verify real signed artifacts.
- This audit does not create or approve candidate evidence.
- This audit does not verify artifact authenticity.
- This audit does not approve release signing.
- This audit does not approve a release candidate or release.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Fixture manifest consistency coverage is not candidate evidence.
- Fixture manifest consistency coverage is not signed artifact verification.
- Fixture manifest consistency coverage is not artifact authenticity proof.
- Fixture manifest consistency coverage is not release signing approval.
- Fixture manifest consistency coverage is not release approval.

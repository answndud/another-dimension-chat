# Release Signing Candidate Evidence Index Checksum Fixture Coverage Audit

Audit status: index checksum fixture coverage audit only, not candidate evidence.

This audit records what the disposable index checksum binding fixture covers today. It is a coverage map for `scripts/verify_release_signing_candidate_evidence_index_checksum_fixture.sh`, not release-candidate evidence, signed artifact verification, artifact authenticity proof, or release approval.

## Covered Fixture Behavior

The fixture builds a disposable candidate evidence package and checks that:

- `CANDIDATE_EVIDENCE_INDEX` exists.
- `ARTIFACT_MANIFEST` exists and is non-empty.
- `CANDIDATE_EVIDENCE_INDEX` contains the fixture `candidate_commit`.
- `CANDIDATE_EVIDENCE_INDEX` contains the fixture `release_tag`.
- `CANDIDATE_EVIDENCE_INDEX` contains `artifact_manifest`.
- `CANDIDATE_EVIDENCE_INDEX` contains `artifact_manifest_sha256`.
- `CANDIDATE_EVIDENCE_INDEX` contains fixture `classification`.
- `CANDIDATE_EVIDENCE_INDEX` contains non-empty `blocker_status`.
- `artifact_manifest_sha256` matches the disposable `ARTIFACT_MANIFEST`.
- Every required record path is listed exactly once.
- Every required record binds to the same candidate commit as the index.
- Every required record binds to the same release tag as the index.
- Every required record binds to the same artifact manifest path as the index.
- Every required record binds to the same artifact manifest digest as the index.
- Every required record remains classified as `fixture-filled-not-release-evidence`.
- Every required record has a non-empty blocker status.

The fixture rejects:

- missing candidate index
- missing artifact manifest
- missing artifact manifest digest
- empty artifact manifest
- stale artifact manifest digest
- mismatched record candidate commit
- mismatched record release tag
- mismatched record artifact manifest
- mismatched record artifact manifest digest
- template-only evidence
- placeholder evidence
- empty blocker status

## Known Limits

- This audit does not checksum real release artifacts.
- This audit does not compare real release artifact hashes against `SHA256SUMS`.
- This audit does not verify detached signatures.
- This audit does not prove artifact authenticity.
- This audit does not collect candidate-specific release evidence.
- This audit does not approve release signing.
- This audit does not approve a release candidate or release.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Index checksum fixture coverage is not candidate evidence.
- Index checksum fixture coverage is not signed artifact verification.
- Index checksum fixture coverage is not artifact authenticity proof.
- Index checksum fixture coverage is not release signing approval.
- Index checksum fixture coverage is not release approval.

# Release Signing Candidate Evidence Index Checksum Binding Fixture

Another Dimension Chat does not have a release-candidate evidence package today. This fixture does not collect candidate evidence, checksum real release artifacts, verify detached signatures, approve release signing, or approve a release.

Fixture status: index checksum binding fixture only, not candidate evidence.

This fixture defines a disposable candidate evidence package shape for checking that the candidate evidence index, artifact manifest, and required records bind to the same candidate commit, release tag, artifact manifest path, and artifact manifest SHA-256 digest.

## Fixture Coverage

The index checksum binding fixture verifier must accept only a disposable package where:

- `CANDIDATE_EVIDENCE_INDEX` exists;
- `ARTIFACT_MANIFEST` exists and is non-empty;
- `CANDIDATE_EVIDENCE_INDEX` records `candidate_commit`, `release_tag`, `artifact_manifest`, `artifact_manifest_sha256`, `classification`, and `blocker_status`;
- `artifact_manifest` points to the disposable `ARTIFACT_MANIFEST`;
- `artifact_manifest_sha256` matches the SHA-256 digest of the disposable `ARTIFACT_MANIFEST`;
- every required record path is listed exactly once;
- every required record binds to the same `candidate_commit`;
- every required record binds to the same `release_tag`;
- every required record binds to the same `artifact_manifest`;
- every required record binds to the same `artifact_manifest_sha256`;
- every required record records fixture classification and a non-empty blocker status;
- no index or record contains `TODO`, `template-only`, `dry-run-only`, `requirements-only`, or `placeholder`.

The required disposable records are:

- key ceremony;
- signed artifact evidence;
- verification UX evidence;
- binary verification evidence;
- dependency review evidence;
- release-candidate signoff evidence;
- external review readiness evidence;
- update and installer integrity evidence.

The index checksum binding fixture verifier must reject:

- missing candidate index;
- missing artifact manifest;
- missing artifact manifest digest;
- empty artifact manifest;
- stale artifact manifest digest;
- mismatched record candidate commit;
- mismatched record release tag;
- mismatched record artifact manifest;
- mismatched record artifact manifest digest;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Non-Claims

- This fixture does not checksum real release artifacts.
- This fixture does not compare real release artifact hashes against `SHA256SUMS`.
- This fixture does not verify detached signatures.
- This fixture does not prove artifact authenticity.
- This fixture does not collect candidate-specific release evidence.
- This fixture does not create or approve a release candidate.
- This fixture does not approve release signing.
- This fixture does not satisfy release hardening gates.
- This fixture does not make Another Dimension Chat release-ready or v0.1-security-ready.

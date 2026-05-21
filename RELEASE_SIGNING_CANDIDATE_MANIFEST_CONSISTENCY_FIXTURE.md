# Release Signing Candidate Evidence Manifest Consistency Fixture

Another Dimension Chat does not have a release-candidate evidence package today. This fixture does not create candidate evidence, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Fixture status: manifest consistency fixture only, not candidate evidence.

This fixture defines how a future candidate evidence package should bind every evidence record to the same candidate commit, release tag, and artifact manifest digest. It uses only disposable fixture files.

## Fixture Coverage

The manifest consistency fixture verifier must accept only a disposable package where:

- `ARTIFACT_MANIFEST` exists and is non-empty;
- `CANDIDATE_EVIDENCE_INDEX` records the fixture candidate commit, release tag, and `artifact_manifest_sha256` for the `ARTIFACT_MANIFEST`;
- every required evidence record records the same fixture candidate commit;
- every required evidence record records the same fixture release tag;
- every required evidence record records the same `ARTIFACT_MANIFEST` SHA-256 digest;
- no evidence record contains `TODO`, `template-only`, `dry-run-only`, `requirements-only`, or `placeholder`.

The manifest consistency fixture verifier must reject:

- missing artifact manifest;
- empty artifact manifest;
- stale index manifest digest;
- mismatched record candidate commit;
- mismatched record release tag;
- mismatched record manifest digest;
- template-only evidence;
- placeholder evidence.

## Non-Claims

- This fixture does not collect candidate-specific release evidence.
- This fixture does not create or approve a release candidate.
- This fixture does not sign release artifacts.
- This fixture does not verify signed release artifacts.
- This fixture does not approve release signing.
- This fixture does not satisfy release hardening gates.
- This fixture does not make Another Dimension Chat release-ready or v0.1-security-ready.

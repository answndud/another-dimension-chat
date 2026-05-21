# Release Signing Evidence Package Directory Layout Fixture

Another Dimension Chat does not have a release-candidate evidence package today. This fixture does not create candidate evidence, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Fixture status: directory layout fixture only, not candidate evidence.

This fixture defines the expected directory layout for a future release signing evidence package. It uses only disposable fixture files and is meant to keep future evidence collection structured before a real candidate exists.

## Expected Layout

A future evidence package should keep release signing evidence under one candidate-scoped root:

```text
candidate-evidence/
  CANDIDATE_EVIDENCE_INDEX
  release-signing/
    key-ceremony.record
    signed-artifacts.record
    verification-ux.record
  binary-verification/
    binary-verification.record
  dependency-review/
    dependency-review.record
  signoff/
    release-signoff.record
  external-review/
    external-review.record
  update-integrity/
    update-integrity.record
  blockers/
    unresolved-blockers.record
```

## Fixture Coverage

The layout fixture verifier must accept only a disposable package where:

- the candidate root contains `CANDIDATE_EVIDENCE_INDEX`;
- every required gate directory exists;
- every required fixture record exists at the expected relative path;
- no required record is misplaced at the root;
- no unknown top-level directory exists;
- no unknown record exists in a gate directory;
- every required fixture record is non-empty.

The layout fixture verifier must reject:

- missing candidate index;
- missing gate directory;
- missing required record;
- misplaced root record;
- unknown top-level directory;
- unknown record inside a gate directory;
- empty required record.

## Non-Claims

- This fixture does not collect candidate-specific release evidence.
- This fixture does not create or approve a release candidate.
- This fixture does not sign release artifacts.
- This fixture does not verify signed release artifacts.
- This fixture does not approve release signing.
- This fixture does not satisfy release hardening gates.
- This fixture does not make Another Dimension Chat release-ready or v0.1-security-ready.

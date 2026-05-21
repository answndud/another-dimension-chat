# Release Signing Candidate Evidence Package Fixture

Another Dimension Chat does not have a release-candidate evidence package today. This fixture does not create release evidence, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Fixture status: disposable fixture only, not candidate evidence.

This fixture records the fail-closed behavior expected from a future candidate evidence package verifier. It is tied to [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md) and [RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md), but it uses only temporary files and fixture records.

## Fixture Coverage

The fixture verifier must accept a complete disposable package only when:

- every required evidence record exists;
- every record uses the same fixture candidate commit, release tag, and artifact manifest;
- every record is classified as `fixture-filled-not-release-evidence`;
- no record contains `TODO`, `template-only`, `dry-run-only`, `requirements-only`, or `placeholder`;
- no required blocker field is empty.

The fixture verifier must reject:

- missing candidate index;
- missing key ceremony record;
- missing signed artifact evidence record;
- missing verification UX evidence record;
- missing binary verification evidence record;
- missing dependency review evidence record;
- missing signoff evidence record;
- missing external review evidence record;
- missing update integrity evidence record;
- mismatched candidate commit;
- mismatched release tag;
- mismatched artifact manifest;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Non-Claims

- This fixture does not collect candidate-specific release evidence.
- This fixture does not create or approve a release candidate.
- This fixture does not sign release artifacts.
- This fixture does not verify signed release artifacts.
- This fixture does not approve release signing.
- This fixture does not satisfy release hardening gates.
- This fixture does not make Another Dimension Chat release-ready or v0.1-security-ready.

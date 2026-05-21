# Release Signing Candidate Evidence Fixture Coverage Audit

Another Dimension Chat does not have a release-candidate evidence package today. This audit does not create candidate evidence, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Audit status: fixture coverage audit only, not candidate evidence.

This audit records what the disposable fixture verifier in `scripts/verify_release_signing_candidate_evidence_fixture.sh` currently checks. It exists to prevent the fixture from being mistaken for release evidence and to keep its coverage explicit.

## Fixture Coverage Confirmed

The fixture verifier currently accepts only a disposable package where:

- the candidate index exists;
- every required fixture evidence record exists;
- every record uses the same fixture candidate commit;
- every record uses the same fixture release tag;
- every record uses the same fixture artifact manifest;
- every record is classified as `fixture-filled-not-release-evidence`;
- every required blocker status is non-empty;
- no fixture record contains `TODO`, `template-only`, `dry-run-only`, `requirements-only`, or `placeholder`.

The fixture verifier currently rejects:

- missing candidate index;
- missing key ceremony record;
- mismatched candidate commit;
- mismatched artifact manifest;
- template-only evidence;
- placeholder evidence;
- empty blocker status.

## Known Fixture Limits

This audit confirms fixture behavior only. It does not prove that a real release-candidate evidence package exists. It also does not verify:

- real release key ceremony evidence;
- real signed artifact evidence;
- real user/reviewer verification transcript evidence;
- real reproducible or equivalent binary verification evidence;
- real dependency or supply-chain review evidence;
- real release-candidate signoff evidence;
- real external or independent review readiness evidence;
- real update or installer integrity evidence.

## Non-Claims

- This audit does not collect candidate-specific release evidence.
- This audit does not approve fixture coverage as release evidence.
- This audit does not create or approve a release candidate.
- This audit does not sign release artifacts.
- This audit does not verify signed release artifacts.
- This audit does not approve release signing.
- This audit does not satisfy release hardening gates.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

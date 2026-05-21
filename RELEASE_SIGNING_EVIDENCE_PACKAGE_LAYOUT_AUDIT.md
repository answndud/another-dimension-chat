# Release Signing Evidence Package Layout Coverage Audit

Another Dimension Chat does not have a release-candidate evidence package today. This audit does not create candidate evidence, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Audit status: package layout coverage audit only, not candidate evidence.

This audit records what the disposable layout fixture in `scripts/verify_release_signing_evidence_package_layout_fixture.sh` currently checks. It exists to keep the evidence package shape explicit without treating fixture layout coverage as release evidence.

## Layout Coverage Confirmed

The layout fixture currently requires:

- `CANDIDATE_EVIDENCE_INDEX` at the candidate evidence root.
- `release-signing/key-ceremony.record`.
- `release-signing/signed-artifacts.record`.
- `release-signing/verification-ux.record`.
- `binary-verification/binary-verification.record`.
- `dependency-review/dependency-review.record`.
- `signoff/release-signoff.record`.
- `external-review/external-review.record`.
- `update-integrity/update-integrity.record`.
- `blockers/unresolved-blockers.record`.

The layout fixture currently rejects:

- missing candidate index;
- missing gate directory;
- missing required record;
- misplaced root record;
- unknown top-level directory;
- unknown record inside a gate directory;
- empty required record.

## Known Fixture Limits

This audit confirms directory layout behavior only. It does not prove:

- real release key ceremony evidence;
- real signed artifact evidence;
- real signed artifact verification evidence;
- real reproducible or equivalent binary verification evidence;
- real dependency or supply-chain review evidence;
- real release-candidate signoff evidence;
- real external or independent review readiness evidence;
- real update or installer integrity evidence.

## Non-Claims

- This audit does not collect candidate-specific release evidence.
- This audit does not approve package layout as release evidence.
- This audit does not create or approve a release candidate.
- This audit does not sign release artifacts.
- This audit does not verify signed release artifacts.
- This audit does not approve release signing.
- This audit does not satisfy release hardening gates.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

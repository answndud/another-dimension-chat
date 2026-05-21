# Release Signing Candidate Evidence Collection Runbook

Another Dimension Chat does not have a release-candidate signing evidence package today. This runbook does not create a candidate, sign artifacts, verify signed artifacts, approve release signing, or approve a release.

Requirement status: evidence collection runbook only, not candidate evidence.

This runbook describes how a future operator should collect candidate-specific release signing evidence into the index defined in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md). It must stay unused for any release claim until every referenced evidence record is filled for the same candidate.

## Collection Order

1. Identify the exact candidate commit, release tag, build profile, feature set, supported platforms, artifact names, and evidence package location.
2. Collect the real key ceremony record required by [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md).
3. Collect the signed artifact evidence required by [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md).
4. Collect the user and reviewer verification UX evidence required by [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md).
5. Collect reproducible or equivalent binary verification evidence from the fields in [RELEASE_BINARY_INPUT_TEMPLATE.md](RELEASE_BINARY_INPUT_TEMPLATE.md).
6. Collect dependency and supply-chain review evidence from the fields in [RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md](RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md).
7. Collect release-candidate threat-model and release-copy signoff evidence from [RELEASE_SIGNOFF_TEMPLATE.md](RELEASE_SIGNOFF_TEMPLATE.md).
8. Collect external or independent review readiness evidence from [RELEASE_EXTERNAL_REVIEW_TEMPLATE.md](RELEASE_EXTERNAL_REVIEW_TEMPLATE.md).
9. Collect update and installer integrity evidence from [RELEASE_UPDATE_INTEGRITY_TEMPLATE.md](RELEASE_UPDATE_INTEGRITY_TEMPLATE.md).
10. Record every unresolved blocker from [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md) and fail closed if any required evidence is missing.

## Fail-Closed Rules

The operator must mark the candidate blocked when any of the following are true:

- `TODO-CANDIDATE-COMMIT` differs across evidence records.
- `TODO-ARTIFACT-MANIFEST` differs across signing, verification UX, binary verification, or update integrity records.
- A referenced record is still a template, fixture, dry-run, requirement, or placeholder.
- A signature, checksum, public-key fingerprint, or artifact verification transcript is missing or stale.
- Dependency review, signoff, external review readiness, or update integrity evidence is missing.
- Public copy implies the candidate is safe for high-risk communication without complete release evidence.

## Minimum Handoff Fields

A completed future run must hand off:

- `TODO-CANDIDATE-EVIDENCE-INDEX-PATH`
- `TODO-CANDIDATE-EVIDENCE-OWNER`
- `TODO-CANDIDATE-EVIDENCE-REVIEWER`
- `TODO-CANDIDATE-EVIDENCE-DATE`
- `TODO-CANDIDATE-EVIDENCE-STATUS`
- `TODO-CANDIDATE-EVIDENCE-BLOCKERS`
- `TODO-CANDIDATE-EVIDENCE-NON-CLAIM-COPY`

## Non-Claims

- This runbook does not collect candidate-specific release evidence.
- This runbook does not create or approve a release candidate.
- This runbook does not sign release artifacts.
- This runbook does not verify signed release artifacts.
- This runbook does not approve release signing.
- This runbook does not satisfy release hardening gates.
- This runbook does not make Another Dimension Chat release-ready or v0.1-security-ready.

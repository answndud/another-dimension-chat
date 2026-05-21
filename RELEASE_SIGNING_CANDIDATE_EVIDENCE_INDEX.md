# Release Signing Candidate Evidence Index

Another Dimension Chat does not have a release candidate with complete signing evidence today. It does not have a release signing workflow, signed release artifacts, signed artifact verification evidence, release approval, or v0.1-security-ready approval.

Requirement status: candidate evidence index only, not release signing evidence.

This document defines the index that a future release-candidate evidence package must fill before any release signing claim can be considered. It is an index and checklist for evidence records, not evidence that those records exist.

## Candidate Identity

The index must identify the exact candidate under review:

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Release tag: `TODO-RELEASE-TAG`
- Build profile and feature set: `TODO-BUILD-PROFILE`
- Supported platform set: `TODO-PLATFORM-SET`
- Artifact manifest: `TODO-ARTIFACT-MANIFEST`
- Evidence package location: `TODO-EVIDENCE-PACKAGE-LOCATION`

## Required Evidence Links

| Gate | Required placeholder | Source requirement |
| --- | --- | --- |
| Release key ceremony | `TODO-KEY-CEREMONY-RECORD` | [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md) |
| Signed artifact package | `TODO-SIGNED-ARTIFACT-EVIDENCE` | [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md) |
| User/reviewer verification UX | `TODO-VERIFICATION-UX-EVIDENCE` | [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md) |
| Reproducible/equivalent binary verification | `TODO-BINARY-VERIFICATION-EVIDENCE` | [RELEASE_BINARY_INPUT_TEMPLATE.md](RELEASE_BINARY_INPUT_TEMPLATE.md) |
| Dependency and supply-chain review | `TODO-DEPENDENCY-REVIEW-EVIDENCE` | [RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md](RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md) |
| Release-candidate signoff | `TODO-SIGNOFF-EVIDENCE` | [RELEASE_SIGNOFF_TEMPLATE.md](RELEASE_SIGNOFF_TEMPLATE.md) |
| External or independent review readiness | `TODO-EXTERNAL-REVIEW-EVIDENCE` | [RELEASE_EXTERNAL_REVIEW_TEMPLATE.md](RELEASE_EXTERNAL_REVIEW_TEMPLATE.md) |
| Update and installer integrity | `TODO-UPDATE-INTEGRITY-EVIDENCE` | [RELEASE_UPDATE_INTEGRITY_TEMPLATE.md](RELEASE_UPDATE_INTEGRITY_TEMPLATE.md) |
| Unresolved release blockers | `TODO-UNRESOLVED-BLOCKERS` | [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md) |

## Required Index Rules

A future filled candidate index must:

- Link every evidence record to the same candidate commit, release tag, artifact manifest, and platform set.
- Mark missing evidence as a blocker instead of omitting it.
- Keep release signing separate from reproducible/equivalent binary verification, dependency review, external review, signoff, and update integrity.
- Record reviewer identity or review role for each evidence link when applicable.
- Record whether each evidence item is candidate-specific or still a template/fixture.
- Preserve non-claim copy when any evidence item is missing, stale, or template-only.

## Non-Claims

- This index does not create a release candidate.
- This index does not record candidate-specific release evidence.
- This index does not sign release artifacts.
- This index does not verify signed release artifacts.
- This index does not approve release signing.
- This index does not satisfy release hardening gates.
- This index does not make Another Dimension Chat release-ready or v0.1-security-ready.

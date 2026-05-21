# Release-Candidate Signoff Template

This template is not release-candidate signoff evidence, threat-model signoff evidence, release-copy approval, release approval, or a security-ready claim.

Use this template only when preparing a future release-candidate threat-model and release-copy signoff record. Every placeholder must be replaced with release-candidate-specific evidence before any signoff claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platforms: `TODO-TARGET-PLATFORMS`
- Artifact set: `TODO-ARTIFACT-SET`
- Decision owner: `TODO-DECISION-OWNER`
- Review date: `TODO-REVIEW-DATE`

## Threat Model Alignment

- Threat model revision: `TODO-THREAT-MODEL-REVISION`
- Release-specific threat-model exceptions: `TODO-THREAT-MODEL-EXCEPTIONS`
- Non-goals included in public copy: `TODO-NON-GOALS-COPY`
- Known risks included in public copy: `TODO-KNOWN-RISKS-COPY`
- High-risk user warning copy: `TODO-HIGH-RISK-WARNING-COPY`

## Public Copy Alignment

Every row must reference the exact candidate version reviewed.

| Surface | Candidate-specific location | Alignment result |
| --- | --- | --- |
| README | `TODO-README-LINK` | `TODO-ALIGNMENT-RESULT` |
| SECURITY | `TODO-SECURITY-LINK` | `TODO-ALIGNMENT-RESULT` |
| Component boundaries | `TODO-COMPONENT-BOUNDARIES-LINK` | `TODO-ALIGNMENT-RESULT` |
| Release notes | `TODO-RELEASE-NOTES-LINK` | `TODO-ALIGNMENT-RESULT` |
| Tauri app copy | `TODO-TAURI-COPY-LINK` | `TODO-ALIGNMENT-RESULT` |

## Release Gate Evidence

| Gate | Evidence link | Status |
| --- | --- | --- |
| Release signing | `TODO-SIGNING-EVIDENCE` | `TODO-STATUS` |
| Reproducible/equivalent binary verification | `TODO-BINARY-VERIFICATION-EVIDENCE` | `TODO-STATUS` |
| Dependency review | `TODO-DEPENDENCY-REVIEW-EVIDENCE` | `TODO-STATUS` |
| External/independent review readiness | `TODO-EXTERNAL-REVIEW-EVIDENCE` | `TODO-STATUS` |
| Update/installer integrity | `TODO-UPDATE-INTEGRITY-EVIDENCE` | `TODO-STATUS` |

## Unresolved Blockers

| Blocker | Owner | Status | Release-blocking? | Evidence |
| --- | --- | --- | --- | --- |
| `TODO-BLOCKER` | `TODO-OWNER` | `TODO-STATUS` | `TODO-YES-NO` | `TODO-EVIDENCE` |

## Signoff Classification

Choose exactly one when real evidence exists:

- `TODO-CLASSIFICATION-THREAT-MODEL-SIGNOFF-EVIDENCE`
- `TODO-CLASSIFICATION-RELEASE-COPY-SIGNOFF-EVIDENCE`

Until real evidence exists, this template must remain classified as:

```text
not-signoff-evidence
```

## Non-Claims

- This template does not sign off a release candidate.
- This template does not approve public release copy.
- This template does not accept known risks for high-risk use.
- This template does not resolve release blockers.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

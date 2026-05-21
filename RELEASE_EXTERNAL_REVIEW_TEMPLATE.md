# External Review Readiness Template

This template is not external review readiness evidence, independent review evidence, release approval, or a security-ready claim.

Use this template only when preparing a future release-candidate external review readiness record. Every placeholder must be replaced with release-candidate-specific scope, material, finding, and blocker evidence before any review-readiness claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platforms: `TODO-TARGET-PLATFORMS`
- Artifact set: `TODO-ARTIFACT-SET`
- Review coordinator: `TODO-REVIEW-COORDINATOR`
- Readiness date: `TODO-READINESS-DATE`

## Review Scope

- Threat model revision: `TODO-THREAT-MODEL-REVISION`
- Included components: `TODO-INCLUDED-COMPONENTS`
- Excluded components: `TODO-EXCLUDED-COMPONENTS`
- Exclusion rationale: `TODO-EXCLUSION-RATIONALE`
- Known non-goals: `TODO-KNOWN-NON-GOALS`

## Review Materials

Every material link must point to the release-candidate-specific version under review.

| Material | Candidate-specific location | Reviewer notes |
| --- | --- | --- |
| Threat model and non-goals | `TODO-THREAT-MODEL-LINK` | `TODO-NOTES` |
| README and SECURITY copy | `TODO-USER-COPY-LINK` | `TODO-NOTES` |
| Component boundaries | `TODO-COMPONENT-BOUNDARIES-LINK` | `TODO-NOTES` |
| Crypto/session design | `TODO-CRYPTO-SESSION-LINK` | `TODO-NOTES` |
| Pairing/safety design | `TODO-PAIRING-SAFETY-LINK` | `TODO-NOTES` |
| Transport/onion design | `TODO-TRANSPORT-LINK` | `TODO-NOTES` |
| Storage/key lifecycle design | `TODO-STORAGE-LINK` | `TODO-NOTES` |
| Replay/rollback design | `TODO-REPLAY-ROLLBACK-LINK` | `TODO-NOTES` |
| Tauri IPC/runtime design | `TODO-TAURI-LINK` | `TODO-NOTES` |
| Update/signing/release design | `TODO-RELEASE-LINK` | `TODO-NOTES` |

## Reviewer Expectations

- Reviewer independence expectations: `TODO-INDEPENDENCE-EXPECTATIONS`
- Required reviewer access: `TODO-REVIEWER-ACCESS`
- Private material handling: `TODO-PRIVATE-MATERIAL-HANDLING`
- Communication channel: `TODO-COMMUNICATION-CHANNEL`
- Review window: `TODO-REVIEW-WINDOW`

## Finding Triage

| Severity | Definition | Release-blocking? |
| --- | --- | --- |
| Critical | `TODO-CRITICAL-DEFINITION` | `TODO-YES-NO` |
| High | `TODO-HIGH-DEFINITION` | `TODO-YES-NO` |
| Medium | `TODO-MEDIUM-DEFINITION` | `TODO-YES-NO` |
| Low | `TODO-LOW-DEFINITION` | `TODO-YES-NO` |

## Candidate Findings and Blockers

| Finding/blocker | Severity | Owner | Status | Evidence |
| --- | --- | --- | --- | --- |
| `TODO-FINDING-OR-BLOCKER` | `TODO-SEVERITY` | `TODO-OWNER` | `TODO-STATUS` | `TODO-EVIDENCE` |

## Readiness Classification

Choose exactly one when real evidence exists:

- `TODO-CLASSIFICATION-EXTERNAL-REVIEW-READINESS-EVIDENCE`
- `TODO-CLASSIFICATION-INDEPENDENT-REVIEW-READINESS-EVIDENCE`

Until real evidence exists, this template must remain classified as:

```text
not-review-readiness-evidence
```

## Non-Claims

- This template does not prepare a release candidate for external review.
- This template does not prove reviewer independence.
- This template does not record review findings.
- This template does not resolve release blockers.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

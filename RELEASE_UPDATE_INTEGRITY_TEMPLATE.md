# Update and Installer Integrity Template

This template is not update integrity evidence, installer integrity evidence, package integrity approval, release approval, or a security-ready claim.

Use this template only when preparing a future release-candidate update and installer integrity record. Every placeholder must be replaced with release-candidate-specific artifact, signature/hash, downgrade, package, and recovery evidence before any update or installer integrity claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platforms: `TODO-TARGET-PLATFORMS`
- Artifact set: `TODO-ARTIFACT-SET`
- Review operator: `TODO-REVIEW-OPERATOR`
- Review date: `TODO-REVIEW-DATE`

## Artifact and Package Inventory

| Platform | Artifact/package format | Artifact path | SHA-256 | Signature path |
| --- | --- | --- | --- | --- |
| `TODO-PLATFORM` | `TODO-FORMAT` | `TODO-ARTIFACT-PATH` | `TODO-SHA256` | `TODO-SIGNATURE-PATH` |

## Verification Inputs

- Public signing-key location: `TODO-PUBLIC-SIGNING-KEY-LOCATION`
- Public signing-key fingerprint: `TODO-PUBLIC-SIGNING-KEY-FINGERPRINT`
- Signing-key rotation notes: `TODO-SIGNING-KEY-ROTATION`
- Signing-key revocation notes: `TODO-SIGNING-KEY-REVOCATION`
- Checksum publication location: `TODO-CHECKSUM-PUBLICATION`
- Signature verification command: `TODO-SIGNATURE-VERIFY-COMMAND`
- Hash verification command: `TODO-HASH-VERIFY-COMMAND`
- Verification result: `TODO-VERIFICATION-RESULT`

## Downgrade and Rollback Handling

- Candidate version: `TODO-CANDIDATE-VERSION`
- Minimum supported version: `TODO-MINIMUM-SUPPORTED-VERSION`
- Downgrade prevention behavior: `TODO-DOWNGRADE-PREVENTION-BEHAVIOR`
- Explicit downgrade warning behavior: `TODO-DOWNGRADE-WARNING-BEHAVIOR`
- Rollback handling notes: `TODO-ROLLBACK-HANDLING`
- Restored-package risk notes: `TODO-RESTORED-PACKAGE-RISKS`

## Platform Package Integrity

| Platform | Package integrity check | Result | Evidence |
| --- | --- | --- | --- |
| `TODO-PLATFORM` | `TODO-PACKAGE-INTEGRITY-CHECK` | `TODO-RESULT` | `TODO-EVIDENCE` |

## Update Behavior

- Auto-update enabled for v0.1: `TODO-MUST-BE-NO`
- Background update checks enabled for v0.1: `TODO-MUST-BE-NO`
- Manual download verification copy: `TODO-MANUAL-DOWNLOAD-COPY`
- Failed update/install recovery: `TODO-FAILED-UPDATE-RECOVERY`
- Partial-write handling: `TODO-PARTIAL-WRITE-HANDLING`
- User-facing safety copy: `TODO-USER-FACING-SAFETY-COPY`

## Integrity Classification

Choose exactly one when real evidence exists:

- `TODO-CLASSIFICATION-UPDATE-INTEGRITY-EVIDENCE`
- `TODO-CLASSIFICATION-INSTALLER-INTEGRITY-EVIDENCE`

Until real evidence exists, this template must remain classified as:

```text
not-update-integrity-evidence
```

## Non-Claims

- This template does not verify any release artifact or installer.
- This template does not enable auto-update or background update checks.
- This template does not prove downgrade protection.
- This template does not approve platform package integrity.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

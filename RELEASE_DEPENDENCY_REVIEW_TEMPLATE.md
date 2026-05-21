# Release-Candidate Dependency Review Template

This template is not dependency review evidence, supply-chain approval, release approval, or a security-ready claim.

Use this template only when preparing a future release-candidate dependency review record. Every placeholder must be replaced with release-candidate-specific evidence before any dependency or supply-chain review claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platform: `TODO-TARGET-PLATFORM`
- Review operator: `TODO-REVIEW-OPERATOR`
- Review date: `TODO-REVIEW-DATE`

## Reviewed Lockfiles

- Workspace lockfile: `Cargo.lock`
- Tauri Rust lockfile: `apps/desktop-tauri/src-tauri/Cargo.lock`
- Desktop npm lockfile: `apps/desktop-tauri/package-lock.json`
- Lockfile diff command: `TODO-LOCKFILE-DIFF-COMMAND`
- Lockfile diff result: `TODO-LOCKFILE-DIFF-RESULT`

## Direct Dependency Changes

Every direct dependency addition, removal, or version change must be listed here.

| Ecosystem | Package/crate | Change | Reason | Security relevance |
| --- | --- | --- | --- | --- |
| `TODO-ECOSYSTEM` | `TODO-PACKAGE` | `TODO-CHANGE` | `TODO-REASON` | `TODO-SECURITY-RELEVANCE` |

## Security-Sensitive Dependency Areas

Record whether each area changed for the candidate and where evidence lives.

| Area | Changed? | Evidence |
| --- | --- | --- |
| Crypto/session | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Pairing/safety | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Transport/onion | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Storage/key lifecycle | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Replay/rollback | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Tauri IPC/runtime | `TODO-YES-NO` | `TODO-EVIDENCE` |
| Release signing/update | `TODO-YES-NO` | `TODO-EVIDENCE` |

## Native and System Dependencies

- SQLCipher/OpenSSL requirements: `TODO-SQLCIPHER-OPENSSL-REVIEW`
- Tauri platform requirements: `TODO-TAURI-PLATFORM-REVIEW`
- OS package/build image requirements: `TODO-OS-BUILD-IMAGE-REVIEW`
- Native dependency risk notes: `TODO-NATIVE-RISK-NOTES`

## Deny/Allow Decisions

Any new dependency that enables network access, telemetry, update checks, cloud sync, push notification, account identity, contact discovery, browser/webview expansion, or native code execution must have an explicit decision.

| Capability | Dependency | Decision | Rationale | Release blocker? |
| --- | --- | --- | --- | --- |
| `TODO-CAPABILITY` | `TODO-DEPENDENCY` | `TODO-DENY-ALLOW` | `TODO-RATIONALE` | `TODO-YES-NO` |

## Review Outputs

- Vulnerability/advisory command: `TODO-ADVISORY-COMMAND`
- Vulnerability/advisory result: `TODO-ADVISORY-RESULT`
- License policy command: `TODO-LICENSE-COMMAND`
- License policy result: `TODO-LICENSE-RESULT`
- Unresolved dependency risks: `TODO-UNRESOLVED-RISKS`
- Release blockers: `TODO-RELEASE-BLOCKERS`
- Evidence links: `TODO-EVIDENCE-LINKS`

## Review Classification

Choose exactly one when real evidence exists:

- `TODO-CLASSIFICATION-DEPENDENCY-REVIEW-EVIDENCE`
- `TODO-CLASSIFICATION-SUPPLY-CHAIN-REVIEW-EVIDENCE`

Until real evidence exists, this template must remain classified as:

```text
not-review-evidence
```

## Non-Claims

- This template does not review any release-candidate dependency set.
- This template does not approve dependencies for high-risk use.
- This template does not prove supply-chain review coverage.
- This template does not provide dependency review evidence.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

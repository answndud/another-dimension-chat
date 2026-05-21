# Release-Candidate Binary Verification Input Template

This template is not release-candidate evidence, reproducible build evidence, equivalent binary verification evidence, or release approval.

Use this template only when preparing a future release-candidate binary verification record. Every placeholder must be replaced with release-candidate-specific evidence before any verification claim.

## Candidate Identity

- Candidate commit: `TODO-CANDIDATE-COMMIT`
- Candidate tag: `TODO-CANDIDATE-TAG`
- Build profile: `TODO-BUILD-PROFILE`
- Target platform: `TODO-TARGET-PLATFORM`
- Artifact set name: `TODO-ARTIFACT-SET`

## Toolchain and Environment

- Rust toolchain: `TODO-RUST-TOOLCHAIN`
- Cargo version: `TODO-CARGO-VERSION`
- Node version: `TODO-NODE-VERSION`
- npm version: `TODO-NPM-VERSION`
- Tauri CLI/version: `TODO-TAURI-VERSION`
- OS/build image: `TODO-OS-OR-BUILD-IMAGE`
- Environment notes: `TODO-ENVIRONMENT-NOTES`

## Lockfiles and Inputs

- Workspace lockfile: `Cargo.lock`
- Tauri Rust lockfile: `apps/desktop-tauri/src-tauri/Cargo.lock`
- Desktop npm lockfile: `apps/desktop-tauri/package-lock.json`
- Build command sequence: `TODO-BUILD-COMMANDS`
- Build input manifest hash: `TODO-BUILD-INPUT-MANIFEST-SHA256`

## Artifact Manifest

Each artifact row must include the artifact path, byte size, and SHA-256 hash.

| Artifact path | Bytes | SHA-256 |
| --- | ---: | --- |
| `TODO-ARTIFACT-PATH` | `TODO-BYTES` | `TODO-SHA256` |

## Comparison Record

- Rebuild operator/reviewer: `TODO-REBUILD-OPERATOR`
- Rebuild machine/environment: `TODO-REBUILD-ENVIRONMENT`
- Rebuild source checkout: `TODO-REBUILD-SOURCE-CHECKOUT`
- Comparison command: `TODO-COMPARISON-COMMAND`
- Missing artifacts result: `TODO-MISSING-ARTIFACTS-RESULT`
- Extra artifacts result: `TODO-EXTRA-ARTIFACTS-RESULT`
- Checksum mismatch result: `TODO-CHECKSUM-MISMATCH-RESULT`
- Build-input drift result: `TODO-BUILD-INPUT-DRIFT-RESULT`

## Verification Classification

Choose exactly one when real evidence exists:

- `TODO-CLASSIFICATION-REPRODUCIBLE-BUILD-EVIDENCE`
- `TODO-CLASSIFICATION-EQUIVALENT-BINARY-VERIFICATION-EVIDENCE`

Until real evidence exists, this template must remain classified as:

```text
not-verification-evidence
```

## Non-Claims

- This template does not verify any release artifact.
- This template does not prove reproducible builds.
- This template does not prove equivalent binary verification.
- This template does not provide independent rebuild evidence.
- This template does not make Another Dimension Chat release-ready or v0.1-security-ready.

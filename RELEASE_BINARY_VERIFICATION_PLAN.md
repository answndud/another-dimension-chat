# Reproducible or Equivalent Binary Verification Plan

Another Dimension Chat does not have reproducible builds or equivalent binary verification today. This plan is a pre-implementation verification design, not reproducible build evidence and not release approval.

## Target Boundary

The first release verification path should support at least one of these approaches before any security-ready claim:

- Reproducible builds that let an independent reviewer rebuild release artifacts and match published checksums.
- Equivalent binary verification that records a controlled build environment, source commit, dependency lockfiles, artifact manifest, and independently repeatable checksum comparison.

The initial target is equivalent binary verification for a release-candidate artifact set, because the project still lacks stable release packaging, final signing tooling, and platform-specific installer decisions.

## Required Evidence Before Any Verification Claim

Before public copy can claim reproducible or equivalent binary verification is ready, the repository needs:

- Exact source commit, build profile, target platform, toolchain, and environment description.
- Rust workspace lockfile, Tauri Rust lockfile, and desktop npm lockfile references.
- Artifact manifest listing every release artifact and expected checksum.
- Build command sequence that produces the artifact set from the recorded source and lockfiles.
- Independent rebuild or second-machine verification record.
- Comparison procedure that fails on missing artifacts, extra artifacts, checksum mismatch, changed lockfiles, changed build inputs, or unrecorded environment differences.
- Clear statement of whether the verification is reproducible build evidence or only equivalent binary verification evidence.

## Non-Claims

- This plan does not make builds reproducible.
- This plan does not verify any release artifact.
- This plan does not provide independent rebuild evidence.
- This plan does not satisfy release signing, dependency review, external review, or update integrity gates.
- This plan does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Next Implementation Slice

The next binary verification slice should add a fixture-only manifest verifier that rejects missing artifacts, extra artifacts, checksum mismatches, and unrecorded build-input changes without claiming reproducible builds.

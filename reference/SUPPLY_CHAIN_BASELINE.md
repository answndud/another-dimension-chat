# Supply-Chain Baseline

This is a minimal public beta dependency baseline, not a supply-chain audit.

## Locked Inputs

The unsigned public beta release script records SHA-256 hashes for:

- `Cargo.lock`
- `apps/desktop-tauri/src-tauri/Cargo.lock`
- `apps/desktop-tauri/package-lock.json`

The generated release file is:

- `DEPENDENCY_LOCKFILES.sha256`

This lets reviewers see which lockfiles were present when the public upload set
was prepared. It does not prove dependency safety.

The release script also records the SHA-256 of the local source provenance JSON
inside the public provenance JSON. That links the public upload name to the
local build provenance without claiming reproducible builds or artifact
authenticity beyond the GitHub Release that the user chooses to trust.

## Current Package Managers

- Rust workspace: Cargo lockfile at repository root.
- Tauri Rust app: separate Cargo lockfile under `apps/desktop-tauri/src-tauri/`.
- Desktop frontend: npm lockfile under `apps/desktop-tauri/`.

## Dependency Review Boundary

For this public beta, dependency review is limited to lockfile presence, release
artifact checksum evidence, and public non-claims.

The public release script fails if the upload set does not include the expected
DMG, `.sha256`, public provenance JSON, manifest, manual update integrity note,
supply-chain baseline note, threat model, independent review packet, and
dependency lockfile hashes. This is an upload-set completeness check, not a
dependency safety review.

Not included:

- external security audit
- SBOM publication
- vulnerability triage signoff
- reproducible-build proof
- notarized or signed release pipeline
- auto-update integrity

## Future Export Decision

The next review packet should treat `DEPENDENCY_LOCKFILES.sha256` as the stable
public baseline and add an SBOM only after the reviewer decides the format and
scope. The beta must not imply that lockfile hashes are equivalent to an audit.

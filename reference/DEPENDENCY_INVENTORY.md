# Dependency Inventory - Unsigned Public Beta

This is a public dependency inventory for the unsigned experimental beta. It is
not an SBOM, dependency audit, vulnerability triage signoff, reproducible-build
proof, malware review, notarization substitute, or secure messenger claim.

## Locked Inputs

The release upload set must include `DEPENDENCY_LOCKFILES.sha256` with SHA-256
hashes for:

- `Cargo.lock`
- `apps/desktop-tauri/src-tauri/Cargo.lock`
- `apps/desktop-tauri/package-lock.json`

Those hashes identify the lockfiles used when the upload set was prepared. They
do not prove dependency safety.

## Lockfile Evidence Summary

- Lockfile evidence count: 3
- Lockfile evidence files:
  - `Cargo.lock`
  - `apps/desktop-tauri/src-tauri/Cargo.lock`
  - `apps/desktop-tauri/package-lock.json`
- Dependency inventory runtime visible: true
- Supply-chain audit complete: false
- SBOM published: false
- Vulnerability triage signoff complete: false
- Reproducible-build proof: false
- Live dependency scan performed: false

This is deterministic release evidence for reviewers, not a live vulnerability
scan or safety verdict.

## Package Manager Scope

- Root Rust workspace: Cargo, default non-`dev-insecure` workspace members.
- Tauri Rust app: Cargo under `apps/desktop-tauri/src-tauri/`, outside the root
  Rust workspace.
- Desktop frontend: npm under `apps/desktop-tauri/`.

## Direct Dependency Categories

- Cryptographic/session primitives: Rust crates under `crates/crypto`,
  `crates/identity`, `crates/pairing`, `crates/protocol`, plus selected external
  dependencies recorded in the lockfiles.
- Local storage: Rust storage crate and SQLCipher-related dependencies recorded
  in the lockfiles.
- Transport: Rust transport crate, Tor/onion experiment dependencies only where
  explicitly enabled by feature flags.
- Desktop shell: Tauri 2, rustls, tokio, serde/serde_json, Vite, and Tauri npm
  packages recorded in the lockfiles.

## Release Boundary

Every unsigned public beta upload must ship:

- DMG and matching `.sha256`
- public provenance JSON
- `MANIFEST.md`
- `OPERATOR_FINAL_HANDOFF.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_INVENTORY.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `OPERATOR_FINAL_HANDOFF.md`
- `PUBLIC_THREAT_MODEL.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`

The release script must fail if any of these files are missing from the upload
set.

## Non-Claims

This inventory does not claim:

- dependency audit completion
- SBOM publication
- vulnerability triage signoff
- live dependency scan completion
- reproducible-build equivalence
- signed or notarized release integrity
- auto-update integrity
- secure messenger readiness

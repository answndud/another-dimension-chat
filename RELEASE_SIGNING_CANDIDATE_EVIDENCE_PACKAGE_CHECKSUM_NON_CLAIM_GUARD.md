# Release Signing Candidate Evidence Package Checksum Non-Claim Guard

Another Dimension Chat does not have release artifact checksum verification, signed artifact verification evidence, artifact authenticity proof, release signing approval, or release approval today.

Guard status: checksum non-claim guard only, not release evidence.

This guard defines public-safe wording for checksum and digest fixture coverage while the release signing gate is still incomplete. It applies to README status copy, release hardening copy, release-candidate summaries, and future release notes that mention candidate evidence package checksum scaffolding.

## Allowed Wording

Public copy may say:

- Checksum and digest coverage remains fixture-only.
- The repository contains disposable candidate evidence package checksum and digest coverage checks.
- Fixture checksum coverage uses disposable `artifact_manifest` and `artifact_manifest_sha256` values.
- Fixture checksum coverage does not checksum real release artifacts.
- Fixture checksum coverage does not verify detached signatures.
- Fixture checksum coverage does not prove artifact authenticity.

## Required Warning Copy

Any public entry that mentions candidate evidence package checksum coverage must include all of the following meanings:

- `fixture checksum coverage is not release evidence`
- `no real release artifact checksum verification exists`
- `no signed artifact verification evidence exists`
- `not release-ready or v0.1-security-ready`

## Blocked Meanings

Public copy must not imply:

- real release artifact checksums have been verified;
- real release artifact hashes have been compared against `SHA256SUMS`;
- detached signatures have been verified for a release candidate;
- artifact authenticity has been proven;
- candidate evidence has been collected;
- release signing has been approved;
- a release candidate has been approved;
- release hardening gates have passed.

## Non-Claims

- This guard does not checksum real release artifacts.
- This guard does not compare real release artifact hashes against `SHA256SUMS`.
- This guard does not verify detached signatures.
- This guard does not prove artifact authenticity.
- This guard does not collect candidate-specific release evidence.
- This guard does not create or approve a release candidate.
- This guard does not approve release signing.
- This guard does not satisfy release hardening gates.
- This guard does not make Another Dimension Chat release-ready or v0.1-security-ready.

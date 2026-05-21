# Release Signing Candidate Signed Artifact Verification Non-Claim Guard

Another Dimension Chat does not have signed artifact verification evidence, detached signature verification evidence, artifact authenticity proof, release signing approval, or release approval today.

Guard status: signed-artifact verification non-claim guard only, not signed artifact verification evidence.

This guard defines public-safe wording for signed-artifact verification fixture coverage while the release signing gate is still incomplete. It applies to README status copy, release hardening copy, release-candidate summaries, and future release notes that mention `SHA256SUMS`, `SHA256SUMS.sig`, detached signature verification scaffolding, or signed-artifact verification fixture coverage.

## Allowed Wording

Public copy may say:

- Signed-artifact verification coverage remains fixture-only.
- The repository contains disposable candidate signed-artifact verification fixture checks.
- Fixture signed-artifact verification coverage uses disposable `SHA256SUMS` and `SHA256SUMS.sig` files.
- Fixture signed-artifact verification coverage does not verify detached signatures for a release candidate.
- Fixture signed-artifact verification coverage does not prove artifact authenticity.
- Fixture signed-artifact verification coverage does not approve release signing.

## Required Warning Copy

Any public entry that mentions candidate signed-artifact verification fixture coverage must include all of the following meanings:

- `fixture signed-artifact verification coverage is not signed artifact verification evidence`
- `no detached signature verification evidence exists`
- `no artifact authenticity proof exists`
- `not release-ready or v0.1-security-ready`

## Blocked Meanings

Public copy must not imply:

- real release artifact hashes have been compared against `SHA256SUMS`;
- detached signatures have been verified for a release candidate;
- signed artifact verification has passed;
- artifact authenticity has been proven;
- candidate evidence has been collected;
- release signing has been approved;
- a release candidate has been approved;
- release hardening gates have passed.

## Non-Claims

- This guard does not sign release artifacts.
- This guard does not checksum real release artifacts.
- This guard does not compare real release artifact hashes against `SHA256SUMS`.
- This guard does not verify detached signatures.
- This guard does not prove artifact authenticity.
- This guard does not collect candidate-specific release evidence.
- This guard does not create or approve a release candidate.
- This guard does not approve release signing.
- This guard does not satisfy release hardening gates.
- This guard does not make Another Dimension Chat release-ready or v0.1-security-ready.

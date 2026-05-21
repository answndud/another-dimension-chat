# Release Signing Candidate Evidence Package Checksum Guard Coverage Audit

Audit status: checksum guard coverage audit only, not release evidence.

This audit records what the checksum non-claim guard covers today. It is a coverage map for [RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_NON_CLAIM_GUARD.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_PACKAGE_CHECKSUM_NON_CLAIM_GUARD.md), not release-candidate evidence, signed artifact verification, artifact authenticity proof, or release approval.

## Covered Guard Behavior

The checksum non-claim guard defines allowed wording for fixture-only checksum and digest coverage. It requires public copy to preserve these meanings:

- `fixture checksum coverage is not release evidence`
- `no real release artifact checksum verification exists`
- `no signed artifact verification evidence exists`
- `not release-ready or v0.1-security-ready`

The guard blocks public copy from implying:

- real release artifact checksums have been verified;
- real release artifact hashes have been compared against `SHA256SUMS`;
- detached signatures have been verified for a release candidate;
- artifact authenticity has been proven;
- candidate evidence has been collected;
- release signing has been approved;
- a release candidate has been approved;
- release hardening gates have passed.

## Known Limits

- This audit does not checksum real release artifacts.
- This audit does not compare real release artifact hashes against `SHA256SUMS`.
- This audit does not verify detached signatures.
- This audit does not prove artifact authenticity.
- This audit does not collect candidate-specific release evidence.
- This audit does not approve release signing.
- This audit does not approve a release candidate or release.
- This audit does not make Another Dimension Chat release-ready or v0.1-security-ready.

## Non-Claims

- Checksum guard coverage is not release evidence.
- Checksum guard coverage is not signed artifact verification.
- Checksum guard coverage is not artifact authenticity proof.
- Checksum guard coverage is not release signing approval.
- Checksum guard coverage is not release approval.

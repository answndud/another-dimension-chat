# Release Signing Release-Note Non-Claim Guard

Another Dimension Chat does not have release signing, signed artifacts, signed artifact verification evidence, or release approval today.

Guard status: release-note non-claim guard only, not release evidence.

This guard defines public-safe release-note wording for the current release signing scaffold. It is intended for future release notes, changelog entries, and release-candidate summaries while the signing gate is still incomplete.

## Allowed Release-Note Wording

Release notes may say:

- Release signing remains incomplete.
- The repository contains pre-implementation release signing plans, requirements, fixture checks, and non-claim verifiers.
- Fixture checks use disposable files and do not create release evidence.
- Candidate evidence indexes, runbooks, and fixture audits are planning and verification-scaffold artifacts.
- No release artifact should be treated as authentic unless a future candidate has signed artifacts, published checksums, public-key fingerprint copy, and reviewer verification evidence.

## Required Warning Copy

Any release-note entry that mentions release signing scaffolding must include all of the following:

- `release signing is not implemented`
- `no signed artifact verification evidence exists`
- `fixture checks are not release evidence`
- `not release-ready or v0.1-security-ready`

## Blocked Release-Note Meanings

Release notes must not imply:

- a release signing workflow exists;
- signed artifacts exist;
- a release key ceremony has happened;
- artifact authenticity has been proven;
- verification UX has been approved for a release candidate;
- candidate evidence has been collected;
- release hardening gates have passed;
- the app is ready for high-risk communication.

## Non-Claims

- This guard does not collect candidate-specific release evidence.
- This guard does not create or approve a release candidate.
- This guard does not sign release artifacts.
- This guard does not verify signed release artifacts.
- This guard does not approve release signing.
- This guard does not satisfy release hardening gates.
- This guard does not make Another Dimension Chat release-ready or v0.1-security-ready.

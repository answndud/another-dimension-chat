# Release Key Ceremony Evidence Requirements

Another Dimension Chat still does not have release signing, release keys, signed artifacts, or signed artifact verification evidence.

Requirement status: evidence requirements only, not a real key ceremony.

This document defines the evidence required before a real release signing key ceremony can support any release signing claim. It does not generate keys, handle private key material, sign artifacts, or approve a release candidate.

## Required Ceremony Evidence

A candidate-specific real key ceremony record must include:

- Ceremony identifier: `TODO-CEREMONY-ID`
- Candidate release/tag: `TODO-CANDIDATE-RELEASE`
- Ceremony operator and witness list: `TODO-OPERATORS-AND-WITNESSES`
- Ceremony date, location, and offline environment: `TODO-CEREMONY-ENVIRONMENT`
- Tooling decision reference: [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md)
- Key algorithm and command transcript: `TODO-KEY-GENERATION-TRANSCRIPT`
- Public key path and fingerprint: `TODO-PUBLIC-KEY-FINGERPRINT`
- Fingerprint publication channels: `TODO-FINGERPRINT-PUBLICATION-CHANNELS`
- Private key storage location class: `TODO-OFFLINE-STORAGE-CLASS`
- Backup count, custody, and recovery procedure: `TODO-BACKUP-CUSTODY-RECOVERY`
- Rotation trigger and rotation procedure: `TODO-ROTATION-PROCEDURE`
- Revocation trigger and revocation procedure: `TODO-REVOCATION-PROCEDURE`
- Incident response contact and decision owner: `TODO-INCIDENT-RESPONSE-OWNER`

## Minimum Evidence Package

Before any release signing claim, the evidence package must contain:

| Evidence item | Required content | Status |
| --- | --- | --- |
| Ceremony transcript | Exact commands, operator identity, witness identity, environment notes | `TODO-STATUS` |
| Public key fingerprint | Stable fingerprint value and reproducible fingerprint command | `TODO-STATUS` |
| Publication proof | README/release page/security page locations for the fingerprint | `TODO-STATUS` |
| Offline custody record | Private-key storage class, access constraints, backup custody | `TODO-STATUS` |
| Rotation/revocation plan | Trigger, owner, command sequence, public notice path | `TODO-STATUS` |
| Verification UX | User/reviewer command sequence for `SHA256SUMS` and `SHA256SUMS.sig` | `TODO-STATUS` |

## Gate To Real Signing

Real release signing cannot start until the ceremony evidence package is complete and reviewed for the exact release candidate.

The disposable command harness in `scripts/verify_release_signing_ceremony_harness.sh` can rehearse command shape only. It cannot replace real offline custody evidence or a candidate-specific ceremony transcript.

## Non-Claims

- This requirements document does not create release keys.
- This requirements document does not record a real key ceremony.
- This requirements document does not sign release artifacts.
- This requirements document does not prove artifact authenticity.
- This requirements document does not satisfy release signing.
- This requirements document does not make Another Dimension Chat release-ready or v0.1-security-ready.

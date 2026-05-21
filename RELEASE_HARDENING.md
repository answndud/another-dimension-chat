# Release Hardening Gap Inventory

Another Dimension Chat is not release-ready and is not a secure messenger release.

This inventory records the current public-safe release hardening gaps that must be resolved before any limited public test, external review candidate, or security-ready claim. It is a gap map, not a release checklist that has passed.

## Current Status

The repository currently has:

- Lightweight verification through `scripts/verify_all.sh`.
- Heavier local verification through `scripts/verify_full.sh`.
- Static release-hygiene checks through `scripts/verify_release_hygiene.sh`.
- Release completion audit evidence in [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md) that records the current v0.1-security-ready gate status as not complete.
- A release signing implementation plan in [RELEASE_SIGNING_PLAN.md](RELEASE_SIGNING_PLAN.md), dry-run verifier in `scripts/verify_release_signing_dry_run.sh`, and disposable detached-signature fixture in `scripts/verify_release_detached_signature_fixture.sh` that record the intended offline detached-signature path without claiming signing readiness.
- Default-build boundary checks that keep `dev-insecure` out of default feature sets and reject usable production command surfaces.
- Tauri scaffold static checks that keep prototype status copy read-only.
- Public non-claim copy in `README.md`, `SECURITY.md`, and `COMPONENT_BOUNDARIES.md`.

The repository does not currently have:

- Release signing.
- Reproducible builds or an equivalent binary verification story.
- Installer/package integrity checks.
- Dependency and supply-chain review records.
- External security review.
- A release candidate threat-model signoff.
- A user-facing high-risk safety copy review.
- A supported upgrade/update verification process.

## Required Gates Before Any Security-Ready Claim

| Gate | Current evidence | Required before claim |
| --- | --- | --- |
| Release signing | No release signing workflow or signed artifact verification exists; a pre-implementation signing plan, dry-run verifier, and disposable detached-signature fixture exist. | Add platform signing, verification instructions, and a checked release process. |
| Reproducible or equivalent verification | No reproducible build story exists. | Add reproducible builds or an equivalent independent binary verification process. |
| Dependency and supply-chain review | Lockfiles and static checks exist, but no review record or policy exists. | Add dependency review procedure, deny/allow policy, and release evidence. |
| Threat model and release copy alignment | Public non-claim copy exists. | Reconcile release copy, known risks, non-goals, and threat model for the exact release candidate. |
| External or independent review readiness | No external review is recorded. | Prepare review materials and track findings before any high-risk release claim. |
| Update and installer integrity | No updater or package-integrity story exists. | Define update verification, rollback handling, and platform package integrity. |

## Dependency Review Policy Skeleton

No dependency review evidence is recorded yet.

Before any security-ready claim, a dependency review record must identify reviewed lockfiles, direct dependency changes, native/system dependencies, and denied or accepted risk decisions. At minimum, that record must cover:

- Rust workspace dependencies and lockfile changes.
- Tauri Rust dependencies and lockfile changes.
- Desktop frontend npm dependencies and lockfile changes.
- Native build dependencies such as SQLCipher/OpenSSL/Tauri platform requirements.
- Security-sensitive crypto, storage, transport, and updater dependencies.
- A deny/allow decision for new network, telemetry, updater, cloud, push, or account/discovery dependencies.

`scripts/verify_dependency_review_gate.sh` is the current dependency review verifier skeleton. It confirms that dependency review is still documented as incomplete and fails if public copy starts claiming dependency or supply-chain review completion before evidence exists.

## External Review Readiness Checklist Skeleton

No external or independent review readiness evidence is recorded yet.

Before any security-ready claim, an external review readiness record must identify reviewed scope, reviewer independence expectations, review materials, finding triage, and release-blocking unresolved risks. At minimum, that record must cover:

- Exact release-candidate commit, build profile, and platform artifacts under review.
- Threat model, non-goals, and user-facing safety copy for the candidate.
- Crypto/session, pairing/safety, transport/onion, storage/key lifecycle, replay/rollback, disappearing-message, Tauri IPC, update, and release-signing boundaries.
- Reviewer access expectations, independence constraints, and any excluded areas.
- Finding severity taxonomy, owner assignment, remediation evidence, and explicit release-blocker status.
- Known unresolved risks that must stay visible to users and reviewers.

`scripts/verify_external_review_gate.sh` is the current external review readiness verifier skeleton. It confirms that external review readiness is still documented as incomplete and fails if public copy starts claiming external or independent review completion before evidence exists.

## Update and Installer Integrity Checklist Skeleton

No update or installer integrity evidence is recorded yet.

Before any security-ready claim, an update integrity record must identify artifact formats, signature/hash verification, downgrade or rollback handling, platform package integrity, and recovery behavior for failed updates. At minimum, that record must cover:

- Platform artifact formats and package/install verification expectations.
- Public signing-key distribution, fingerprint verification, rotation, and revocation expectations.
- Local hash/signature verification flow for manual downloads.
- Downgrade prevention or explicit downgrade warning behavior.
- Installer, archive, and checksum publication rules for each supported platform.
- Failed update/install recovery, partial-write handling, and user-facing safety copy.
- Explicit confirmation that no auto-update or background update check is enabled for v0.1.

`scripts/verify_update_integrity_gate.sh` is the current update and installer integrity verifier skeleton. It confirms that update/installer integrity is still documented as incomplete and fails if public copy starts claiming update or package integrity completion before evidence exists.

## Release-Candidate Threat Model and Copy Signoff Skeleton

No release-candidate threat-model or release-copy signoff evidence is recorded yet.

Before any security-ready claim, a release-candidate signoff record must identify the exact candidate commit, threat model revision, non-goals, known risks, user-facing safety copy, and unresolved release blockers. At minimum, that record must cover:

- Exact candidate commit, build profile, target platforms, and artifact set.
- Threat model document revision and any release-specific threat-model exceptions.
- Non-goals and excluded features that must remain visible in public copy.
- Known risks, unavailable protections, and user-facing warnings for high-risk users.
- Release notes, README, SECURITY, component boundary, and app UI copy alignment.
- Explicit release blockers that remain unresolved and their owner/status.
- Decision owner, review date, and evidence links for the signoff package.

`scripts/verify_release_signoff_gate.sh` is the current release-candidate signoff verifier skeleton. It confirms that threat-model/release-copy signoff is still documented as incomplete and fails if public copy starts claiming signoff or safety-copy approval before evidence exists.

## Non-Claims

- Passing local verification does not mean the app is safe for high-risk communication.
- Default-build self-tests and preflight output are boundary checks, not a release audit.
- Manual network bootstrap experiments are not production transport readiness.
- SQLCipher-backed storage spikes are not a complete encrypted storage lifecycle.
- CLI/Tauri unlock rejection mirrors are not a product unlock implementation.
- This inventory does not replace an external review, release signing, reproducible/equivalent verification, or dependency review.

## Verification Boundary

`scripts/verify_release_hygiene.sh` checks that this inventory exists and continues to state the missing release gates. That static check prevents accidental public wording drift, but it does not satisfy the release gates.

`scripts/verify_release_artifact_gates.sh` is the current signing/reproducible-build verifier skeleton. It confirms that release signing and reproducible/equivalent binary verification are still documented as incomplete and fails if public copy starts claiming those gates are ready before implementation.

`scripts/verify_release_completion_audit.sh` checks that [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md) continues to record the current release-gate audit as incomplete. It is not a release approval.

`scripts/verify_update_integrity_gate.sh` is the current update/installer integrity verifier skeleton. It confirms that update and package integrity evidence is still missing before any release claim.

`scripts/verify_release_signoff_gate.sh` is the current release-candidate threat-model and release-copy signoff verifier skeleton. It confirms that signoff evidence is still missing before any release claim.

`scripts/verify_release_signing_plan.sh` checks that [RELEASE_SIGNING_PLAN.md](RELEASE_SIGNING_PLAN.md) exists and remains a pre-implementation plan. It does not verify signed artifacts.

`scripts/verify_release_signing_dry_run.sh` checks disposable fixture behavior for the planned checksum/signature verification flow. It rejects missing signatures, stale checksums, stale dry-run signature markers, and unsigned artifacts, but it does not create release keys or verify real signed artifacts.

`scripts/verify_release_detached_signature_fixture.sh` checks disposable OpenSSL detached-signature fixture behavior for `SHA256SUMS`. It uses temporary keys only and does not create release keys, select final release tooling, or verify real signed artifacts.

# Release Hardening Gap Inventory

Another Dimension Chat is not release-ready and is not a secure messenger release.

This inventory records the current public-safe release hardening gaps that must be resolved before any limited public test, external review candidate, or security-ready claim. It is a gap map, not a release checklist that has passed.

## Current Status

The repository currently has:

- Lightweight verification through `scripts/verify_all.sh`.
- Heavier local verification through `scripts/verify_full.sh`.
- Static release-hygiene checks through `scripts/verify_release_hygiene.sh`.
- Release completion audit evidence in [RELEASE_COMPLETION_AUDIT.md](RELEASE_COMPLETION_AUDIT.md) that records the current v0.1-security-ready gate status as not complete.
- A release signing implementation plan in [RELEASE_SIGNING_PLAN.md](RELEASE_SIGNING_PLAN.md), tooling decision in [RELEASE_SIGNING_TOOLING_DECISION.md](RELEASE_SIGNING_TOOLING_DECISION.md), ceremony dry-run record in [RELEASE_SIGNING_CEREMONY_DRY_RUN.md](RELEASE_SIGNING_CEREMONY_DRY_RUN.md), real key ceremony requirements in [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md), artifact signing requirements in [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md), verification UX requirements in [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md), candidate evidence index in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md), candidate evidence collection runbook in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md), candidate evidence fixture in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE.md), candidate evidence fixture coverage audit in [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md), release-note non-claim guard in [RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md](RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md), evidence package layout fixture in [RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_FIXTURE.md](RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_FIXTURE.md), evidence package layout coverage audit in [RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md](RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md), ceremony command harness in `scripts/verify_release_signing_ceremony_harness.sh`, dry-run verifier in `scripts/verify_release_signing_dry_run.sh`, and disposable detached-signature fixture in `scripts/verify_release_detached_signature_fixture.sh` that record the intended offline detached-signature path without claiming signing readiness.
- A binary verification plan in [RELEASE_BINARY_VERIFICATION_PLAN.md](RELEASE_BINARY_VERIFICATION_PLAN.md), input template in [RELEASE_BINARY_INPUT_TEMPLATE.md](RELEASE_BINARY_INPUT_TEMPLATE.md), and fixture verifier in `scripts/verify_binary_manifest_fixture.sh` that record reproducible/equivalent verification requirements without claiming build reproducibility.
- Default-build boundary checks that keep `dev-insecure` out of default feature sets and reject usable production command surfaces.
- Tauri scaffold static checks that keep prototype status copy read-only.
- Public non-claim copy in `README.md`, `SECURITY.md`, and `COMPONENT_BOUNDARIES.md`.

The repository does not currently have:

- Release signing.
- Reproducible builds or an equivalent binary verification story.
- Installer/package integrity checks.
- Dependency and supply-chain review evidence.
- External security review.
- A release candidate threat-model signoff.
- A user-facing high-risk safety copy review.
- A supported upgrade/update verification process.

## Required Gates Before Any Security-Ready Claim

| Gate | Current evidence | Required before claim |
| --- | --- | --- |
| Release signing | No release signing workflow or signed artifact verification exists; a pre-implementation signing plan, tooling decision, ceremony dry-run record, real key ceremony requirements, artifact signing requirements, Release verification UX evidence requirements, candidate evidence index, candidate evidence collection runbook, candidate evidence fixture, candidate evidence fixture coverage audit, release-note non-claim guard, evidence package layout fixture, evidence package layout coverage audit, ceremony command harness, dry-run verifier, and disposable detached-signature fixture exist. | Add platform signing, verification instructions, and a checked release process. |
| Reproducible or equivalent verification | No reproducible build evidence or equivalent binary verification evidence exists; a pre-implementation verification plan, input template, and manifest fixture verifier exist. | Add reproducible builds or an equivalent independent binary verification process. |
| Dependency and supply-chain review | Lockfiles, static checks, and a release-candidate review template exist, but no candidate-specific review evidence exists. | Add dependency review procedure, deny/allow policy, and release evidence. |
| Threat model and release copy alignment | Public non-claim copy and a release-candidate signoff template exist, but no candidate-specific signoff evidence exists. | Reconcile release copy, known risks, non-goals, and threat model for the exact release candidate. |
| External or independent review readiness | A readiness template exists, but no candidate-specific external or independent review readiness evidence exists. | Prepare review materials and track findings before any high-risk release claim. |
| Update and installer integrity | An integrity template exists, but no candidate-specific update or installer integrity evidence exists. | Define update verification, rollback handling, and platform package integrity. |

## Dependency Review Policy Skeleton

No dependency review evidence is recorded yet.

The release-candidate dependency review template is tracked in [RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md](RELEASE_DEPENDENCY_REVIEW_TEMPLATE.md). It is not dependency review evidence, supply-chain approval, or release approval.

Before any security-ready claim, a dependency review record must identify reviewed lockfiles, direct dependency changes, native/system dependencies, and denied or accepted risk decisions. At minimum, that record must cover:

- Rust workspace dependencies and lockfile changes.
- Tauri Rust dependencies and lockfile changes.
- Desktop frontend npm dependencies and lockfile changes.
- Native build dependencies such as SQLCipher/OpenSSL/Tauri platform requirements.
- Security-sensitive crypto, storage, transport, and updater dependencies.
- A deny/allow decision for new network, telemetry, updater, cloud, push, or account/discovery dependencies.

`scripts/verify_dependency_review_gate.sh` is the current dependency review verifier skeleton. It confirms that dependency review is still documented as incomplete and fails if public copy starts claiming dependency or supply-chain review completion before evidence exists.

`scripts/verify_dependency_review_template.sh` checks that the template still contains release-candidate placeholders and remains classified as `not-review-evidence`. It does not review dependencies or approve a release candidate.

## External Review Readiness Checklist Skeleton

No external or independent review readiness evidence is recorded yet.

The external review readiness template is tracked in [RELEASE_EXTERNAL_REVIEW_TEMPLATE.md](RELEASE_EXTERNAL_REVIEW_TEMPLATE.md). It is not external review readiness evidence, independent review evidence, or release approval.

Before any security-ready claim, an external review readiness record must identify reviewed scope, reviewer independence expectations, review materials, finding triage, and release-blocking unresolved risks. At minimum, that record must cover:

- Exact release-candidate commit, build profile, and platform artifacts under review.
- Threat model, non-goals, and user-facing safety copy for the candidate.
- Crypto/session, pairing/safety, transport/onion, storage/key lifecycle, replay/rollback, disappearing-message, Tauri IPC, update, and release-signing boundaries.
- Reviewer access expectations, independence constraints, and any excluded areas.
- Finding severity taxonomy, owner assignment, remediation evidence, and explicit release-blocker status.
- Known unresolved risks that must stay visible to users and reviewers.

`scripts/verify_external_review_gate.sh` is the current external review readiness verifier skeleton. It confirms that external review readiness is still documented as incomplete and fails if public copy starts claiming external or independent review completion before evidence exists.

`scripts/verify_external_review_template.sh` checks that the template still contains release-candidate placeholders and remains classified as `not-review-readiness-evidence`. It does not prepare review materials, record findings, or approve a release candidate.

## Update and Installer Integrity Checklist Skeleton

No update or installer integrity evidence is recorded yet.

The update and installer integrity template is tracked in [RELEASE_UPDATE_INTEGRITY_TEMPLATE.md](RELEASE_UPDATE_INTEGRITY_TEMPLATE.md). It is not update integrity evidence, installer integrity evidence, package integrity approval, or release approval.

Before any security-ready claim, an update integrity record must identify artifact formats, signature/hash verification, downgrade or rollback handling, platform package integrity, and recovery behavior for failed updates. At minimum, that record must cover:

- Platform artifact formats and package/install verification expectations.
- Public signing-key distribution, fingerprint verification, rotation, and revocation expectations.
- Local hash/signature verification flow for manual downloads.
- Downgrade prevention or explicit downgrade warning behavior.
- Installer, archive, and checksum publication rules for each supported platform.
- Failed update/install recovery, partial-write handling, and user-facing safety copy.
- Explicit confirmation that no auto-update or background update check is enabled for v0.1.

`scripts/verify_update_integrity_gate.sh` is the current update and installer integrity verifier skeleton. It confirms that update/installer integrity is still documented as incomplete and fails if public copy starts claiming update or package integrity completion before evidence exists.

`scripts/verify_update_integrity_template.sh` checks that the template still contains release-candidate placeholders and remains classified as `not-update-integrity-evidence`. It does not verify artifacts, approve package integrity, or enable auto-update.

## Release-Candidate Threat Model and Copy Signoff Skeleton

No release-candidate threat-model or release-copy signoff evidence is recorded yet.

The release-candidate signoff template is tracked in [RELEASE_SIGNOFF_TEMPLATE.md](RELEASE_SIGNOFF_TEMPLATE.md). It is not release-candidate signoff evidence, threat-model signoff evidence, release-copy approval, or release approval.

Before any security-ready claim, a release-candidate signoff record must identify the exact candidate commit, threat model revision, non-goals, known risks, user-facing safety copy, and unresolved release blockers. At minimum, that record must cover:

- Exact candidate commit, build profile, target platforms, and artifact set.
- Threat model document revision and any release-specific threat-model exceptions.
- Non-goals and excluded features that must remain visible in public copy.
- Known risks, unavailable protections, and user-facing warnings for high-risk users.
- Release notes, README, SECURITY, component boundary, and app UI copy alignment.
- Explicit release blockers that remain unresolved and their owner/status.
- Decision owner, review date, and evidence links for the signoff package.

`scripts/verify_release_signoff_gate.sh` is the current release-candidate signoff verifier skeleton. It confirms that threat-model/release-copy signoff is still documented as incomplete and fails if public copy starts claiming signoff or safety-copy approval before evidence exists.

`scripts/verify_release_signoff_template.sh` checks that the template still contains release-candidate placeholders and remains classified as `not-signoff-evidence`. It does not sign off a release candidate or approve release copy.

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

`scripts/verify_release_signing_tooling_gate.sh` checks that the selected OpenSSL-compatible detached-signature path remains a tooling decision only. It blocks public copy from treating that decision as release signing readiness.

`scripts/verify_release_signing_ceremony_dry_run.sh` checks that [RELEASE_SIGNING_CEREMONY_DRY_RUN.md](RELEASE_SIGNING_CEREMONY_DRY_RUN.md) remains a dry-run procedure with placeholders and non-claims. It does not create release keys or sign release artifacts.

`scripts/verify_release_signing_ceremony_harness.sh` executes the ceremony command sequence with disposable fixture keys and rejects stale checksum, stale signature, unsigned artifact, and stale fingerprint states. It does not create release keys or sign release artifacts.

`scripts/verify_release_key_ceremony_requirements.sh` checks that [RELEASE_KEY_CEREMONY_REQUIREMENTS.md](RELEASE_KEY_CEREMONY_REQUIREMENTS.md) remains an evidence requirements document with placeholders and non-claims. It does not create release keys or record a real key ceremony.

`scripts/verify_release_artifact_signing_requirements.sh` checks that [RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md](RELEASE_ARTIFACT_SIGNING_REQUIREMENTS.md) remains an evidence requirements document with placeholders and non-claims. It does not sign release artifacts or verify real release artifacts.

`scripts/verify_release_verification_ux_requirements.sh` checks that [RELEASE_VERIFICATION_UX_REQUIREMENTS.md](RELEASE_VERIFICATION_UX_REQUIREMENTS.md) remains an evidence requirements document with placeholders and non-claims. It does not verify real release artifacts or approve release verification UX.

`scripts/verify_release_signing_candidate_evidence_index.sh` checks that [RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_INDEX.md) remains an index-only requirements document with placeholders and non-claims. It does not record release evidence or approve release signing.

`scripts/verify_release_signing_candidate_evidence_runbook.sh` checks that [RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_RUNBOOK.md) remains a runbook-only requirements document with placeholders and non-claims. It does not collect release evidence or approve release signing.

`scripts/verify_release_signing_candidate_evidence_fixture.sh` checks disposable candidate evidence package fixture behavior. It rejects missing, template-only, placeholder, mismatched candidate, mismatched manifest, and empty blocker states, but it does not collect release evidence or approve release signing.

`scripts/verify_release_signing_candidate_evidence_fixture_audit.sh` checks that [RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md](RELEASE_SIGNING_CANDIDATE_EVIDENCE_FIXTURE_AUDIT.md) records the fixture coverage and limits without treating fixture coverage as release evidence or release approval.

`scripts/verify_release_signing_release_note_non_claim_guard.sh` checks that [RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md](RELEASE_SIGNING_RELEASE_NOTE_NON_CLAIM_GUARD.md) preserves required release-note warning copy and blocks release signing approval claims while signing remains incomplete.

`scripts/verify_release_signing_evidence_package_layout_fixture.sh` checks disposable evidence package directory layout behavior. It rejects missing candidate index, missing gate directory, missing required record, misplaced root record, unknown top-level directory, unknown gate record, and empty required record states, but it does not collect release evidence or approve release signing.

`scripts/verify_release_signing_evidence_package_layout_audit.sh` checks that [RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md](RELEASE_SIGNING_EVIDENCE_PACKAGE_LAYOUT_AUDIT.md) records the layout fixture coverage and limits without treating layout coverage as release evidence or release approval.

`scripts/verify_binary_verification_plan.sh` checks that [RELEASE_BINARY_VERIFICATION_PLAN.md](RELEASE_BINARY_VERIFICATION_PLAN.md) exists and remains a pre-implementation plan. It does not verify reproducible builds or release artifacts.

`scripts/verify_binary_manifest_fixture.sh` checks disposable manifest comparison behavior for artifact checksums and build-input hashes. It does not verify release artifacts or prove reproducible builds.

`scripts/verify_binary_input_template.sh` checks that [RELEASE_BINARY_INPUT_TEMPLATE.md](RELEASE_BINARY_INPUT_TEMPLATE.md) remains a template with placeholders and `not-verification-evidence` classification. It does not verify release artifacts or prove reproducible builds.

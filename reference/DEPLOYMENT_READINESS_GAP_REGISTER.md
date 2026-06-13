# Deployment Readiness Gap Register

Status: D100-0 deployment readiness gap reconciliation is recorded. This
register is a work plan and evidence map for moving from the current unsigned
experimental public beta to a fully deployable release. It is not a production
claim, stable release approval, audit result, reliable external delivery claim,
or permission for sensitive communication. Public wording remains not
production-ready, not audited, and sensitive communication prohibited.

Required public labels: `not production-ready`, `not audited`, `sensitive
communication prohibited`.

## Reconciled Source-Solved Items

These items no longer need to appear as generic `partial` or `hold` when the
current supported scope is named precisely:

| Area | Current resolved scope | Remaining blocker |
| --- | --- | --- |
| macOS architecture support | Current public artifact is explicitly Apple Silicon `aarch64` only. | Universal/Intel support remains false until a separate artifact is built and verified. |
| Onboarding and recovery UX | First-run, invite, safety verification, manual envelope, retry/cancel, destructive local lifecycle, and diagnostics are source-gated. | Representative user evidence remains false. |
| Pairwise identity | Local identity persistence, signed invite payloads, canonical safety transcript, duplicate rejection, rebuild/re-pairing, and mismatch revocation are source-gated. | Identity audit remains false. |
| Message-content E2EE | D100-1 source-ready protocol/session surface is gated by `reference/PRODUCTION_E2EE_SOURCE_GATE.md` for local/manual 1:1 message content, session, replay, retry, cancel, delete, and local record boundaries. | Broad production E2EE readiness, audit, sensitive-use, automatic networking, remote ack, and external delivery remain false. |
| Local key/deletion lifecycle | Passphrase-first SQLCipher local profile scope, marker-only rollback detection, and local logical delete/wipe are source-gated. | Complete production key management, app key wrapping, rollback prevention, and secure media deletion remain false. |
| Default transport | Local/manual courier envelope exchange is the supported default. | Production transport and reliable external delivery remain false. |
| Update/release integrity | Manual same-release GitHub Release verification, provenance, rollback warning, and emergency process are source-gated. | Signed update manifest, rollback prevention, stable release approval, and release upload remain false. |
| Operations | Public/private intake, tabletop, emergency release, dependency triage, and support-template boundaries are source-gated. | Production operational readiness claim remains false. |

## Remaining External Or Evidence Blockers

These cannot be made true by editing source files alone:

- Developer ID Application identity available and used.
- Notarization credential available, successful notary submission, and stapling.
- Gatekeeper no-exception open on a normal supported macOS machine.
- Signed/notarized stable macOS artifact and owner stable release approval.
- Completed independent external review or audit with public-safe finding
  closure/signoff.
- Repeated real two-machine field evidence with accepted redacted reports.
- Real representative usability evidence from the required user sample.
- Real Windows runtime smoke on Windows hardware plus a public Windows artifact.
- Explicit Android/iOS runtime implementation authorization and public mobile
  artifacts if full TARGET_STANDARD 100 remains the goal.
- Live release upload/edit authorization for any stable release mutation.

## Next Work Order

1. D100-2: replace broad production key-management false with a pass-capable
   key policy for KDF/versioning/key wrapping/rotation, or keep a named stable
   lower-scope policy if complete key management is intentionally out of scope.
2. D100-3: prepare signed/notarized macOS RC execution so it passes
   automatically when Developer ID and notary credentials appear.
3. D100-4: make the Windows public artifact path executable on a real Windows
   runner/device and reject local-only results.
4. D100-5: run external review, field evidence, and representative usability
   intake with real non-sensitive reports; do not fabricate evidence.

## Current Flags

- deployment_readiness_gap_register_reviewed=true
- target_standard_100_deployment_gap_reconciled=true
- stale_generic_partial_or_hold_reduced=true
- source_solved_items_promoted_to_named_supported_scope=true
- external_blockers_still_visible=true
- false_or_hold_items_hidden=false
- public_claim_ahead_of_evidence=false
- macos_current_scope_supported=true
- macos_universal_intel_scope_still_hold=true
- onboarding_recovery_source_ready=true
- pairwise_identity_source_ready=true
- production_e2ee_source_gate_reviewed=true
- production_e2ee_source_ready=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
- supported_default_transport_ready=true
- supported_local_key_lifecycle_ready=true
- supported_local_deletion_scope_ready=true
- manual_update_integrity_policy_available=true
- developer_id_signing_available=false
- notarization_available=false
- external_review_completed=false
- audit_completed=false
- macos_two_machine_real_user_flow_repeated=false
- representative_usability_evidence_completed=false
- windows_public_artifact_available=false
- android_public_artifact_available=false
- ios_public_artifact_available=false
- production_ready_claim_allowed=false
- production_e2ee_ready=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false

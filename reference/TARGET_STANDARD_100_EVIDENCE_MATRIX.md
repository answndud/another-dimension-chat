# Target Standard 100 Evidence Matrix

Status: P100-0 definition locked. This matrix defines what evidence is required
to judge both the general macOS public app experience at 100% and the full
`docs/product/TARGET_STANDARD.md` at 100%. It is not a 100% completion claim,
not a production-ready claim, not an audit result, not a stable release
approval, and not permission for sensitive communication.

Current public wording must remain:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

## Evidence Order

Public claims must not move ahead of evidence. A release, README, SECURITY
policy, app UI, support template, or reference document may upgrade wording only
after the linked gate records a pass, the false/hold flags in this matrix are
updated, and a later explicit release/claim task authorizes the wording.

## macOS Public App Experience 100%

| Criterion | Required evidence | Current state | Gate |
| --- | --- | --- | --- |
| GitHub Release or official distribution page download | Same-release DMG, checksum, provenance, manifest, release notes, install guide, and update-integrity note are available from the release authority. | pass for current unsigned beta only | [UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md](UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md) |
| Checksum and provenance verification | User can verify the downloaded artifact against a same-release `.sha256` file and public provenance. | pass for current unsigned beta only | [UNSIGNED_PUBLIC_BETA_INSTALL.md](UNSIGNED_PUBLIC_BETA_INSTALL.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md) |
| Developer ID signing | Developer ID Application identity is available, current, and used for the release artifact. | execution path ready; credential hold | [RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md](RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md), [MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md](MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md), [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md) |
| Notarization and stapling | Notarization credential is available; artifact passes notarytool/stapler validation. | execution path ready; credential/artifact hold | [RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md](RELEASE_AUTHORITY_CREDENTIAL_UNBLOCK.md), [MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md](MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md), [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md) |
| Gatekeeper no-exception open | A normal macOS user can open the app without Privacy & Security manual allow or quarantine workaround. | execution path ready; signed artifact hold | [MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md](MACOS_SIGNED_NOTARIZED_EXECUTION_PATH.md), [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md) |
| Supported architecture and macOS scope | Apple Silicon and Intel Mac are both supported, or the release explicitly scopes supported architecture and macOS versions. | pass for explicit Apple Silicon current scope; universal/Intel hold | [MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md](MACOS_UNIVERSAL_SCOPED_ARTIFACT_POLICY.md), [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md) |
| First run and profile unlock | User can understand warning, create/unlock a local profile, and recover from wrong passphrase or corrupt store in app. | source pass; representative usability hold | [MACOS_PRODUCTION_UX_ONBOARDING.md](MACOS_PRODUCTION_UX_ONBOARDING.md), [MACOS_USABILITY_RECOVERY_CLOSURE.md](MACOS_USABILITY_RECOVERY_CLOSURE.md) |
| Invite and safety verification | User can create/import an invite and compare safety material before messaging. | source pass; representative usability hold | [MACOS_PRODUCTION_UX_ONBOARDING.md](MACOS_PRODUCTION_UX_ONBOARDING.md), [PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md](PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md) |
| Manual encrypted envelope exchange | User can export/import encrypted envelopes and replies without assuming automatic network delivery. | supported-scope pass; external delivery false | [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](PRODUCTION_DEFAULT_TRANSPORT_PATH.md), [PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md](PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md) |
| Retry and cancel | User can recover from stale or failed pending send/receive states with retry or cancel. | source pass; production E2EE claim false | [PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md](PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md), [MACOS_PRODUCTION_UX_ONBOARDING.md](MACOS_PRODUCTION_UX_ONBOARDING.md) |
| Local deletion and wipe | Conversation delete, session delete, profile delete, and full local wipe have distinct in-app semantics and recovery copy. | supported-scope pass; secure media deletion false | [PRODUCTION_KEY_STORAGE_LIFECYCLE.md](PRODUCTION_KEY_STORAGE_LIFECYCLE.md), [PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md](PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md) |
| Redacted support report | User can produce support diagnostics with no invite codes, payloads, endpoints, message text, paths, raw logs, passphrases, keys, or private planning notes. | pass for current beta boundary | [PUBLIC_SUPPORT_TRIAGE.md](PUBLIC_SUPPORT_TRIAGE.md), [PUBLIC_INTAKE_POLICY.md](PUBLIC_INTAKE_POLICY.md) |
| Representative usability evidence | At least the required representative macOS user sample completes install, first run, invite, manual envelope, recovery, diagnostics, and local deletion tasks with redacted reports. | hold | [MACOS_USABILITY_RECOVERY_CLOSURE.md](MACOS_USABILITY_RECOVERY_CLOSURE.md), [FIELD_EVIDENCE_RELIABILITY_PROGRAM.md](FIELD_EVIDENCE_RELIABILITY_PROGRAM.md) |
| Update and rollback-safe release channel | Update manifest/signature or explicit manual update policy, version monotonicity, rollback warning/prevention, emergency release path, and checksum continuity are ready. | source pass for manual same-release policy; signed update/rollback-prevention hold | [MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md](MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md), [OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md](OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md) |
| Incident, vulnerability, and support operation | Public support, private vulnerability reporting, incident severity, dependency advisory handling, emergency release, and user notification copy are rehearsed. | source pass; production operations claim false | [OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md](OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md), [INCIDENT_TABLETOP_RECORD.md](INCIDENT_TABLETOP_RECORD.md) |
| Stable macOS release decision | Production/security/distribution/evidence/support blockers are all pass and owner release approval exists. | hold | [STABLE_MACOS_V1_RELEASE_GATE.md](STABLE_MACOS_V1_RELEASE_GATE.md), [STABLE_RELEASE_HOLD_REPORT.md](STABLE_RELEASE_HOLD_REPORT.md) |

## TARGET_STANDARD 100%

| Target standard criterion | Required evidence | Current state | Gate |
| --- | --- | --- | --- |
| Briar/Cwtch-inspired practical private messenger | Product remains no-central-trusted-server oriented without claiming Briar/Cwtch equivalence. | pass for direction; equivalence false | [PRIVACY_MODEL_COMPARISON.md](PRIVACY_MODEL_COMPARISON.md), [PRODUCTION_READINESS_CLAIM_GATE.md](PRODUCTION_READINESS_CLAIM_GATE.md) |
| No phone number | No UI, protocol, release, support, or platform path requires phone-number identity. | pass | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| No email | No UI, protocol, release, support, or platform path requires email identity. | pass | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| No global account | No account service or global login is introduced. | pass | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| No searchable username or public directory | No searchable username, public directory, or central identity lookup exists. | pass | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| No central contact discovery | Contact discovery remains pairwise invite/QR/code based. | pass for current beta/source boundary | [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](PRODUCTION_DEFAULT_TRANSPORT_PATH.md) |
| No central message server dependency | Default transport path does not depend on a central message server. | pass for local/manual default | [PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md](PRODUCTION_DEFAULT_PRACTICAL_TRANSPORT_CLAIM.md) |
| No required push notification | Product flow does not depend on push notification services. | pass for current beta/source boundary | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| No cloud backup | Product does not provide or require cloud backup/sync. | pass for current beta/source boundary | [PRODUCTION_KEY_STORAGE_LIFECYCLE.md](PRODUCTION_KEY_STORAGE_LIFECYCLE.md) |
| Pairwise identity and invite/QR default | Pairwise identity persistence, re-pairing, duplicate prevention, and identity-change warnings are implemented and tested. | source pass; identity audit false | [PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md](PAIRWISE_IDENTITY_SAFETY_PRODUCT_CLOSURE.md), [PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md](PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md) |
| Message-content E2EE | Supported 1:1 local/manual message-content encryption is tested; broad production E2EE review gates are closed before production wording. | D100-1 source-ready protocol/session pass; production/audit/sensitive-use/external-delivery false | [PRODUCTION_E2EE_SOURCE_GATE.md](PRODUCTION_E2EE_SOURCE_GATE.md), [PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md](PRODUCTION_LOCAL_MANUAL_E2EE_CLAIM.md), [PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md](PRODUCTION_PROTOCOL_SESSION_LIFECYCLE.md) |
| Passphrase-first encrypted local storage | Passphrase-first SQLCipher-backed local stores, migration, backup exclusion, rollback policy, reset/rebuild, and local wipe semantics are closed. | D100-2 source-ready local key/storage pass; app wrapping/key rotation/rollback prevention/secure deletion false | [PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md](PRODUCTION_KEY_MANAGEMENT_SOURCE_GATE.md), [PRODUCTION_KEY_STORAGE_LIFECYCLE.md](PRODUCTION_KEY_STORAGE_LIFECYCLE.md), [PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md](PRODUCTION_KEY_ROLLBACK_DELETION_CLAIM.md) |
| Redacted public diagnostics and support | Public diagnostics/support never request or export raw logs, payloads, paths, message text, passphrases, keys, or private notes. | pass for current beta/source boundary | [PUBLIC_INTAKE_POLICY.md](PUBLIC_INTAKE_POLICY.md), [PUBLIC_SUPPORT_TRIAGE.md](PUBLIC_SUPPORT_TRIAGE.md) |
| Security trust base is not platform signing/store authority | Apple, Google, Microsoft, app stores, notarization, signing, SmartScreen, Play Store, TestFlight, or store review are distribution aids only. | pass as non-claim | [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md) |
| Default practical transport understandable to normal users | Family/friend/client users can complete exchange, failure, retry, and recovery in app without a central trusted server. | supported-scope pass; production transport false | [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](PRODUCTION_DEFAULT_TRANSPORT_PATH.md), [MACOS_PRODUCTION_UX_ONBOARDING.md](MACOS_PRODUCTION_UX_ONBOARDING.md) |
| High-risk onion/Tor path separated | Onion/Tor stays advanced, explicit, fail-closed, and separate from default delivery. | pass for current boundary; reliable external delivery false | [TRANSPORT_EXPERIMENT_RUNBOOK.md](TRANSPORT_EXPERIMENT_RUNBOOK.md), [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](PRODUCTION_DEFAULT_TRANSPORT_PATH.md) |
| No automatic network start | App launch must not bootstrap Tor, publish descriptors, open streams, send envelopes, or receive envelopes. | pass for current boundary | [PRODUCTION_DEFAULT_TRANSPORT_PATH.md](PRODUCTION_DEFAULT_TRANSPORT_PATH.md), [FIELD_EVIDENCE_RELIABILITY_PROGRAM.md](FIELD_EVIDENCE_RELIABILITY_PROGRAM.md) |
| User-authorized network actions only | Network behavior requires explicit user action and redacted status. | pass for current boundary | [TRANSPORT_EXPERIMENT_RUNBOOK.md](TRANSPORT_EXPERIMENT_RUNBOOK.md) |
| No external onion delivery claim before evidence | Reliable external onion delivery and repeated external onion evidence remain false until repeated external two-machine evidence exists. | hold | [FIELD_EVIDENCE_RELIABILITY_PROGRAM.md](FIELD_EVIDENCE_RELIABILITY_PROGRAM.md), [REDACTED_FIELD_REPORT_PACKET.md](REDACTED_FIELD_REPORT_PACKET.md) |
| macOS public app | Signed/notarized or explicitly scoped macOS artifact, no Gatekeeper exception, usable onboarding, recovery, support, update, and incident path are complete. | hold | [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md), [STABLE_MACOS_V1_RELEASE_GATE.md](STABLE_MACOS_V1_RELEASE_GATE.md) |
| Windows desktop public app | Real Windows runtime smoke, WebView2/app-data/path review, encrypted store, deletion, diagnostics, packaging, checksum/provenance, and public artifact policy are complete. | hold | [WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md](WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md) |
| Android thin shell | User has explicitly unlocked real Android implementation scope; shell preserves shared-core boundary and avoids Google account, Play Services, FCM, Play Store trust, and cloud backup dependencies. | hold | [ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md](ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md) |
| iOS thin shell | User has explicitly unlocked real iOS implementation scope after Android; shell preserves shared-core boundary and avoids Apple account, iCloud, APNs, App Store/TestFlight trust, and cloud backup dependencies. | hold | [IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md](IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md) |
| Shared Rust core owns security-sensitive behavior | Identity, pairing, protocol, message lifecycle, encrypted storage, and transport policy stay in shared Rust core. | pass for current boundary | [COMPONENT_BOUNDARIES.md](COMPONENT_BOUNDARIES.md), [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| Platform wrappers stay thin | Wrappers own UI, local permission, redacted status, and explicit user actions only; they do not invent independent protocol/storage/transport/pairing semantics. | pass for current boundary; mobile runtime hold | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md) |
| External review/audit | Independent review/audit is completed, findings are fixed/held/waived, and public-safe signoff exists before audited/security wording. | hold | [EXTERNAL_REVIEW_AUDIT_READINESS.md](EXTERNAL_REVIEW_AUDIT_READINESS.md), [AUDIT_FINDING_TRACKER.md](AUDIT_FINDING_TRACKER.md) |
| External field evidence | Repeated real two-machine reports, different-network coverage, restart/resume, offline/online transition, failed delivery recovery, and redacted reporting pass before reliability wording. | hold | [FIELD_EVIDENCE_RELIABILITY_PROGRAM.md](FIELD_EVIDENCE_RELIABILITY_PROGRAM.md), [REDACTED_FIELD_REPORT_PACKET.md](REDACTED_FIELD_REPORT_PACKET.md) |
| Release/update integrity | Same-release checksums/provenance/manifest, update integrity, dependency evidence, emergency release, and rollback guidance are ready for the release class. | source pass for current manual release class; signed update hold | [MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md](MACOS_UPDATE_ROLLBACK_SAFE_RELEASE_CHANNEL.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md), [OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md](OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md) |
| Public wording never exceeds evidence | README, SECURITY, release notes, app UI, support templates, and reference docs keep current non-claims until gates pass. | pass as current non-claim discipline | [PRODUCTION_READINESS_CLAIM_GATE.md](PRODUCTION_READINESS_CLAIM_GATE.md) |

## Gate Connection Matrix

| Gate class | Required linked evidence | Current state |
| --- | --- | --- |
| Deployment readiness gap reconciliation | [DEPLOYMENT_READINESS_GAP_REGISTER.md](DEPLOYMENT_READINESS_GAP_REGISTER.md), [TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md](TARGET_STANDARD_100_ACTIVE_QUEUE_SOURCE_CLOSURE.md) | linked; source-solved supported scopes separated from remaining external blockers |
| Production claim gate | [PRODUCTION_READINESS_CLAIM_GATE.md](PRODUCTION_READINESS_CLAIM_GATE.md), [PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md](PRODUCTION_CLAIM_RELEASE_CLASS_DECISION.md), [STABLE_MACOS_V1_RELEASE_GATE.md](STABLE_MACOS_V1_RELEASE_GATE.md) | linked; production claim false |
| Audit/review | [EXTERNAL_REVIEW_AUDIT_READINESS.md](EXTERNAL_REVIEW_AUDIT_READINESS.md), [AUDIT_FINDING_TRACKER.md](AUDIT_FINDING_TRACKER.md), [INDEPENDENT_REVIEW_PACKET.md](INDEPENDENT_REVIEW_PACKET.md) | linked; audit/review completion false |
| Field evidence | [FIELD_EVIDENCE_RELIABILITY_PROGRAM.md](FIELD_EVIDENCE_RELIABILITY_PROGRAM.md), [FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md](FIELD_EVIDENCE_RELEASE_CLASS_SCOPE_DOWN.md), [REDACTED_FIELD_REPORT_PACKET.md](REDACTED_FIELD_REPORT_PACKET.md) | linked; repeated external evidence false |
| Platform support matrix | [CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md](CROSS_PLATFORM_TARGET_STANDARD_FINAL_CLOSURE.md), [WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md](WINDOWS_PUBLIC_ARTIFACT_SCOPE_DOWN.md), [ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md](ANDROID_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md), [IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md](IOS_IMPLEMENTATION_AUTHORIZATION_SCOPE_DOWN.md) | linked; platform public artifact holds explicit |
| macOS distribution and UX | [MACOS_PRODUCTION_DISTRIBUTION_GATE.md](MACOS_PRODUCTION_DISTRIBUTION_GATE.md), [MACOS_PRODUCTION_UX_ONBOARDING.md](MACOS_PRODUCTION_UX_ONBOARDING.md), [MACOS_USABILITY_RECOVERY_CLOSURE.md](MACOS_USABILITY_RECOVERY_CLOSURE.md) | linked; stable distribution and representative usability hold |
| Operations and release integrity | [OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md](OPERATIONAL_SUPPORT_INCIDENT_PROCESS.md), [INCIDENT_TABLETOP_RECORD.md](INCIDENT_TABLETOP_RECORD.md), [UPDATE_INTEGRITY.md](UPDATE_INTEGRITY.md), [STABLE_RELEASE_HOLD_REPORT.md](STABLE_RELEASE_HOLD_REPORT.md) | linked; production operations claim false |

## Forbidden Claim Matrix

| Forbidden public claim | Current allowed? | Required condition before any change |
| --- | --- | --- |
| `secure messenger` | no | External review, protocol/storage/transport review closure, field evidence, and claim-specific owner approval. |
| `production-ready` | no | Functional, security, transport, distribution, operational, audit/review, field evidence, and stable release gates pass. |
| `audited` | no | Completed external review/audit with public-safe findings handling and reviewer signoff. |
| `sensitive communication safe/allowed` | no | Separate explicit decision after audit, field evidence, support readiness, known-risk publication, and owner approval. |
| `Briar/Cwtch-equivalent` | no | Separate comparative review and evidence that the implementation reaches that level. |
| `reliable external onion delivery` | no | Repeated external two-machine delivery evidence under documented network conditions. |
| `repeated external onion evidence` | no | Multiple accepted redacted real-user field reports, not same-machine/local-only rehearsal. |
| `censorship-resistant` | no | Bridge/censorship implementation, field evidence, and external review. |

## Current False And Hold Flags

- evidence_matrix_machine_checkable=true
- target_standard_100_evidence_matrix_available=true
- target_standard_100_active_queue_source_closure_available=true
- target_standard_100_deployment_gap_reconciled=true
- target_standard_criteria_complete=true
- macos_public_app_100_criteria_complete=true
- pairwise_identity_safety_product_closure_reviewed=true
- macos_update_rollback_safe_release_channel_reviewed=true
- macos_current_scope_supported=true
- macos_universal_intel_scope_still_hold=true
- onboarding_recovery_source_ready=true
- supported_default_transport_ready=true
- supported_local_key_lifecycle_ready=true
- supported_local_deletion_scope_ready=true
- production_key_management_source_gate_reviewed=true
- production_key_management_source_ready=true
- d100_2_key_management_source_gate_reviewed=true
- key_management_source_scope=passphrase-first-sqlcipher-local-profile-store-marker-rollback-local-delete-only
- production_e2ee_source_gate_reviewed=true
- production_e2ee_source_ready=true
- d100_1_e2ee_source_gate_reviewed=true
- protocol_session_e2ee_source_ready=true
- protocol_session_e2ee_source_scope=1:1-local-manual-envelope-message-content-session-replay-retry-cancel-delete
- manual_update_integrity_policy_available=true
- d100_3_signed_notarized_execution_path_reviewed=true
- macos_signed_notarized_execution_path_available=true
- signed_notarized_rc_execution_ready=false
- production_claim_gate_linked=true
- audit_review_gate_linked=true
- field_evidence_gate_linked=true
- platform_support_matrix_linked=true
- current_public_claim_level=unsigned-experimental-public-beta-only
- macos_public_app_100_claim_allowed=false
- whole_target_standard_100_claim_allowed=false
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- secure_messenger_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- repeated_external_onion_evidence_claim_allowed=false
- briar_cwtch_equivalent_claim_allowed=false
- censorship_resistant_claim_allowed=false
- stable_release_allowed=false
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- macos_two_machine_real_user_flow_repeated=false
- repeated_redacted_field_reports_available=false
- production_field_evidence_ready=false
- developer_id_signing_available=false
- notarization_available=false
- stable_signed_notarized_artifact_available=false
- gatekeeper_manual_bypass_required_for_current_beta=true
- representative_usability_evidence_completed=false
- update_signature_ready=false
- rollback_policy_ready=false
- production_e2ee_ready=false
- production_key_management_ready=false
- app_key_wrapping_ready=false
- key_rotation_ready=false
- rollback_prevention_claimed=false
- secure_deletion_claim_allowed=false
- production_transport_ready=false
- production_distribution_ready=false
- production_operational_readiness_claim_allowed=false
- windows_public_artifact_available=false
- android_public_artifact_available=false
- ios_public_artifact_available=false
- platform_missing_artifacts_hidden=false
- false_or_hold_items_hidden=false
- public_claim_ahead_of_evidence=false
- generated_release_artifacts_staged=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- next_required_phase=Phase M100-1 - macOS Public App Distribution Credential Unblock

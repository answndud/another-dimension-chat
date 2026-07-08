# Cross-Platform Target Standard Final Closure

Status: RB-13 cross-platform target standard final closure. This is not a
whole-product 100% completion claim, not stable release approval, not
production readiness, not audited security, not a Briar/Cwtch-equivalent claim,
not censorship resistance, and not permission for sensitive communication.

The target standard is aligned by platform and claim class. Missing platform
artifacts are excluded from public artifact claims rather than hidden.
The W100-1 through R100-3 final active queue decision is recorded in
`reference/TARGET_STANDARD_100_FINAL_ACTIVE_QUEUE_CLOSURE.md`.

## Platform Matrix

| Platform | Current class | Public artifact claim | Decision |
| --- | --- | --- | --- |
| macOS | unsigned experimental public beta | yes, macOS beta only | pass for current lower release class |
| Windows | execution-path-ready-local-build-candidate-only | no | hold Windows public artifact claim |
| Android | source-shell-only | no | hold Android runtime/artifact claim |
| iOS | source-shell-only | no | hold iOS runtime/artifact claim |

## Target Standard Matrix

| Area | Decision | Notes |
| --- | --- | --- |
| No phone/email/global account | pass | Public/product boundary remains aligned. |
| No searchable username/public directory | pass | No central discovery introduced. |
| No central contact discovery/message server | pass for current default path | Default path remains local/manual courier envelope exchange. |
| No mandatory push/cloud backup | pass | Android/iOS source shells keep push/cloud backup out of scope. |
| Pairwise invite/verification | pass for desktop beta | Mobile remains source shell only. |
| Message-content E2EE | pass only for supported local/manual envelope scope | Broad production E2EE claim remains false. |
| Passphrase-first local encrypted storage | pass for supported local scope | Production key management remains false. |
| Redacted diagnostics/support | pass for current beta/source shells | Raw logs/private payloads remain forbidden. |
| Explicit network/user action | pass for current beta/source shells | Automatic network launch remains false. |
| High-risk onion separation | pass as fail-closed advanced path | No external onion delivery success claim. |
| External review/audit | hold | Review packet exists; review/audit completion remains false. |
| Field evidence | hold for stable/production | Existing lower-class beta publication selected. |
| Signed/notarized stable artifact | hold | Lower release class selected. |
| Windows public artifact | hold | D100-5 execution path [WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md](WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md) and real-Windows result schema [WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md](WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md) are ready; real runtime pass, artifact, installer, signing, and upload remain false. |
| Android public artifact | hold | Source shell only. |
| iOS public artifact | hold | Source shell only. |

## Final Release-Class Decision

The next release class is `signed-public-beta-or-rc` if a future explicit
release task provides appropriate artifacts. Until then, the existing
`v0.1.0-beta-onion-unsigned` prerelease remains the current public artifact.

Public wording must keep:

- `unsigned experimental public beta`,
- `not audited`,
- `not production-ready`,
- `sensitive communication prohibited`.

## Current Closure Flags

- rb_13_cross_platform_target_standard_final_closure_reviewed=true
- target_standard_100_final_active_queue_closure_available=true
- final_active_queue_closure_reviewed=true
- all_remaining_active_phases_closed_by_source_or_hold_gate=true
- w100_1_windows_runtime_parity_scope_blocker_closed=true
- w100_2_windows_public_artifact_blocker_closed=true
- x100_1_cross_desktop_product_parity_blocker_closed=true
- mob100_0_mobile_scope_unlock_decision_closed=true
- mob100_1_mobile_api_stabilization_blocker_closed=true
- mob100_2_android_public_app_candidate_blocker_closed=true
- mob100_3_ios_public_app_candidate_blocker_closed=true
- x100_2_cross_platform_field_support_blocker_closed=true
- r100_1_production_claim_gate_decision_closed=true
- r100_2_stable_macos_release_decision_closed=true
- r100_3_whole_product_target_standard_gate_decision_closed=true
- target_standard_matrix_available=true
- platform_artifact_matrix_available=true
- platform_public_claims_aligned=true
- next_release_class=signed-public-beta-or-rc
- macos_current_public_artifact_class=unsigned-experimental-public-beta
- windows_current_public_artifact_class=none-local-build-candidate-only
- d100_5_windows_public_artifact_execution_path_reviewed=true
- windows_public_artifact_execution_path_available=true
- windows_real_runtime_result_schema_available=true
- windows_real_runtime_result_validator_available=true
- windows_result_requires_current_source_commit=true
- windows_result_current_head_strict_mode_ready=true
- windows_real_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_public_artifact_upload_allowed=false
- android_current_public_artifact_class=none-source-shell-only
- ios_current_public_artifact_class=none-source-shell-only
- whole_target_standard_100_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- briar_cwtch_equivalent_claim_allowed=false
- censorship_resistant_claim_allowed=false
- stable_release_allowed=false
- production_claim_gate_passed=false
- stable_release_publication_performed=false
- lower_release_class_claim_boundary_ready=true
- remaining_limitations_public_safe=true
- plan_active_queue_complete=true

# Windows Public Artifact Scope-Down

Status: RB-10 Windows public artifact scope-down closure. This is not a
Windows installer, not a portable Windows release artifact, not a Windows code
signing result, not a SmartScreen reputation claim, not a public Windows upload,
and not production readiness.

Windows remains a local build candidate until a real Windows runtime smoke,
packaging review, signing decision, checksum/provenance set, and upload review
are completed on a Windows machine.
D100-5 execution path readiness is tracked in
`reference/WINDOWS_PUBLIC_ARTIFACT_EXECUTION_PATH.md`, with real-Windows result
schema in `reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md`.

## Scope-Down Decision

The Windows blocker is closed for cross-platform planning by lowering Windows
to `local-build-candidate-only`. Public Windows artifact wording remains false.
The macOS public beta claim is not expanded to Windows.

Public wording must still say `not production-ready`.

## Current Scope-Down Flags

- rb_10_windows_public_artifact_scope_down_reviewed=true
- d100_5_windows_public_artifact_execution_path_reviewed=true
- windows_public_artifact_execution_path_available=true
- windows_real_runtime_result_schema_available=true
- windows_real_runtime_result_validator_available=true
- real_windows_runtime_smoke_requirements_defined=true
- windows_installer_signing_decision_recorded=true
- windows_checksum_provenance_requirements_defined=true
- windows_public_copy_requirements_defined=true
- windows_support_diagnostics_requirements_defined=true
- windows_no_overclaim_gate_ready=true
- windows_readiness=local-build-candidate-only
- windows_local_usable_criteria_defined=true
- windows_local_runtime_smoke_status=source-boundary-only
- windows_local_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_release_packaging_allowed=false
- windows_generated_artifact_commit_allowed=false
- windows_stable_claim_allowed=false
- windows_unsigned_beta_or_rc_scope_allowed=true
- windows_public_artifact_no_longer_blocks_cross_platform_planning=true
- windows_public_artifact_still_blocks_windows_public_claims=true
- next_required_phase=RB-11 android implementation authorization and shell closure

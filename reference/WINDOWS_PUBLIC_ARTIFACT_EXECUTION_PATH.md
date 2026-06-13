# Windows Public Artifact Execution Path

Status: D100-5 Windows public artifact execution path is source-ready and
currently held on missing real Windows runtime results, packaging output,
signing decision, checksum/provenance evidence, public copy review, and release
upload authorization. This is not a public Windows artifact, not a Windows
installer, not a Windows signing result, not production-ready, not audited, and
not permission for sensitive communication.

The focused verifier is `scripts/windows_public_artifact_execution_path_once.sh`.
It checks the source-side execution path and the real-Windows result validator
without building, uploading, or committing generated artifacts.
The result schema is `reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md`.

## Execution Inputs

Actual Windows artifact execution requires:

- a real Windows machine,
- `npm --prefix apps/desktop-tauri run test:windows-boundary` run on Windows,
- a Windows package candidate generated on Windows,
- a signing decision recorded as unsigned hold, signtool signed, store signed,
  or not applicable for a portable candidate,
- SHA-256 checksum, public provenance, and manifest records,
- public copy review,
- redacted support diagnostics review,
- no overclaim review,
- explicit later release/upload authorization.

## One-Shot Operator Path

1. Run the Windows local runtime boundary command on a real Windows machine.
2. Build the Windows package candidate only when a release task explicitly
   authorizes packaging.
3. Record installer/signing decision without treating Microsoft Store,
   SmartScreen, or code signing as a messenger security boundary.
4. Generate checksum, provenance, and manifest evidence beside the candidate.
5. Validate redacted support diagnostics and public non-claim copy.
6. Validate the result with
   `scripts/validate_windows_public_artifact_results.mjs`.
7. Keep public Windows artifact, installer, upload, production-ready, audited,
   reliable-delivery, and sensitive-use claims false until later release gates
   explicitly approve them.

## Current Gate Flags

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
- windows_result_requires_real_windows_machine=true
- windows_result_requires_checksum_provenance=true
- windows_result_requires_support_diagnostics_review=true
- windows_result_requires_public_non_claims=true
- windows_result_rejects_local_only_or_private_data=true
- windows_public_artifact_candidate_requires_manual_review=true
- windows_real_runtime_smoke_passed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_release_packaging_allowed=false
- windows_generated_artifact_commit_allowed=false
- windows_public_copy_published=false
- windows_production_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- next_required_phase=external-credentials-field-review-mobile-release-gates

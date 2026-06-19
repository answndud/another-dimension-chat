# Windows Public Artifact Candidate Gate

Status: Windows public artifact candidate contract is source-defined, but no
public Windows artifact, installer, signing result, upload authorization, or
production claim is available from this gate.

This gate keeps Windows packaging semantics aligned with shared core product
semantics before any generated artifact exists. It is not a release artifact
and does not allow sensitive communication claims.

## Candidate Contract

- windows_public_artifact_candidate=true
- artifact_type=windows-shell-nsis-exe-installer-candidate
- artifact_filename=AnotherDimension-0.1.0-windows-shell-nsis.exe
- checksum_file=AnotherDimension-0.1.0-windows-shell-nsis.exe.sha256
- provenance_file=AnotherDimension-0.1.0-windows-shell-nsis.exe.provenance.json
- manifest_file=WINDOWS_ARTIFACT_MANIFEST.json
- artifact_identity_tuple=AnotherDimension-0.1.0-windows-shell-nsis.exe#AnotherDimension-0.1.0-windows-shell-nsis.exe.sha256#AnotherDimension-0.1.0-windows-shell-nsis.exe.provenance.json#WINDOWS_ARTIFACT_MANIFEST.json
- build_command=npm --prefix apps/desktop-tauri run tauri:build:windows-nsis:shell
- bundle_target=nsis
- runtime_mode=shell-sidecar-pending
- onion_runtime_compiled=false
- default_extension=.exe
- portable_default_allowed=false
- msi_alternative_allowed=true
- webview2_runtime_required=true
- webview2_failure_class_redacted=true
- app_data_resolver=tauri-app-data
- app_data_resolver_shared_storage_semantics=true
- app_data_resolver_public_support_safe=true
- raw_local_path_returned=false
- support_report_raw_path_allowed=false
- encrypted_store_required=true
- shared_core_bypass_allowed=false
- profile_session_message_storage_bypass_allowed=false
- local_delete_wipe_semantics_shared_core=true
- manifest_checksum_provenance_required=true
- manifest_sha256_sidecar_required=true
- artifact_basename_path_boundary_required=true
- manifest_validates_version_commit_installer_webview2_no_auto_update=true
- windows_runtime_result_packet_required_for_public_artifact=true
- windows_manifest_checksum_provenance_separate_from_runtime_result=true
- runtime_result_external_peer_evidence_separated=true
- engine_sidecar_required=true
- engine_sidecar_packaged_required=true
- engine_sidecar_runtime_mode=manual-e2ee-engine-sidecar
- engine_sidecar_protocol=ad-engine-json-stdio-v1
- engine_sidecar_contract_version=1
- engine_sidecar_status_command=status
- engine_sidecar_manual_self_test_command=manual-self-test
- engine_sidecar_manual_self_test_required=true
- engine_sidecar_raw_path_returned=false
- engine_sidecar_stdout_returned=false
- engine_sidecar_stderr_returned=false
- engine_sidecar_local_runtime_promoted_to_delivery_proof=false
- real_windows_runtime_result_present=false
- windows_runtime_result_fixture_promoted_to_public_artifact=false
- windows_non_windows_runtime_result_promoted=false
- windows_local_or_fabricated_runtime_result_promoted=false
- local_runtime_promoted_to_delivery_proof=false
- smartscreen_security_boundary_claimed=false
- code_signing_security_boundary_claimed=false
- store_reputation_security_boundary_claimed=false
- auto_update_claimed=false
- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_public_artifact_claim_allowed=false
- windows_installer_claim_allowed=false
- windows_upload_claim_allowed=false
- windows_production_claim_allowed=false

## Source Owners

- `crates/core/src/lib.rs` owns the shared core candidate summary.
- `apps/desktop-tauri/src/action-state.js` owns the desktop state view.
- `apps/desktop-tauri/src-tauri/src/lib.rs` owns the Tauri app-data adapter
  boundary and keeps raw local paths out of support-safe outputs.
- `reference/WINDOWS_ARTIFACT_MANIFEST_CHECKSUM_SCHEMA.md` owns artifact byte,
  checksum, provenance, and manifest consistency.
- `reference/WINDOWS_REAL_RUNTIME_RESULT_SCHEMA.md` owns real Windows runtime
  result evidence and keeps it separate from external peer delivery evidence.

## Non-Claims

SmartScreen, Microsoft Store reputation, installer success, WebView2 presence,
and code signing are distribution or integrity aids only. They are not protocol
security, message confidentiality, peer authentication, high-risk transport,
or production readiness boundaries. The default Windows public candidate is
the thin shell slice packaged with a manual-E2EE engine sidecar. The sidecar
may satisfy only the redacted local runtime self-test gate; onion-runtime
High-Risk Mode remains a separate build/runtime evidence path.

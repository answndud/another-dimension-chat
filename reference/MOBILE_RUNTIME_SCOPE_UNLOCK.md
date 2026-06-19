# Mobile Runtime Scope Unlock

Status: Step 8 source/runtime-candidate unlock is ready for a first callable
shared-core JSON bridge scope. This is not generated UniFFI, not JNI, not a
Swift FFI bridge, not native network delivery, not Android/iOS packaging, not
mobile readiness, not production-ready, and not permission for sensitive
communication.

The first callable scope is deliberately narrow:

- `shared_core_status_surface`
- `redacted_support_diagnostics`

The shared Rust bridge lives in `crates/mobile` and calls `another-dimension-core`
production boundary summaries. Android and iOS source adapters call an injected
JSON bridge and decode the same DTO/result vocabulary. Wrappers still own only
UI, local permission presentation, redacted status display, and explicit user
action tokens. The JSON bridge also binds blocked command results to the shared
error taxonomy; for example `profile_unlock_lock_status` returns
`locked_profile` with `enter passphrase` while still withholding native unlock
or messaging capability.

## Current Gate Flags

- mobile_runtime_scope_unlock_recorded=true
- owner_authorization_for_callable_mobile_binding=true
- explicit_callable_mobile_binding_request=true
- mobile_binding_strategy=shared_core_json_bridge
- shared_rust_mobile_bridge_crate_ready=true
- android_json_bridge_adapter_ready=true
- ios_json_bridge_adapter_ready=true
- mobile_forbidden_dependency_scan_ready=true
- mobile_error_taxonomy_bound_to_json_bridge=true
- app_launch_network_boundary_required=true
- shared_core_api_boundary_closed=true
- shared_core_diagnostics_boundary_closed=true
- shared_core_runtime_status_boundary_closed=true
- profile_unlock_status_failure_class=locked_profile
- callable_json_bridge_implemented=true
- callable_ffi_implemented=false
- generated_bindings_claimed=false
- wrapper_specific_protocol_storage_transport_allowed=false
- native_runtime_messaging_may_start=false
- network_delivery_may_start=false
- release_packaging_may_start=false
- android_public_artifact_ready=false
- ios_public_artifact_ready=false
- mobile_readiness_claimed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false

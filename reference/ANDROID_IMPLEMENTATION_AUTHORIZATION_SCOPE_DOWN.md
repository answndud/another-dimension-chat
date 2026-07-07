# Android Implementation Authorization Scope-Down

Status: RB-11 Android implementation authorization and shell closure. This is
not an APK, not an AAB, not Play Store distribution, not Android runtime
messaging, not Android public artifact readiness, and not production readiness.

Android is authorized only as a source shell over the shared-core mobile API
boundary. Runtime messaging, FFI binding execution, Android release packaging,
Google/Play Services integration, FCM, cloud backup, and public Android artifact
claims remain out of scope.

Public wording must still say `not production-ready`.

## Current Scope

- Shared-core DTO and diagnostics contract exists.
- Android Kotlin source shell exists.
- Android shell is passphrase-first and redacted-diagnostics oriented.
- Android manifest has no network permission.
- Android backup exclusion XML exists.
- Android command surfaces remain blocked adapters until real shared Rust
  binding/runtime authorization exists.

## Current Scope-Down Flags

- rb_11_android_implementation_authorization_scope_down_reviewed=true
- android_source_shell_authorized=true
- android_shared_core_boundary_ready=true
- android_ffi_contract_plan_ready=true
- android_runtime_messaging_authorized=false
- android_runtime_messaging_created=false
- android_public_artifact_ready=false
- android_apk_aab_artifact_ready=false
- android_play_store_distribution_ready=false
- android_google_account_dependency_allowed=false
- android_play_services_dependency_allowed=false
- android_fcm_dependency_allowed=false
- android_cloud_backup_allowed=false
- android_public_claim_allowed=false
- android_source_shell_no_longer_blocks_cross_platform_planning=true
- android_runtime_still_blocks_android_public_claims=true
- next_required_phase=RB-12 ios implementation authorization and shell closure

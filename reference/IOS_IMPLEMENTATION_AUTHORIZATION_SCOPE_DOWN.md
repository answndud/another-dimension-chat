# iOS Implementation Authorization Scope-Down

Status: RB-12 iOS implementation authorization and shell closure. This is not
an IPA, not TestFlight distribution, not App Store distribution, not iOS runtime
messaging, not iOS public artifact readiness, and not production readiness.

iOS is authorized only as a source shell over the shared-core mobile API
boundary. Runtime messaging, FFI binding execution, iOS release packaging,
APNs, iCloud backup, Apple account dependency, TestFlight/App Store trust, and
public iOS artifact claims remain out of scope.

Public wording must still say `not production-ready`.

## Current Scope

- Shared-core DTO and diagnostics contract exists.
- iOS Swift source shell exists.
- iOS shell is passphrase-first and redacted-diagnostics oriented.
- iCloud entitlement arrays are empty.
- iOS command surfaces remain blocked adapters until real shared Rust
  binding/runtime authorization exists.

## Current Scope-Down Flags

- rb_12_ios_implementation_authorization_scope_down_reviewed=true
- ios_source_shell_authorized=true
- ios_shared_core_boundary_ready=true
- ios_ffi_contract_plan_ready=true
- ios_runtime_messaging_authorized=false
- ios_runtime_messaging_created=false
- ios_public_artifact_ready=false
- ios_ipa_artifact_ready=false
- ios_testflight_distribution_ready=false
- ios_app_store_distribution_ready=false
- ios_apple_account_dependency_allowed=false
- ios_apns_dependency_allowed=false
- ios_icloud_backup_allowed=false
- ios_public_claim_allowed=false
- ios_source_shell_no_longer_blocks_cross_platform_planning=true
- ios_runtime_still_blocks_ios_public_claims=true
- next_required_phase=RB-13 cross-platform target standard final closure

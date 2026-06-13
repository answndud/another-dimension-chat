# iOS Public App Candidate

Status: Step 10 iOS public app candidate path is source-ready and held on
missing real iOS device evidence, provisioning/signing evidence, IPA/TestFlight
artifact evidence, privacy-label review, and distribution approval. This is not
an IPA, not TestFlight distribution, not App Store distribution, not iOS public
artifact readiness, not production-ready, and not permission for sensitive
communication.

The iOS shell remains a thin wrapper over the shared-core mobile API and the
Step 8 JSON bridge candidate. iOS must not introduce iCloud backup, CloudKit,
APNs, contacts, Apple account dependency, push notification delivery, or cloud
backup dependencies.

## Current Gate Flags

- ios_public_app_candidate_path_ready=true
- ios_artifact_manifest_schema_available=true
- ios_artifact_manifest_validator_available=true
- ios_public_artifact_checksum_verifier_ready=true
- ios_shell_uses_shared_core_json_bridge_candidate=true
- ios_forbidden_dependency_scan_ready=true
- ios_minimal_entitlements_review_ready=true
- ios_release_package_smoke_ready=false
- ios_real_device_smoke_passed=false
- ios_provisioning_ready=false
- ios_ipa_artifact_ready=false
- ios_testflight_distribution_ready=false
- ios_app_store_distribution_ready=false
- ios_public_artifact_ready=false
- ios_public_artifact_upload_allowed=false
- ios_generated_artifact_commit_allowed=false
- ios_public_claim_allowed=false
- mobile_readiness_claimed=false
- production_ready_claim_allowed=false
- sensitive_communication_allowed=false

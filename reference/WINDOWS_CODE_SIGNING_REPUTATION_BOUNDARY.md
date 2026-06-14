# Windows Code Signing And Reputation Boundary

Status: source boundary only. No Windows signing credential, Microsoft Store
approval, SmartScreen reputation, public Windows artifact, upload
authorization, or production claim is available from this boundary.

## Required Evidence Before Future Claim

- windows_code_signing_reputation_boundary=true
- signtool_signature_result_required=true
- certificate_subject_record_required=true
- certificate_thumbprint_record_required=true
- timestamp_authority_record_required=true
- smart_screen_reputation_observation_required=true
- microsoft_store_reputation_observation_required=true
- signed_artifact_manifest_binding_required=true
- signed_artifact_provenance_binding_required=true
- signed_artifact_runtime_result_binding_required=true

## Current Boundary

- windows_public_artifact_ready=false
- windows_installer_ready=false
- windows_signing_ready=false
- windows_public_artifact_upload_allowed=false
- windows_production_claim_allowed=false
- smartscreen_security_boundary_claimed=false
- code_signing_security_boundary_claimed=false
- store_reputation_security_boundary_claimed=false
- signing_reputation_message_security_claim_allowed=false
- signing_reputation_high_risk_claim_allowed=false

## Non-Claims

Code signing, timestamping, Microsoft Store review, and SmartScreen reputation
can help users identify a distributed artifact and can reduce installation
friction. They do not prove message confidentiality, peer authentication,
transport anonymity, endpoint safety, coercion safety, global traffic
correlation safety, audit completion, or production readiness.

# Stable macOS v1.0 Release Gate

Status: OPS-10 stable macOS v1.0 gate reviewed with decision hold. This does
not authorize a stable release, release upload, DMG rebuild, GitHub Release
edit, beta wording removal, production-ready claim, audited claim,
security-ready claim, reliable external delivery claim, or sensitive
communication permission.

The current public artifact remains the macOS Apple Silicon unsigned
experimental public beta. The stable release gate is complete as a public-safe
hold decision only.

## Gate Decision

Decision: hold.

Reason: the source-side readiness inputs from OPS-2 through OPS-9 are present,
but stable release prerequisites are still false. A stable release requires
actual signed/notarized artifact work, completed external review or audit,
field evidence, and a separate owner release decision.

## Required Inputs And Current Result

| Area | Current result | Stable impact |
| --- | --- | --- |
| Protocol/session lifecycle | Review input exists; `production_e2ee_ready=false`. | Hold production-ready and security-ready claims. |
| Key/storage lifecycle | Review input exists; `production_key_management_ready=false`. | Hold sensitive-use and security-ready claims. |
| Default transport | Local manual envelope default exists; `production_transport_ready=false`. | Hold reliable external delivery claims. |
| macOS UX/onboarding | Source-side UX gate exists; `usability_study_completed=false`. | Hold production wording removal. |
| macOS distribution | Distribution gate exists; `stable_signed_notarized_artifact_available=false`. | Hold stable release publication. |
| External review/audit | Review packet exists; `external_review_completed=false` and `audit_completed=false`. | Keep `not audited`. |
| Field evidence | Program exists; `macos_two_machine_real_user_flow_repeated=false`. | Hold reliable delivery and sensitive-use claims. |
| Operations | Incident/support process exists; `production_operational_readiness_claim_allowed=false`. | Hold production operations claim. |

## Public Wording Decision

Keep all current public wording:

- `unsigned experimental public beta`
- `sensitive communication prohibited`
- `not audited`
- `not production-ready`

Do not publish stable release notes, remove beta wording, or describe this app
as a secure messenger, audited, production-ready, reliable external onion
delivery product, Briar/Cwtch-equivalent product, censorship-resistant product,
or safe for sensitive communication.

## Release Mutation Boundary

This gate does not authorize:

- release upload,
- release body edit,
- release asset deletion,
- DMG rebuild,
- generated `public-release/` commit,
- generated `beta-artifacts/` commit,
- signing or notarization claim,
- auto-update channel creation.

Any future stable release requires an explicit release task and a fresh stable
preflight after the blockers below are resolved.

## Remaining Stable Blockers

- No signed/notarized stable macOS artifact exists.
- No completed external review or audit exists.
- No repeated real macOS two-machine field evidence exists.
- Production E2EE readiness remains false.
- Production key-management readiness remains false.
- Production transport readiness remains false.
- Production distribution readiness remains false.
- Production field evidence readiness remains false.
- Sensitive communication remains prohibited.
- Owner stable release approval is not recorded.

## Current Gate Flags

- stable_macos_v1_release_gate_reviewed=true
- stable_release_gate_decision=hold
- stable_macos_v1_release_allowed=false
- public_stable_release_allowed=false
- stable_signed_notarized_artifact_available=false
- external_review_completed=false
- audit_completed=false
- macos_two_machine_real_user_flow_repeated=false
- production_e2ee_ready=false
- production_key_management_ready=false
- production_transport_ready=false
- production_distribution_ready=false
- production_field_evidence_ready=false
- production_operational_readiness_claim_allowed=false
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- release_body_beta_wording_removal_authorized=false
- next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision

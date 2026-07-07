# Stable Release Hold Report

Status: public-safe stable release hold report available. M100-8 is closed for
active-queue progress by explicit owner policy waiver only. This is not a
stable release note, not a GitHub Release body, not an audit result, not
production readiness, not a public copy upgrade, and not permission for
sensitive communication.

## Hold Summary

The macOS v1.0 stable release gate is held. The repository has source-side
review inputs and process gates, but it does not have the artifacts or external
evidence required to remove beta wording.

Public users should continue to see the current status as:

```text
unsigned experimental public beta
sensitive communication prohibited
not audited
not production-ready
```

## Stable Blocker Ledger

| Blocker | Current state | Decision |
| --- | --- | --- |
| Signed/notarized macOS artifact | Missing. | hold |
| External review or audit completion | Missing. | hold |
| Repeated real macOS two-machine field evidence | Missing. | hold |
| Production E2EE readiness | false. | hold |
| Production key-management readiness | false. | hold |
| Production transport readiness | false. | hold |
| Production distribution readiness | false. | hold |
| Production field evidence readiness | false. | hold |
| Owner stable release approval | Missing. | hold |

## Allowed Maintainer Message

The current public macOS artifact remains an unsigned experimental public beta.
It is useful for inspecting and trying the local desktop flow after checksum
verification, but it is not audited, not production-ready, and sensitive
communication is prohibited. A stable macOS release is held until signing,
notarization, external review/audit, field evidence, and owner release approval
are complete.

## Current Hold Flags

- stable_release_hold_report_available=true
- m100_8_stable_release_blocker_closed=true
- stable_release_policy_waiver_authorized=true
- stable_release_waiver_scope=active-queue-unblock-only
- stable_release_evidence_required_for_public_copy_upgrade=true
- public_copy_upgrade_authorized=false
- public_copy_upgrade_performed=false
- stable_release_gate_decision=hold
- stable_macos_v1_release_allowed=false
- public_stable_release_allowed=false
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- release_upload_authorized=false
- dmg_rebuild_authorized=false
- release_body_beta_wording_removal_authorized=false
- next_required_action=external-audit-field-evidence-signed-notarized-artifact-owner-release-decision

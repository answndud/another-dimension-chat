# Production Claim Release-Class Decision

Status: RB-8 claim gate decision. Stable production claims are not allowed.
The selected next release class is lower than stable: signed public beta or RC,
with existing non-claims retained.

This is not a stable release approval, not production readiness, not a security
claim, not an audit result, not reliable external delivery evidence, and not
permission for sensitive communication.

## Decision

Because external review/audit, real field evidence, stable signed/notarized
artifact, and production readiness remain false, beta wording removal is not
allowed. The only allowed continuation path is a lower release class that keeps:

- `unsigned experimental public beta` or an explicit non-stable RC class,
- `not audited`,
- `not production-ready`,
- `sensitive communication prohibited`.

## Claim Matrix Result

| Claim | Decision |
| --- | --- |
| Stable release | hold |
| Production-ready | forbidden |
| Audited | forbidden |
| Security-ready | forbidden |
| Sensitive communication allowed | forbidden |
| Reliable external delivery | forbidden |
| Signed public beta / RC | allowed as lower release class only |

## Current Decision Flags

- rb_8_production_claim_release_class_decision_reviewed=true
- stable_release_candidate_gate_decision=lower-release-class-only
- next_release_class=signed-public-beta-or-rc
- production_ready_claim_allowed=false
- beta_wording_removal_allowed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- stable_macos_v1_release_allowed=false
- public_stable_release_allowed=false
- lower_release_class_claim_boundary_ready=true
- public_wording_matches_lower_release_class=true
- owner_stable_release_approval_recorded=false
- next_required_phase=RB-9 github stable release publication

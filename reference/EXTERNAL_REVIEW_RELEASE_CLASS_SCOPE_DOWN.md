# External Review Release-Class Scope-Down

Status: RB-6 release-class scope-down closure. This is not an external review
result, not an audit result, not reviewer signoff, not a public user safety
signoff, not audited security, not production readiness, and not permission for
sensitive communication.

The RB-6 blocker cannot be closed by inventing an external reviewer or audit.
The accepted workaround is to lower the release class until a real independent
review or audit exists.

## Scope-Down Decision

Completed external review or audit remains required before stable,
production-ready, audited, security-ready, or sensitive-use wording can change.
It is not required to continue source-side work toward a signed public beta or
RC as long as the public wording keeps:

- `not audited`,
- `not production-ready`,
- `sensitive communication prohibited`,
- no `secure messenger` claim.

The existing review packet and finding tracker are sufficient for reviewer
intake readiness. They are not an external review result.

## Required Future Review

Before stable or production wording can change, maintainers still need:

- a named independent review or audit report,
- public-safe finding summaries,
- private handling for sensitive vulnerability details,
- fix/hold/waive decisions for every finding,
- no unresolved critical or high blocker for the claimed release class,
- public wording that does not exceed the review scope.

## Current Scope-Down Flags

- rb_6_external_review_release_class_scope_down_reviewed=true
- review_packet_public_safe=true
- audit_finding_tracker_available=true
- external_review_completed=false
- audit_completed=false
- reviewer_signoff_claimed=false
- public_user_safety_signoff_claimed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- stable_or_production_release_allowed_without_external_review=false
- signed_public_beta_or_rc_release_class_allowed_without_external_review=true
- external_review_no_longer_blocks_lower_release_class=true
- external_review_still_blocks_stable_or_production_claims=true
- fabricated_review_or_peer_evidence_allowed=false
- next_required_phase=RB-7 signed notarized macOS stable artifact pipeline

# Field Evidence Release-Class Scope-Down

Status: RB-5 release-class scope-down closure. This is not a real macOS
two-machine success result, not reliable external delivery evidence, not
production field evidence, not production readiness, not audited security, and
not permission for sensitive communication.

The RB-5 blocker cannot be closed by inventing peer reports. The accepted
workaround is to lower the release class until real external field evidence is
available.

## Scope-Down Decision

External macOS two-machine evidence remains required for stable or production
wording. It is not required to continue source-side work toward a signed public
beta or RC as long as the public wording remains:

- `unsigned experimental public beta` or a lower non-production release class,
- `sensitive communication prohibited`,
- `not audited`,
- `not production-ready`.

For a signed public beta or RC, field evidence may be tracked as a known
limitation instead of a release-opening blocker. The app may only describe the
supported default path as local/manual courier envelope exchange. Reliable
external delivery, security-ready, production-ready, audited, and sensitive-use
wording remain forbidden.

## What This Does Not Prove

This closure does not prove:

- real external delivery,
- repeated macOS two-machine reliability,
- different-network coverage,
- onion delivery success,
- safe use for sensitive communication,
- stable or production release readiness.

## Required Future Evidence

Before stable or production wording can change, maintainers still need real
redacted reports that pass `scripts/validate_redacted_field_reports.mjs` and
cover:

- at least two macOS machines,
- at least one different-network run,
- clean install/checksum/first launch,
- profile create/unlock,
- invite/verify,
- manual encrypted envelope round trip,
- retry/cancel recovery,
- restart/resume,
- offline/online transition,
- failed delivery recovery,
- delete/wipe lifecycle controls,
- redacted diagnostics copy.

## Current Scope-Down Flags

- rb_5_field_evidence_release_class_scope_down_reviewed=true
- real_external_macos_two_machine_reports_available=false
- redacted_field_report_validator_available=true
- production_field_evidence_ready=false
- reliable_external_delivery_claim_allowed=false
- external_delivery_success_claim_allowed=false
- sensitive_communication_allowed=false
- stable_or_production_release_allowed_without_field_evidence=false
- signed_public_beta_or_rc_release_class_allowed_without_field_evidence=true
- field_evidence_no_longer_blocks_lower_release_class=true
- field_evidence_still_blocks_stable_or_production_claims=true
- fabricated_peer_evidence_allowed=false
- next_required_phase=RB-6 external review and audit closure

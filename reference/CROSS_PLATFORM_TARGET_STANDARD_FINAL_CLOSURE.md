# Cross-Platform Target Standard Final Closure

Status: RB-13 cross-platform target standard final closure. This is not a
whole-product 100% completion claim, not stable release approval, not
production readiness, not audited security, not a Briar/Cwtch-equivalent claim,
not censorship resistance, and not permission for sensitive communication.

The target standard is aligned by platform and claim class. Missing platform
artifacts are excluded from public artifact claims rather than hidden.

## Platform Matrix

| Platform | Current class | Public artifact claim | Decision |
| --- | --- | --- | --- |
| macOS | unsigned experimental public beta | yes, macOS beta only | pass for current lower release class |
| Windows | local-build-candidate-only | no | hold Windows public artifact claim |
| Android | source-shell-only | no | hold Android runtime/artifact claim |
| iOS | source-shell-only | no | hold iOS runtime/artifact claim |

## Target Standard Matrix

| Area | Decision | Notes |
| --- | --- | --- |
| No phone/email/global account | pass | Public/product boundary remains aligned. |
| No searchable username/public directory | pass | No central discovery introduced. |
| No central contact discovery/message server | pass for current default path | Default path remains local/manual courier envelope exchange. |
| No mandatory push/cloud backup | pass | Android/iOS source shells keep push/cloud backup out of scope. |
| Pairwise invite/verification | pass for desktop beta | Mobile remains source shell only. |
| Message-content E2EE | pass only for supported local/manual envelope scope | Broad production E2EE claim remains false. |
| Passphrase-first local encrypted storage | pass for supported local scope | Production key management remains false. |
| Redacted diagnostics/support | pass for current beta/source shells | Raw logs/private payloads remain forbidden. |
| Explicit network/user action | pass for current beta/source shells | Automatic network launch remains false. |
| High-risk onion separation | pass as fail-closed advanced path | No external onion delivery success claim. |
| External review/audit | hold | Review packet exists; review/audit completion remains false. |
| Field evidence | hold for stable/production | Existing lower-class beta publication selected. |
| Signed/notarized stable artifact | hold | Lower release class selected. |
| Windows public artifact | hold | Local build candidate only. |
| Android public artifact | hold | Source shell only. |
| iOS public artifact | hold | Source shell only. |

## Final Release-Class Decision

The next release class is `signed-public-beta-or-rc` if a future explicit
release task provides appropriate artifacts. Until then, the existing
`v0.1.0-beta-onion-unsigned` prerelease remains the current public artifact.

Public wording must keep:

- `unsigned experimental public beta`,
- `not audited`,
- `not production-ready`,
- `sensitive communication prohibited`.

## Current Closure Flags

- rb_13_cross_platform_target_standard_final_closure_reviewed=true
- target_standard_matrix_available=true
- platform_artifact_matrix_available=true
- platform_public_claims_aligned=true
- next_release_class=signed-public-beta-or-rc
- macos_current_public_artifact_class=unsigned-experimental-public-beta
- windows_current_public_artifact_class=none-local-build-candidate-only
- android_current_public_artifact_class=none-source-shell-only
- ios_current_public_artifact_class=none-source-shell-only
- whole_target_standard_100_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- security_ready_claimed=false
- sensitive_communication_allowed=false
- reliable_external_delivery_claim_allowed=false
- briar_cwtch_equivalent_claim_allowed=false
- censorship_resistant_claim_allowed=false
- stable_release_allowed=false
- lower_release_class_claim_boundary_ready=true
- remaining_limitations_public_safe=true
- plan_active_queue_complete=true

# Transport Experiment Runbook

This runbook is the public-safe boundary for local manual Tor/Arti bootstrap experiments.

It is not a production transport guide, not a messaging runbook, and not a secure-messenger readiness claim. The only permitted network-capable experiment today is the existing `arti-manual-bootstrap` manual bootstrap smoke path. Onion hosting, descriptor publication, stream I/O, envelope I/O, send/receive, offline mailbox behavior, and usable messaging remain out of scope.

## Preconditions

Before using `--execute-network`, all of the following must be true:

- The run is local and manual. CI, release builds, default verification, and unattended automation must not execute network bootstrap.
- The binary is built with `--features arti-manual-bootstrap` and without `dev-insecure`.
- The command uses the existing manual bootstrap or manual lifecycle bootstrap command only.
- State/cache directories are app-private, absolute, and not shared Arti defaults.
- `CARGO_TARGET_DIR` points to an isolated temporary target directory for this experiment.
- The app data root or explicit Arti state/cache root points to an isolated temporary directory.
- The operator accepts that this may touch the network and may reveal local network timing to Tor infrastructure.
- No raw Arti logs, bridge lines, endpoint names, profile names, contact identifiers, descriptors, paths, plaintext, or key material are copied into public logs or docs.

## Allowed Commands

One-shot bootstrap-and-drop smoke path:

```bash
CARGO_TARGET_DIR="$(mktemp -d)" \
cargo run -q --features arti-manual-bootstrap -- \
  transport bootstrap \
  --profile manual-bootstrap-probe \
  --app-data-root "$(mktemp -d)" \
  --execute-network
```

Persistent lifecycle smoke path:

```bash
CARGO_TARGET_DIR="$(mktemp -d)" \
cargo run -q --features arti-manual-bootstrap -- \
  transport lifecycle bootstrap \
  --profile manual-bootstrap-probe \
  --app-data-root "$(mktemp -d)" \
  --execute-network
```

The preferred form is `--profile <name> --app-data-root <absolute-app-private-root>` because the profile-scoped resolver controls the Arti state/cache layout. The direct `--state-dir/--cache-dir` form remains a manual escape hatch only.

## Expected Output Boundary

Output may include:

- Redacted runtime event categories.
- `bootstrap_status=...` classification.
- Bootstrap timeout seconds.
- Lifecycle state such as `Unbootstrapped` or `Bootstrapped`.
- `client_owned=true/false`.
- `usable_transport=false`.

Output must not include:

- Raw Arti error details.
- Local state/cache paths.
- Profile names or contact identifiers.
- Onion endpoints, descriptors, bridge lines, or rendezvous material.
- Plaintext messages or key material.

## Cleanup And Rollback Rule

After every manual network experiment:

1. Delete the temporary `CARGO_TARGET_DIR`.
2. Delete the temporary app data root or explicit Arti state/cache directories.
3. Do not commit generated Arti state/cache files, logs, descriptors, lock files, or temporary bootstrap output.
4. Do not paste raw bootstrap logs into README, SECURITY, issue text, PR text, or public docs.
5. If any command prints raw paths, endpoints, bridge lines, descriptors, profile/contact ids, plaintext, or key material, treat the experiment as failed and fix redaction before running it again.
6. If any command implies usable transport, onion hosting, stream I/O, envelope I/O, send/receive, or secure messenger readiness, revert that wording before continuing.

The rollback rule is deletion of local experiment artifacts plus preservation of fail-closed defaults. It is not rollback protection for production message state.

## Status Classes

The public status classes are intentionally coarse:

- `network-disabled`: the safe/default path did not attempt network bootstrap.
- `censorship-or-bridge-required`: bootstrap policy classified the failure as a bridge/censorship requirement.
- `timeout-or-transient-network-failure`: bootstrap timed out or failed without exposing raw network detail.
- `cancelled`: bootstrap was cancelled before completion.
- `failed`: a redacted fallback failure class.

These status classes are reporting boundaries only. They do not mean transport is usable.

## C100-5 Evidence Boundary

C100-5 is closed for active-queue progress by explicit owner policy waiver
only. The waiver does not add external evidence, does not allow usable onion
messaging claims, and does not relax the fail-closed experiment boundary.

Repeated external two-machine field evidence, accepted redacted reports, and
external review remain required before any reliable external onion delivery,
repeated external onion evidence, production transport, censorship-resistant,
secure messenger, production-ready, audited, or sensitive-use wording can be
considered.

## Hard Stops

Stop the experiment and return to fail-closed defaults if any of these become necessary:

- Onion service hosting.
- Descriptor publication.
- Stream accept/dial/read/write.
- Envelope send/receive.
- Offline mailbox, async delivery, push notification, group chat, file transfer, or multi-device.
- Direct P2P, WebRTC, STUN, TURN, ICE, or libp2p direct dialing.
- Production storage unlock/key management.
- Claims of production E2EE, production anonymity, production transport readiness, or secure messenger release.

## Current Gate Flags

- c100_5_onion_evidence_blocker_closed=true
- advanced_onion_policy_waiver_authorized=true
- advanced_onion_waiver_scope=active-queue-unblock-only
- advanced_onion_path=explicit-user-triggered-fail-closed-onion-only
- advanced_onion_direct_fallback=false
- advanced_onion_send_receive_available=false
- advanced_onion_usable_messaging_claim_allowed=false
- advanced_onion_field_evidence_required_for_claims=true
- advanced_onion_repeated_external_evidence_required_for_claims=true
- automatic_network_on_launch_allowed=false
- external_two_machine_delivery_verified=false
- external_delivery_success_claim_allowed=false
- reliable_external_delivery_claim_allowed=false
- repeated_external_onion_evidence_claim_allowed=false
- production_transport_ready=false
- censorship_resistant_claim_allowed=false
- secure_messenger_claim_allowed=false
- production_ready_claim_allowed=false
- audited_claim_allowed=false
- sensitive_communication_allowed=false

# Independent Review Packet

Another Dimension Chat is not a secure messenger release today.

This packet gives an independent reviewer a public-safe starting point. It is
not an external review result and does not imply approval.

## Review Scope

Review the unsigned experimental public beta boundary:

- public release artifact contents
- unsigned macOS install guidance
- checksum/provenance/manual update integrity model
- public diagnostics redaction boundary
- passphrase-first local unlock/lock boundary
- durable local session lifecycle boundary
- local data lifecycle and migration boundary
- onion/Tor attempt non-readiness and external-evidence gap
- public non-claims in README and SECURITY

## Public Claims Allowed Today

- unsigned experimental public beta
- local desktop beta candidate
- manual GitHub Release download
- user-verified SHA-256 checksum
- public diagnostics export is redacted by design
- no automatic network/onion work on app launch
- passphrase-first local unlock path exists
- local data lifecycle controls exist
- dependency lockfile hash baseline exists

## Public Claims Not Allowed Today

- secure messenger
- production-ready
- safe for sensitive communication
- audited
- notarized or signed release
- reproducible build
- auto-update integrity
- dependency audit or SBOM completion
- reliable real-network onion delivery
- independently verified external two-machine onion delivery
- audited bridge/censorship support
- rollback prevention
- secure deletion from storage media

## Evidence Map

- `README.md`: project status, public release files, current non-claims.
- `SECURITY.md`: public security policy, non-claims, unsigned beta boundary.
- `reference/BETA_RELEASE_CHECKLIST.md`: release upload checklist.
- `reference/UNSIGNED_PUBLIC_BETA_INSTALL.md`: user install and checksum steps.
- `reference/UNSIGNED_PUBLIC_BETA_RELEASE_NOTES.md`: release notes template.
- `reference/UPDATE_INTEGRITY.md`: manual update integrity boundary.
- `reference/SUPPLY_CHAIN_BASELINE.md`: dependency lockfile hash baseline.
- `reference/PRIVACY_MODEL_COMPARISON.md`: LINDDUN/Briar/Cwtch-style target
  comparison and current public beta gap map.
- `reference/PUBLIC_THREAT_MODEL.md`: public threat model and non-goals.
- `reference/COMPONENT_BOUNDARIES.md`: component replacement and readiness map.
- `docs/FINAL_ACCEPTANCE_CHECKLIST.md`: private final gate checklist; do not publish.

## Suggested Public-Safe Review Commands

These commands avoid launching the app, starting network/onion work, or reading
private planning notes:

```bash
bash -n scripts/prepare_unsigned_public_beta_release.sh
shasum -a 256 Cargo.lock apps/desktop-tauri/src-tauri/Cargo.lock apps/desktop-tauri/package-lock.json
rg -n "secure messenger|production-ready|sensitive communication|not audited|not notarized|auto-update|rollback prevention|secure deletion" README.md SECURITY.md reference apps/desktop-tauri/README.md
git diff --check
```

If reviewing a generated release upload set, run from that folder:

```bash
shasum -a 256 -c another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256
```

## Known Review Gaps

- No external security review has been completed.
- External two-machine onion peer reports have not been received.
- No SBOM is published.
- No reproducible-build proof exists.
- No signing, notarization, or auto-update channel exists.
- Final security-ready claim gate has not passed.

## Reviewer Output Requested

The reviewer should report:

- any public wording that overclaims security readiness
- any release artifact that omits checksum/provenance/update-integrity evidence
- any diagnostic/reporting path that could expose sensitive material
- any command path that starts network/onion work without explicit user action
- any missing non-claim around audit, production readiness, onion reliability,
  rollback prevention, secure deletion, or supply-chain review

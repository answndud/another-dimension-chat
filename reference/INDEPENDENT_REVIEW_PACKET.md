# Independent Review Packet

Another Dimension Chat is not a secure messenger release today.

This packet gives an independent reviewer a public-safe starting point. It is
not an external review result and does not imply approval.

## Review Gap Boundary

The unsigned public beta release packet must publish this gap explicitly:

- `independent_review_complete=false`
- `public_review_gap_published=true`
- `reviewer_signoff_claimed=false`

These fields mean the project has prepared review inputs only. They do not mean
the project has passed review.

## Review Scope

Review the unsigned experimental public beta boundary:

- public release artifact contents
- unsigned macOS install guidance
- checksum/provenance/manual update integrity model
- public diagnostics redaction boundary
- crash/log redaction and no-upload/no-telemetry boundary
- public issue and security intake redaction boundary
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
- public diagnostics are local-copy only and do not provide crash upload,
  telemetry, or raw log export
- public support intake uses redacted diagnostics or minimal contact requests
  instead of raw logs, payloads, endpoints, paths, keys, or private data
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
- `reference/UNSIGNED_PUBLIC_BETA_GITHUB_RELEASE_BODY.md`: copy-ready GitHub
  Release body with required non-claims.
- `reference/UPDATE_INTEGRITY.md`: manual update integrity boundary.
- `reference/SUPPLY_CHAIN_BASELINE.md`: dependency lockfile hash baseline.
- `reference/PRIVACY_MODEL_COMPARISON.md`: LINDDUN/Briar/Cwtch-style target
  comparison and current public beta gap map.
- `reference/PUBLIC_THREAT_MODEL.md`: public threat model and non-goals.
- `reference/PUBLIC_INTAKE_POLICY.md`: public issue, release comment, and
  security contact redaction rules.
- `reference/COMPONENT_BOUNDARIES.md`: component replacement and readiness map.
- Generated release provenance: records the public threat model, independent
  review packet, incomplete-review flag, published-review-gap flag, and
  no-reviewer-signoff flag.
- Generated release provenance and manifest: record the public diagnostics
  boundary, crash-upload-disabled flag, telemetry-disabled flag, raw-log-export
  disabled flag, and forbidden diagnostics field categories.
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
- The public release packet publishes the review gap but does not close it.
- External two-machine onion peer reports have not been received.
- No SBOM is published.
- No reproducible-build proof exists.
- No signing, notarization, or auto-update channel exists.
- Final security-ready claim gate has not passed.

## Reviewer Output Requested

The reviewer should report:

- any public wording that overclaims security readiness
- any GitHub Release body wording that omits required non-claims
- any release artifact that omits checksum/provenance/update-integrity evidence
- any diagnostic/reporting path that could expose sensitive material
- any crash/log path that uploads, copies, or publishes raw logs, paths,
  endpoints, passphrases, private keys, key material, or private planning notes
- any issue template or support path that asks users to paste raw logs, payloads,
  endpoints, paths, passphrases, private keys, key material, crash dumps, or
  screenshots of private room data
- any command path that starts network/onion work without explicit user action
- any missing non-claim around audit, production readiness, onion reliability,
  rollback prevention, secure deletion, or supply-chain review

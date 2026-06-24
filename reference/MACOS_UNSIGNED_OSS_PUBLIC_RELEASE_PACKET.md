# macOS Unsigned OSS Public Release Packet

Status: source-ready for the v0.1 unsigned OSS public beta packet.

The public macOS release class is `unsigned OSS public beta`. The app is
not signed, not notarized, not audited, not production-ready, and sensitive
communication prohibited. Apple Developer Program, Developer ID, notarization,
App Store, and TestFlight credentials are not used or required for this release
class.

Allowed short public copy:

> Accountless 1:1 private messenger beta with pairwise invites, safety
> comparison, manual encrypted envelope exchange, local data ownership, and an
> unsigned macOS Apple Silicon DMG distributed from GitHub Releases.

Required release packet files:

- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.sha256`
- `another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg.provenance.json`
- `INSTALL_UNSIGNED_MACOS.md`
- `RELEASE_NOTES.md`
- `GITHUB_RELEASE_BODY.md`
- `UPDATE_INTEGRITY.md`
- `SUPPLY_CHAIN_BASELINE.md`
- `DEPENDENCY_INVENTORY.md`
- `PUBLIC_THREAT_MODEL.md`
- `PRIVACY_MODEL_COMPARISON.md`
- `INDEPENDENT_REVIEW_PACKET.md`
- `PUBLIC_INTAKE_POLICY.md`
- `REPOSITORY_GOVERNANCE.md`
- `COMPONENT_BOUNDARIES.md`
- `DEPENDENCY_LOCKFILES.sha256`
- `OPERATOR_FINAL_HANDOFF.md`
- `MANIFEST.md`

Install boundary:

- Gatekeeper warning expected.
- Verify the same-release `.sha256` before opening.
- Use the normal macOS Privacy & Security manual allow path only after checksum
  verification.
- Do not disable Gatekeeper globally.
- Do not use terminal quarantine-removal commands as an install step.

Release authority:

- The DMG, checksum, provenance, manifest, release notes, install guide, update
  guide, and release body must come from the same GitHub Release asset set.
- Branch files, source archives, copied checksums, signing results,
  notarization results, app-store approval, and auto-update manifests are not
  release or update authority for this v0.1 class.
- Future upload or release-body edit is an explicit owner action only; source
  gates must not upload or edit the GitHub Release by default. The current
  GitHub Release asset set matches this packet.

Artifact identity gate:

- `artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13#beta-onion#e724bd39#v0.1.0-beta-onion-unsigned#macos-aarch64`
- `artifact_identity_fields=artifact#artifact_sha256#build_channel#build_commit#release_tag#platform`
- `current-head unsigned public beta transition`
- The artifact filename, SHA-256, build channel, build commit, release tag, and
  platform are read from the same provenance file when the generated packet is
  present.
- The provenance `build_commit` matches the current repository HEAD for this
  regenerated packet, so the source gates must emit
  `artifact_current_head_aligned=true`,
  `public_artifact_stale=false`, `public_artifact_state=current`,
  `stale_public_artifact_promoted_to_current=false`,
  `current_head_artifact_transition_gate_ready=true`,
  `release_upload_performed=false`, and
  `next_owner_action=run-clean-macos-fresh-install-with-disposable-profile`.
- The current GitHub Release asset set matches this packet. The next owner
  action is `run-clean-macos-fresh-install-with-disposable-profile`; after an
  accepted clean-machine pass, the next useful evidence is representative
  redacted usability reports, not a production or High-Risk-ready claim.

Forbidden public claims:

- production-ready
- audited
- secure messenger
- safe for sensitive communication
- high-risk ready
- signed or notarized macOS app
- Signal/Briar/Cwtch-equivalent privacy or security
- reliable external onion delivery
- compromised-device safety
- coercion safety
- full global traffic-correlation defense

Historical packaging gate:

- `scripts/macos_unsigned_public_release_packet_once.sh`

This packaging gate is retained here as release-task reference material. It is
not part of the current maintained development baseline. For current local
verification, use `scripts/verify_all.sh` and `scripts/verify_full.sh`.

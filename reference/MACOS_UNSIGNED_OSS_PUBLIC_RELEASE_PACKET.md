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
- Upload is an explicit owner action only; source gates must not upload or edit
  the GitHub Release by default.

Artifact identity gate:

- `artifact_identity=another-dimension-chat-0.1.0-beta-onion-macos-aarch64-unsigned.dmg#7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a#beta-onion#e8954df9#v0.1.0-beta-onion-unsigned#macos-aarch64`
- `artifact_identity_fields=artifact#artifact_sha256#build_channel#build_commit#release_tag#platform`
- The artifact filename, SHA-256, build channel, build commit, release tag, and
  platform are read from the same provenance file when the generated packet is
  present.
- If the provenance `build_commit` differs from the current repository HEAD,
  the source gates must emit `artifact_current_head_aligned=false`,
  `public_artifact_stale=true`, `public_artifact_state=stale`, and
  `next_owner_action=rebuild-or-republish-unsigned-public-beta-packet`.
- A stale public artifact is a held release packet, not current app evidence.
  It must not be promoted to latest source evidence without rebuilding or
  republishing the unsigned public beta packet.
- For a current-head unsigned public beta transition, the provenance
  `build_commit` must match the current repository HEAD and the source gates
  must emit `artifact_current_head_aligned=true`,
  `public_artifact_stale=false`, `public_artifact_state=current`,
  `stale_public_artifact_promoted_to_current=false`,
  `current_head_artifact_transition_gate_ready=true`,
  `release_upload_performed=false`, and
  `next_owner_action=upload-current-unsigned-public-beta-packet`.
- `release_upload_performed=false` means the generated current-head packet is
  source-ready only. The GitHub Release asset mutation remains an explicit
  owner action and must use the generated `MANIFEST.md` allowlist.

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

Machine gate:

- `scripts/macos_unsigned_public_release_packet_once.sh`

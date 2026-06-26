# Cross-Platform Unsigned Public Beta Packet

Status: source-ready for cross-platform public beta/RC copy and packet
coordination. This is not a release upload authorization. The packet below is
historical reference material; the current maintained development baseline is
source-build-first.

The historical public packet is asymmetric by design:

- macOS Apple Silicon: unsigned OSS public beta DMG, checksum, provenance,
  install guide, release notes, update-integrity note, and GitHub Release body
  are defined by the historical unsigned public beta packet workflow. That
  packaging flow is not part of the current maintained development baseline.
- Windows: public artifact candidate path is source-defined for an NSIS `.exe`
  installer, but the public artifact claim remains false until a real Windows
  machine result binds to a valid artifact manifest/checksum/provenance set and
  a later release gate authorizes publication.

Both platforms share the same product copy boundary:

- accountless 1:1 private messenger beta,
- pairwise invite,
- mandatory safety comparison,
- manual encrypted envelope exchange,
- local data ownership,
- redacted support diagnostics,
- no phone number, email, global account, searchable username, central contact
  discovery, central message server, push notification, cloud backup, telemetry,
  crash upload, or auto-update channel in the v0.1 default scope.

Release authority:

- Use only assets attached to the same GitHub Release for a published artifact.
- Do not use branch files, source archives, copied checksums, signing results,
  notarization results, store approval, or auto-update manifests as release or
  update authority for the v0.1 public beta class.
- Generated `apps/desktop-tauri/public-release/` and
  `apps/desktop-tauri/beta-artifacts/` outputs are ignored and must not be
  committed.
- Upload, release-body edit, package publication, and artifact announcement are
  explicit owner actions only.

Allowed short public copy:

> Accountless 1:1 private messenger public beta with pairwise invites, safety
> comparison, manual encrypted envelope exchange, local data ownership, and
> redacted diagnostics. Current public artifact: unsigned macOS Apple Silicon
> DMG from GitHub Releases. Windows is source-gated as a public artifact
> candidate and is not yet published.

Community launch copy source:

- `reference/PUBLIC_COMMUNITY_LAUNCH_COPY.md`
- historical validator: `scripts/public_community_launch_copy_once.sh`

Required disclaimer:

> Not audited, not production-ready, not for sensitive communication, not High-Risk-ready, and not a Signal/Briar/Cwtch-equivalent privacy or security claim.

Platform claim matrix:

| Platform | Public artifact status | Claim boundary |
| --- | --- | --- |
| macOS Apple Silicon | unsigned OSS public beta DMG | checksum/provenance/manual Gatekeeper allow after verification |
| Windows | source-gated public artifact candidate | no public artifact, installer, signing, upload, or production claim |
| Android | source shell candidate only | no APK/AAB/public artifact claim |
| iOS | source shell candidate only | no IPA/TestFlight/App Store/public artifact claim |

Windows runtime evidence gate:

```text
real_windows_runtime_result_present=false
windows_runtime_result_packet_required_for_public_artifact=true
windows_manifest_checksum_provenance_separate_from_runtime_result=true
windows_public_artifact_claim_allowed=false
windows_installer_claim_allowed=false
windows_upload_claim_allowed=false
```

High-Risk Mode remains a defined target. Public copy may describe the target
and the not-protected boundary, but public High-Risk readiness remains false.
High-Risk runtime evidence validator is a redacted evidence-format gate; it does
not open a public High-Risk or reliable delivery claim:

```text
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
```

Not protected:

- compromised endpoint,
- direct coercion,
- full global traffic correlation.

Historical packaging gate:

- `scripts/cross_platform_public_beta_packet_once.sh`

This gate remains as release-task reference material only. It is not part of
the current maintained development baseline. Use `scripts/verify_all.sh` and
`scripts/verify_full.sh` for current local verification.

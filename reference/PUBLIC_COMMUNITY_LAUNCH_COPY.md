# Public Community Launch Copy

Status: source-ready public copy for GitHub, SNS, community posts, and
portfolio context. This is not a release upload authorization and not a stronger
security claim than the unsigned public beta packet.

Allowed short copy:

> Another Dimension Chat is an accountless 1:1 private messenger unsigned public
> beta for macOS Apple Silicon. It uses pairwise invites, mandatory safety
> comparison, manual encrypted envelope exchange, local data ownership, and
> redacted diagnostics. Current public artifact: unsigned macOS DMG from GitHub
> Releases. Windows is source-gated only and not yet published.

Required disclaimer:

> Not audited, not production-ready, sensitive communication prohibited, not High-Risk-ready, and not a Signal/Briar/Cwtch-equivalent privacy or security claim.

Machine-readable non-claims:

```text
release_class=unsigned-oss-public-beta
macos_unsigned_public_beta_ready=true
windows_public_artifact_ready=false
windows_public_artifact_claim_allowed=false
windows_installer_claim_allowed=false
windows_upload_claim_allowed=false
production_ready_claim_allowed=false
audited_claim_allowed=false
sensitive_use_claim_allowed=false
high_risk_public_claim_allowed=false
high_risk_ready_claim_allowed=false
external_delivery_claim=false
security_ready_claim=false
```

Forbidden community claims:

- secure production messenger
- audited security
- production-ready E2EE
- sensitive communication safety
- high-risk-ready
- Signal/Briar/Cwtch-equivalent privacy or security
- reliable external onion delivery
- public Windows artifact
- Windows installer available
- upload authorization complete
- automatic update channel

Posting boundary:

- Link users to the GitHub Release assets and same-release checksum.
- Do not ask users to disable Gatekeeper globally.
- Do not request raw logs, screenshots of private room data, invite codes,
  endpoints, payloads, message text, local paths, passphrases, private keys, or
  key material in public replies.

Machine gate:

- `scripts/public_community_launch_copy_once.sh`

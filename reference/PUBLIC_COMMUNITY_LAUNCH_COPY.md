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

README entry copy:

> A no-central-trusted-server 1:1 messenger beta for macOS Apple Silicon:
> verify the same-release checksum, allow the unsigned app manually in
> Gatekeeper, create or join a pairwise invite room, compare safety material,
> exchange manual encrypted envelopes, and copy only redacted diagnostics for
> support.

Launch article:

- [blog/00-public-beta-launch.md](../blog/00-public-beta-launch.md)

Long copy:

> Another Dimension Chat is a no-central-trusted-server 1:1 private messenger
> beta for macOS Apple Silicon. The v0.1 product model excludes phone numbers,
> email identity, global accounts, searchable usernames, centralized contact
> discovery, centralized message servers, push notifications, and cloud backup.
> Users can test pairwise invite rooms, mandatory safety comparison, local
> encrypted profile/session/message stores, manual encrypted envelope
> export/import, explicit retry/cancel/recovery/delete actions, and redacted
> diagnostics. The default transport is manual envelope exchange; onion/Tor
> paths are explicit advanced attempts and not an external delivery claim.

Korean short copy:

> Another Dimension Chat은 중앙에서 신뢰해야 하는 계정/연락처 검색/메시지 서버 없이
> pairwise invite, safety material 비교, manual encrypted envelope exchange,
> local data ownership, redacted diagnostics를 실험하는 macOS Apple Silicon용
> unsigned public beta입니다. GitHub Release에서 DMG와 `.sha256`을 함께 받고,
> checksum이 일치할 때만 macOS Privacy & Security에서 수동으로 허용하세요.

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

Historical copy gate:

- `scripts/public_community_launch_copy_once.sh`

This validator is retained as release-task reference material. It is not part
of the current maintained development baseline.

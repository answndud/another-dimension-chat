# macOS Public Beta Final Source Report

Status: already public macOS unsigned beta.

This is still not production-ready. It is an unsigned experimental public beta,
not audited, and sensitive communication prohibited. Do not use it for real
communication.

## What Is Public Now

- GitHub Release tag: `v0.1.0-beta-onion-unsigned`
- Public app artifact: macOS Apple Silicon unsigned DMG
- Expected DMG SHA-256:
  `7445c281e461571aad47a8d636f4e98914d9d51746329876bdfe3c6b9c49f50a`
- Release authority: files attached to the GitHub Release, not branch source
  files or GitHub source archives
- Practical desktop path: local profile unlock/create, invite room,
  verification surface, manual encrypted envelope export/import, reply,
  retry/cancel, local deletion, and redacted diagnostics copy

## Final Source Acceptance

The source tree now has public-facing material for:

- macOS public beta landing and checksum path
- unsigned install and Gatekeeper recovery
- release body and release-page update hold gate
- first-run warning inventory
- manual local 1:1 envelope flow
- error and recovery copy
- local data lifecycle boundary
- public-safe screenshot checklist
- public issue and support intake
- CI/source verification boundary
- dependency and supply-chain baseline boundary
- release artifact integrity recheck notes
- fresh install rehearsal checklist

This source acceptance does not rebuild the DMG, upload release assets, edit the
GitHub Release, notarize, sign, audit, create an auto-update channel, or claim
external onion delivery success.

## Known Release Drift

The public GitHub Release exists, and the local ignored DMG checksum matches the
expected SHA-256. The live release asset set is known to differ from the current
source release body expectation: `COMPONENT_BOUNDARIES.md` and
`OPERATOR_FINAL_HANDOFF.md` are expected by source/local staging but missing
from the live release assets observed in the read-only recheck.

Because of that drift, a body-only release page edit is held unless the proposed
body matches the actual live assets or a separately approved asset upload fixes
the live asset set. No release upload, asset deletion, release body edit, DMG
rebuild, or checksum change is authorized by this report.

## Public User Message

Use this wording for the current public status:

Another Dimension Chat has an already public macOS unsigned beta for Apple
Silicon users who want to inspect and try the local desktop flow. It is an
unsigned experimental public beta, not audited, not production-ready, and
sensitive communication prohibited. Users must verify the same-release SHA-256
before opening the DMG and use the normal macOS Privacy & Security manual allow
path if Gatekeeper blocks the app.

## Final Blockers

- Live release page/body/assets need an explicit release edit or upload request
  before they can be brought back into source alignment.
- No signed or notarized macOS artifact exists.
- No public Windows artifact exists.
- Android and iOS remain future shared-core shell work, not this beta.
- External two-machine peer evidence and external audit remain outside the v0.1
  public claim.

## Next Work Choices

Pick one next axis:

- release page edit after confirming the body text matches live assets
- release asset upload only after explicit packaging/upload request
- screenshot publication using the public-safe screenshot checklist
- Windows parity and local runtime smoke on a real Windows machine
- Android scope planning after desktop/macOS public beta wrap-up

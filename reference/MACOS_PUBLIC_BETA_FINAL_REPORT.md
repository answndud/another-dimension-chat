# macOS Public Beta Final Source Report

Status: already public macOS unsigned beta; source-side macOS unsigned public
beta closure is 100%.

This is still not production-ready. It is an unsigned experimental public beta,
not audited, and sensitive communication prohibited. Do not use it for real
communication.

## What Is Public Now

- GitHub Release tag: `v0.1.0-beta-onion-unsigned`
- Public app artifact: macOS Apple Silicon unsigned DMG
- Expected DMG SHA-256:
  `ddd48c1316e5eb86ca992d479270d30a151e59839e899949a1055980c4c6bf13`
- Release authority: files attached to the GitHub Release, not branch source
  files or GitHub source archives
- Practical desktop path: local profile unlock/create, invite room,
  verification surface, manual encrypted envelope export/import, reply,
  retry/cancel, local deletion, and redacted diagnostics copy
- Reviewed public-safe screenshots:
  `reference/screenshots/README.md`
- Fresh install rehearsal result:
  `reference/MACOS_FRESH_INSTALL_REHEARSAL_RESULT.md`
- Public support triage:
  `reference/PUBLIC_SUPPORT_TRIAGE.md`

## Final Source Acceptance

The source tree now has public-facing material for:

- macOS public beta landing and checksum path
- unsigned install and Gatekeeper recovery
- release body and release-page update hold gate
- first-run warning inventory
- manual local 1:1 envelope flow
- error and recovery copy
- local data lifecycle boundary
- public-safe screenshot checklist and reviewed screenshot set
- public issue, support intake, triage matrix, and maintainer response snippets
- CI/source verification boundary
- dependency and supply-chain baseline boundary
- release artifact integrity recheck notes
- fresh install rehearsal checklist and public-safe result record

This source acceptance does not rebuild the DMG, upload release assets, edit the
GitHub Release, notarize, sign, audit, create an auto-update channel, or claim
external onion delivery success.

## Known Release Drift

The public GitHub Release exists, and the local ignored DMG checksum matches the
expected SHA-256. The live release body Download list matches the current live
asset set, so there is no live release body edit needed for asset consistency.

The source/local staging upload set still has two extra source-side documents,
`COMPONENT_BOUNDARIES.md` and `OPERATOR_FINAL_HANDOFF.md`, that are not attached
to the live release. Those files remain source/staging evidence only unless a
separately approved release upload adds them later. No release upload, asset
deletion, release body edit, DMG rebuild, or checksum change is authorized by
this report.

## Public User Message

Use this wording for the current public status:

Another Dimension Chat has an already public macOS unsigned beta for Apple
Silicon users who want to inspect and try the local desktop flow. It is an
unsigned experimental public beta, not audited, not production-ready, and
sensitive communication prohibited. Users must verify the same-release SHA-256
before opening the DMG and use the normal macOS Privacy & Security manual allow
path if Gatekeeper blocks the app.

## macOS Unsigned Public Beta Closure

The macOS unsigned public beta source/maintainer readiness target is closed at
100% for the current constrained scope. Users still download the already public
unsigned Apple Silicon DMG from GitHub Releases, verify the same-release
checksum, use the normal macOS manual allow path if needed, and treat the app as
an unsigned experimental public beta.

The fresh-install result has a documented GUI follow-through hold for manual
first-run/profile/invite/manual-flow/delete/diagnostics rehearsal. That hold is
now routed through public support triage rather than a release asset change. It
does not authorize production claims or sensitive communication.

## Clean Install Evidence Binding

```text
clean_macos_fresh_install_result=hold
clean_install_artifact_current=true
clean_machine_result_accepted=false
local_fixture_promoted_to_clean_install_pass=false
release_download_source=github-release
same_release_checksum_result=pass
next_owner_action=run-clean-macos-fresh-install-with-disposable-profile
```

The current clean-install record is bound to the rebuilt GitHub Release asset
identity and same-release checksum result, but it is not a clean-machine pass.
Only a disposable clean macOS GUI run can change the result out of `hold`.

No live release upload, DMG rebuild, checksum change, release asset deletion, or
release body edit is performed by this closure.

## Remaining Non-Beta Product Blockers

- No signed or notarized macOS artifact exists.
- No public Windows artifact exists.
- Android and iOS remain future shared-core shell work, not this beta.
- External two-machine peer evidence and external audit remain outside the v0.1
  public claim.
- Production E2EE readiness, production key management, reliable default
  transport, external review, field reliability evidence, and operational
  incident process remain unfinished.

## Next Work

Proceed to the production-readiness track, starting with
`Phase OPS-1 - Production Readiness Definition And Claim Gate`. Do not remove
the unsigned experimental public beta, sensitive communication prohibited, not
audited, or not production-ready public wording until the production gates are
closed.

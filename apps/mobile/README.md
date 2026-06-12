# Mobile Wrapper Skeleton Boundary

This directory is a documentation-only boundary for future Android and iOS
wrapper candidates.

It is not a buildable mobile app, not a mobile public beta artifact, and not an
Android or iOS readiness claim. Mobile clients are not part of the current
unsigned experimental public beta.

The mobile direction remains:

- Android: thin Kotlin shell over UniFFI or another narrow FFI boundary into the
  shared Rust core.
- iOS: thin Swift shell over UniFFI or another narrow FFI boundary into the
  shared Rust core after the Android candidate preserves that boundary.
- Rust core owns protocol, pairing, storage policy, transport policy, redacted
  status models, and non-claims.
- Mobile wrappers may expose redacted status-only surfaces and explicit
  user-triggered actions only.

This skeleton must not add phone numbers, email, global accounts, searchable
usernames, central contact discovery, central message servers, push notification
delivery, cloud backup, auto-update, store trust, mobile review trust, wrapper
specific protocol/storage/transport semantics, external onion delivery success
claims, or security-ready claims.

Required public copy remains: unsigned experimental public beta, sensitive
communication prohibited, not audited, not production-ready, redacted status
only, manual update verification required, and external onion delivery not
claimed.

## Mobile Development Scope Switch Criteria

This section is the scope-switch record for future mobile development. It is
documentation-only and does not create Android source, iOS source, wrapper
runtime code, generated bindings, Gradle files, Xcode files, Kotlin files, Swift
files, or mobile artifacts.

Mobile implementation remains blocked until all criteria below are recorded:

- Owner authorization status: explicit owner authorization required and not
  granted in this documentation-only phase.
- Target platform order: Android shell candidate first; iOS shell candidate only
  after the Android candidate preserves the shared-core boundary.
- Shared-core API freeze prerequisite: Phase HO must close the mobile-callable
  API groups, redacted DTO vocabulary, error taxonomy, serialization contract,
  local data lifecycle commands, and diagnostics redaction contract before any
  wrapper implementation starts.
- Wrapper responsibility limit: mobile wrappers may resolve app-private storage,
  backup-exclusion evidence, local permission explanations, redacted status
  display, and explicit user-triggered actions only.
- Core ownership lock: Rust core continues to own protocol, pairing, message
  envelope semantics, replay policy, storage policy, transport policy, lifecycle
  rules, diagnostics redaction rules, and public non-claims.
- Non-claim copy lock: unsigned experimental public beta, sensitive
  communication prohibited, not audited, not production-ready, external onion
  delivery not claimed, security-ready not claimed, and mobile readiness not
  claimed.
- Excluded dependencies: no phone number account, email account, global account,
  searchable username, central contact discovery, central message server, push
  notification delivery, cloud backup, auto-update trust, store trust, or
  wrapper-specific protocol/storage/transport semantics.
- Kickoff blocker: no mobile source scaffold, no Android build scaffold, no iOS
  build scaffold, no runtime messaging scaffold, no store distribution task, and
  no external delivery evidence task are opened by this phase.

This scope switch record is not approval to implement mobile. It records the
conditions that must be true before a later explicit implementation phase can
create mobile source.

## Status Screen Copy Boundary

Future mobile status screens are documentation-only candidates until a separate
wrapper UI implementation phase exists.

Status screens may show status only, redacted status only, not connected,
manual action required, sensitive communication prohibited, not audited,
not production-ready, manual update verification required, and external onion
delivery not claimed.

Status screen labels may project only the status DTO vocabulary: platform,
profile lock state, runtime command surface, mobile command surface, local data
lifecycle state, backup-exclusion state, install/update integrity state,
diagnostics redaction state, and public non-claims.

Status screens must not show send now or receive in background.
Status screens must not claim push delivery enabled, connected to peer, or
onion delivery verified.
Status screens must not claim secure messenger, safe for sensitive
communication, audited, production-ready, store approved, cloud backup enabled,
or security-ready claims.

## Install/Update Screen Copy Boundary

Future mobile install/update screens are documentation-only candidates until a
separate wrapper UI implementation phase exists.

Install/update screens may show manual update verification required.
Install/update screens may show same GitHub Release artifact.
Install/update screens may show same release checksum.
Install/update screens may show public provenance.
Install/update screens may show release manifest.
Install/update screens may show release notes.
Install/update screens may show dependency evidence.
Install/update screens may show not audited and not production-ready.
Install/update screens may show store trust not claimed.

Install/update screens must not show auto-update available.
Install/update screens must not show automatic update.
Install/update screens must not show update installed automatically.
Install/update screens must not show Play Store verified.
Install/update screens must not show App Store verified.
Install/update screens must not show TestFlight verified.
Install/update screens must not show store approved security.
Install/update screens must not show mobile review security.
Install/update screens must not show platform signing security.
Install/update screens must not show notarization security.
Install/update screens must not show branch checksum accepted.
Install/update screens must not show source archive checksum accepted.
Install/update screens must not show copied checksum accepted or security-ready claims.

## Backup-Exclusion Screen Copy Boundary

Future mobile backup-exclusion screens are documentation-only candidates until a
separate wrapper UI implementation phase exists.

Backup-exclusion screens may show backup exclusion status only.
Backup-exclusion screens may show app-private storage required.
Backup-exclusion screens may show app-container storage required.
Backup-exclusion screens may show backup exclusion marker written by wrapper.
Backup-exclusion screens may show backup exclusion marker verified by wrapper.
Backup-exclusion screens may show platform verification token present.
Backup-exclusion screens may show cloud backup not claimed.
Backup-exclusion screens may show backup recovery not claimed.
Backup-exclusion screens may show rollback prevention not claimed.
Backup-exclusion screens may show secure deletion not claimed.

Backup-exclusion screens must not show cloud backup enabled.
Backup-exclusion screens must not show cloud sync enabled.
Backup-exclusion screens must not show backup recovery available.
Backup-exclusion screens must not show rollback prevention guaranteed.
Backup-exclusion screens must not show secure deletion guaranteed.
Backup-exclusion screens must not show shared external storage allowed.
Backup-exclusion screens must not show shared app group storage allowed.
Backup-exclusion screens must not show iCloud backup available.
Backup-exclusion screens must not show Google backup available.
Backup-exclusion screens must not show backup complete.
Backup-exclusion screens must not show data safe after device restore.
Backup-exclusion screens must not show security-ready claims.

## Local Data Lifecycle Screen Copy Boundary

Future mobile local data lifecycle screens are documentation-only candidates
until a separate wrapper UI implementation phase exists.

Local data lifecycle screens may show local data lifecycle status only.
Local data lifecycle screens may show conversation delete available.
Local data lifecycle screens may show conversation delete preserves session.
Local data lifecycle screens may show session delete available.
Local data lifecycle screens may show session delete preserves messages.
Local data lifecycle screens may show profile delete available.
Local data lifecycle screens may show full local wipe available.
Local data lifecycle screens may show passphrase-first unlock required.
Local data lifecycle screens may show encrypted store required.
Local data lifecycle screens may show backup exclusion best-effort only.
Local data lifecycle screens may show rollback detection marker only.
Local data lifecycle screens may show cloud backup not claimed.
Local data lifecycle screens may show backup recovery not claimed.
Local data lifecycle screens may show secure deletion not claimed.

Local data lifecycle screens must not show cloud backup enabled.
Local data lifecycle screens must not show cloud sync enabled.
Local data lifecycle screens must not show backup recovery available.
Local data lifecycle screens must not show rollback prevention guaranteed.
Local data lifecycle screens must not show secure deletion guaranteed.
Local data lifecycle screens must not show data safe after device restore.
Local data lifecycle screens must not show store path shown.
Local data lifecycle screens must not show passphrase retained.
Local data lifecycle screens must not show plaintext exposed.
Local data lifecycle screens must not show key material exposed.
Local data lifecycle screens must not show remote wipe available.
Local data lifecycle screens must not show security-ready claims.

## First-Run Platform Readiness Checklist Boundary

Future mobile first-run platform readiness checklists are documentation-only
candidates until a separate wrapper UI implementation phase exists.

First-run checklists may show first-run checklist status only.
First-run checklists may show mobile wrapper is documentation-only.
First-run checklists may show platform is Android shell candidate or iOS shell candidate.
First-run checklists may show manual update verification required.
First-run checklists may show redacted status only.
First-run checklists may show local data lifecycle status only.
First-run checklists may show backup exclusion status only.
First-run checklists may show app-private storage required.
First-run checklists may show app-container storage required.
First-run checklists may show platform verification token present.
First-run checklists may show cloud backup not claimed.
First-run checklists may show push delivery not claimed.
First-run checklists may show external onion delivery not claimed.
First-run checklists may show mobile app readiness not claimed.
First-run checklists may show security-ready not claimed.

First-run checklists must not show mobile app ready.
First-run checklists must not show Android app ready.
First-run checklists must not show iOS app ready.
First-run checklists must not show store approved.
First-run checklists must not show Play Store verified.
First-run checklists must not show App Store verified.
First-run checklists must not show TestFlight verified.
First-run checklists must not show push delivery enabled.
First-run checklists must not show background delivery enabled.
First-run checklists must not show cloud backup enabled.
First-run checklists must not show cloud sync enabled.
First-run checklists must not show external onion delivery verified.
First-run checklists must not show connected to peer.
First-run checklists must not show safe for sensitive communication.
First-run checklists must not show audited.
First-run checklists must not show production-ready.
First-run checklists must not show security-ready claims.

## Manual Pairing Checklist Screen Copy Boundary

Future mobile manual pairing checklists are documentation-only candidates until
a separate wrapper UI implementation phase exists.

Manual pairing checklists may show manual pairing checklist status only.
Manual pairing checklists may show invite code create or join is explicit user action.
Manual pairing checklists may show pairing payload export/import is manual.
Manual pairing checklists may show safety transcript confirm required.
Manual pairing checklists may show pairwise identity only.
Manual pairing checklists may show verified pairwise session required before messaging.
Manual pairing checklists may show redacted pairing status only.
Manual pairing checklists may show no central contact discovery.
Manual pairing checklists may show no searchable username.
Manual pairing checklists may show no phone number account.
Manual pairing checklists may show no email account.
Manual pairing checklists may show external onion delivery not claimed.
Manual pairing checklists may show push delivery not claimed.
Manual pairing checklists may show security-ready not claimed.

Manual pairing checklists must not show automatic contact discovery.
Manual pairing checklists must not show searchable username lookup.
Manual pairing checklists must not show phone number lookup.
Manual pairing checklists must not show email lookup.
Manual pairing checklists must not show global account.
Manual pairing checklists must not show central account.
Manual pairing checklists must not show central contact discovery.
Manual pairing checklists must not show central message server.
Manual pairing checklists must not show QR scan proves identity.
Manual pairing checklists must not show pairing automatically verified.
Manual pairing checklists must not show connected to peer.
Manual pairing checklists must not show message delivery verified.
Manual pairing checklists must not show external onion delivery verified.
Manual pairing checklists must not show push delivery enabled.
Manual pairing checklists must not show cloud backup enabled.
Manual pairing checklists must not show safe for sensitive communication.
Manual pairing checklists must not show security-ready claims.

## Invite Verification Checklist Boundary

Future mobile invite verification checklists are documentation-only candidates
until a separate wrapper UI implementation phase exists.

Invite verification checklists may show invite verification checklist status only.
Invite verification checklists may show invite code entered by explicit user action.
Invite verification checklists may show invite code create or join is manual.
Invite verification checklists may show pairing payload decodable before verification.
Invite verification checklists may show safety transcript displayed before confirmation.
Invite verification checklists may show safety transcript confirm required.
Invite verification checklists may show pairwise session draft only after safety confirmation.
Invite verification checklists may show message session still requires handshake.
Invite verification checklists may show redacted invite verification status only.
Invite verification checklists may show central contact discovery not claimed.
Invite verification checklists may show account lookup not claimed.
Invite verification checklists may show external onion delivery not claimed.
Invite verification checklists may show security-ready not claimed.

Invite verification checklists must not show invite code proves identity.
Invite verification checklists must not show invite code discovers contacts.
Invite verification checklists must not show invite code searches username.
Invite verification checklists must not show invite code looks up phone number.
Invite verification checklists must not show invite code looks up email.
Invite verification checklists must not show invite accepted automatically.
Invite verification checklists must not show safety transcript automatically confirmed.
Invite verification checklists must not show session ready after invite.
Invite verification checklists must not show connected to peer.
Invite verification checklists must not show message delivery verified.
Invite verification checklists must not show external onion delivery verified.
Invite verification checklists must not show central contact discovery.
Invite verification checklists must not show central message server.
Invite verification checklists must not show push delivery enabled.
Invite verification checklists must not show cloud backup enabled.
Invite verification checklists must not show safe for sensitive communication.
Invite verification checklists must not show security-ready claims.

## Manual Envelope Exchange Checklist Boundary

Future mobile manual envelope exchange checklists are documentation-only
candidates until a separate wrapper UI implementation phase exists.

Manual envelope exchange checklists may show manual envelope exchange checklist status only.
Manual envelope exchange checklists may show verified pairwise session required before envelope exchange.
Manual envelope exchange checklists may show passphrase-first unlock required.
Manual envelope exchange checklists may show session runtime material required.
Manual envelope exchange checklists may show message number reserved locally.
Manual envelope exchange checklists may show encrypted envelope export is explicit user action.
Manual envelope exchange checklists may show encrypted envelope import is explicit user action.
Manual envelope exchange checklists may show local transcript write after import.
Manual envelope exchange checklists may show network I/O not attempted.
Manual envelope exchange checklists may show external onion delivery not claimed.
Manual envelope exchange checklists may show delivery acknowledgement not claimed.
Manual envelope exchange checklists may show production messaging not claimed.
Manual envelope exchange checklists may show security-ready not claimed.

Manual envelope exchange checklists must not show send now.
Manual envelope exchange checklists must not show receive in background.
Manual envelope exchange checklists must not show automatic network send.
Manual envelope exchange checklists must not show automatic network receive.
Manual envelope exchange checklists must not show push delivery enabled.
Manual envelope exchange checklists must not show background delivery enabled.
Manual envelope exchange checklists must not show connected to peer.
Manual envelope exchange checklists must not show message delivered.
Manual envelope exchange checklists must not show message delivery verified.
Manual envelope exchange checklists must not show delivery acknowledgement received.
Manual envelope exchange checklists must not show external onion delivery verified.
Manual envelope exchange checklists must not show production messaging ready.
Manual envelope exchange checklists must not show production E2EE ready.
Manual envelope exchange checklists must not show plaintext message shown.
Manual envelope exchange checklists must not show key material exposed.
Manual envelope exchange checklists must not show cloud backup enabled.
Manual envelope exchange checklists must not show safe for sensitive communication.
Manual envelope exchange checklists must not show security-ready claims.

## Receive/Import Checklist Boundary

Future mobile receive/import checklists are documentation-only candidates until
a separate wrapper UI implementation phase exists.

Receive/import checklists may show receive/import checklist status only.
Receive/import checklists may show encrypted envelope import is explicit user action.
Receive/import checklists may show inbound envelope decoded locally.
Receive/import checklists may show verified pairwise session required before import.
Receive/import checklists may show session transport required before import.
Receive/import checklists may show replay window check required.
Receive/import checklists may show tamper failure does not advance state.
Receive/import checklists may show received transcript write is local.
Receive/import checklists may show plaintext shown only after local decrypt.
Receive/import checklists may show network receive not claimed.
Receive/import checklists may show external onion delivery not claimed.
Receive/import checklists may show background receive not claimed.
Receive/import checklists may show security-ready not claimed.

Receive/import checklists must not show receive in background.
Receive/import checklists must not show automatic network receive.
Receive/import checklists must not show push receive enabled.
Receive/import checklists must not show message received from network.
Receive/import checklists must not show connected to peer.
Receive/import checklists must not show message delivery verified.
Receive/import checklists must not show delivery acknowledgement received.
Receive/import checklists must not show external onion delivery verified.
Receive/import checklists must not show replay prevention guaranteed.
Receive/import checklists must not show tamper recovery guaranteed.
Receive/import checklists must not show plaintext stored unencrypted.
Receive/import checklists must not show key material exposed.
Receive/import checklists must not show cloud backup enabled.
Receive/import checklists must not show production messaging ready.
Receive/import checklists must not show production E2EE ready.
Receive/import checklists must not show safe for sensitive communication.
Receive/import checklists must not show security-ready claims.

## Retry/Cancel Checklist Boundary

Future mobile retry/cancel checklists are documentation-only candidates until
a separate wrapper UI implementation phase exists.

Retry/cancel checklists may show retry/cancel checklist status only.
Retry/cancel checklists may show retryable failure is local outbound state.
Retry/cancel checklists may show retry requires explicit user action.
Retry/cancel checklists may show cancel requires explicit user action.
Retry/cancel checklists may show retry reuses encrypted envelope export flow.
Retry/cancel checklists may show cancel terminal is local outbound state.
Retry/cancel checklists may show cancel does not send network notification.
Retry/cancel checklists may show pending outbound can be retried or canceled.
Retry/cancel checklists may show received import state is unchanged by cancel.
Retry/cancel checklists may show remote acknowledgement not required.
Retry/cancel checklists may show delivery acknowledgement not claimed.
Retry/cancel checklists may show external onion delivery not claimed.
Retry/cancel checklists may show network retry not claimed.
Retry/cancel checklists may show background retry not claimed.
Retry/cancel checklists may show security-ready not claimed.

Retry/cancel checklists must not show retry sent automatically.
Retry/cancel checklists must not show cancel notified peer.
Retry/cancel checklists must not show remote cancellation delivered.
Retry/cancel checklists must not show delivery acknowledgement required.
Retry/cancel checklists must not show retry delivery verified.
Retry/cancel checklists must not show background retry enabled.
Retry/cancel checklists must not show push retry enabled.
Retry/cancel checklists must not show message delivered after retry.
Retry/cancel checklists must not show connected to peer.
Retry/cancel checklists must not show external onion delivery verified.
Retry/cancel checklists must not show remote ack protocol ready.
Retry/cancel checklists must not show cancel deletes peer copy.
Retry/cancel checklists must not show cancel guarantees remote deletion.
Retry/cancel checklists must not show production messaging ready.
Retry/cancel checklists must not show production E2EE ready.
Retry/cancel checklists must not show safe for sensitive communication.
Retry/cancel checklists must not show security-ready claims.

## Transcript Status Checklist Boundary

Future mobile transcript status checklists are documentation-only candidates
until a separate wrapper UI implementation phase exists.

Transcript status checklists may show transcript status checklist status only.
Transcript status checklists may show sent direction is local outbound record.
Transcript status checklists may show received direction is local inbound record.
Transcript status checklists may show outbound pending is local state.
Transcript status checklists may show outbound failed is retryable local state.
Transcript status checklists may show outbound sent is local export status only.
Transcript status checklists may show outbound canceled is terminal local state.
Transcript status checklists may show expired message status is local lifecycle state.
Transcript status checklists may show conversation deleted status is local lifecycle state.
Transcript status checklists may show plaintext shown only from local decrypt.
Transcript status checklists may show transcript export is explicit user action.
Transcript status checklists may show delivery acknowledgement not claimed.
Transcript status checklists may show external onion delivery not claimed.
Transcript status checklists may show network sync not claimed.
Transcript status checklists may show security-ready not claimed.

Transcript status checklists must not show sent means delivered.
Transcript status checklists must not show message delivered to peer.
Transcript status checklists must not show message read by peer.
Transcript status checklists must not show delivery acknowledgement received.
Transcript status checklists must not show remote transcript synchronized.
Transcript status checklists must not show cloud transcript backup.
Transcript status checklists must not show transcript proves delivery.
Transcript status checklists must not show transcript proves receipt.
Transcript status checklists must not show connected to peer.
Transcript status checklists must not show external onion delivery verified.
Transcript status checklists must not show remote deletion verified.
Transcript status checklists must not show conversation deleted remotely.
Transcript status checklists must not show plaintext synced.
Transcript status checklists must not show key material exposed.
Transcript status checklists must not show production messaging ready.
Transcript status checklists must not show production E2EE ready.
Transcript status checklists must not show safe for sensitive communication.
Transcript status checklists must not show security-ready claims.

## Conversation Deletion Checklist Boundary

Future mobile conversation deletion checklists are documentation-only
candidates until a separate wrapper UI implementation phase exists.

Conversation deletion checklists may show conversation deletion checklist status only.
Conversation deletion checklists may show conversation delete is explicit user action.
Conversation deletion checklists may show local sent message records removed.
Conversation deletion checklists may show local received message records removed.
Conversation deletion checklists may show local message envelopes removed.
Conversation deletion checklists may show local message indexes removed.
Conversation deletion checklists may show local message counter removed.
Conversation deletion checklists may show pairwise session record preserved.
Conversation deletion checklists may show transcript empty after local delete.
Conversation deletion checklists may show local lifecycle state only.
Conversation deletion checklists may show secure deletion not claimed.
Conversation deletion checklists may show remote deletion not claimed.
Conversation deletion checklists may show cloud backup recovery not claimed.
Conversation deletion checklists may show external onion delivery not claimed.
Conversation deletion checklists may show security-ready not claimed.

Conversation deletion checklists must not show secure deletion guaranteed.
Conversation deletion checklists must not show forensic deletion guaranteed.
Conversation deletion checklists must not show peer copy deleted.
Conversation deletion checklists must not show remote deletion verified.
Conversation deletion checklists must not show remote wipe available.
Conversation deletion checklists must not show conversation deleted remotely.
Conversation deletion checklists must not show cloud backup deleted.
Conversation deletion checklists must not show backup recovery available.
Conversation deletion checklists must not show data safe after device restore.
Conversation deletion checklists must not show rollback prevention guaranteed.
Conversation deletion checklists must not show store path shown.
Conversation deletion checklists must not show passphrase retained.
Conversation deletion checklists must not show plaintext exposed.
Conversation deletion checklists must not show key material exposed.
Conversation deletion checklists must not show production messaging ready.
Conversation deletion checklists must not show production E2EE ready.
Conversation deletion checklists must not show safe for sensitive communication.
Conversation deletion checklists must not show security-ready claims.

## Session/Profile/Wipe Checklist Boundary

Future mobile session/profile/wipe checklists are documentation-only
candidates until a separate wrapper UI implementation phase exists.

Session/profile/wipe checklists may show session profile wipe checklist status only.
Session/profile/wipe checklists may show session delete is explicit user action.
Session/profile/wipe checklists may show session delete removes resume records.
Session/profile/wipe checklists may show session delete preserves message records.
Session/profile/wipe checklists may show profile delete is explicit user action.
Session/profile/wipe checklists may show profile delete removes profile store locks.
Session/profile/wipe checklists may show profile delete clears unlock state.
Session/profile/wipe checklists may show full local wipe is explicit user action.
Session/profile/wipe checklists may show full local wipe removes owned app data.
Session/profile/wipe checklists may show backup exclusion remains best-effort only.
Session/profile/wipe checklists may show rollback detection remains marker only.
Session/profile/wipe checklists may show cloud backup not claimed.
Session/profile/wipe checklists may show backup recovery not claimed.
Session/profile/wipe checklists may show secure deletion not claimed.
Session/profile/wipe checklists may show remote wipe not claimed.
Session/profile/wipe checklists may show security-ready not claimed.

Session/profile/wipe checklists must not show session delete removes peer messages.
Session/profile/wipe checklists must not show profile delete removes cloud account.
Session/profile/wipe checklists must not show full wipe deletes peer copy.
Session/profile/wipe checklists must not show remote wipe available.
Session/profile/wipe checklists must not show remote deletion verified.
Session/profile/wipe checklists must not show secure deletion guaranteed.
Session/profile/wipe checklists must not show forensic deletion guaranteed.
Session/profile/wipe checklists must not show cloud backup deleted.
Session/profile/wipe checklists must not show cloud sync disabled remotely.
Session/profile/wipe checklists must not show backup recovery available.
Session/profile/wipe checklists must not show data safe after device restore.
Session/profile/wipe checklists must not show rollback prevention guaranteed.
Session/profile/wipe checklists must not show store path shown.
Session/profile/wipe checklists must not show passphrase retained.
Session/profile/wipe checklists must not show plaintext exposed.
Session/profile/wipe checklists must not show key material exposed.
Session/profile/wipe checklists must not show production messaging ready.
Session/profile/wipe checklists must not show production E2EE ready.
Session/profile/wipe checklists must not show safe for sensitive communication.
Session/profile/wipe checklists must not show security-ready claims.

## Destructive Action Confirmation Checklist Boundary

Future mobile destructive action confirmation checklists are
documentation-only candidates until a separate wrapper UI implementation phase
exists.

Destructive action confirmation checklists may show destructive action confirmation checklist status only.
Destructive action confirmation checklists may show confirmation required before conversation delete.
Destructive action confirmation checklists may show confirmation required before session delete.
Destructive action confirmation checklists may show confirmation required before profile delete.
Destructive action confirmation checklists may show confirmation required before full local wipe.
Destructive action confirmation checklists may show action scope shown before confirmation.
Destructive action confirmation checklists may show local-only impact shown before confirmation.
Destructive action confirmation checklists may show pairwise session preservation shown when applicable.
Destructive action confirmation checklists may show message preservation shown when applicable.
Destructive action confirmation checklists may show owned app data scope shown before full wipe.
Destructive action confirmation checklists may show backup exclusion best-effort shown before confirmation.
Destructive action confirmation checklists may show secure deletion not claimed.
Destructive action confirmation checklists may show remote deletion not claimed.
Destructive action confirmation checklists may show cloud recovery not claimed.
Destructive action confirmation checklists may show security-ready not claimed.

Destructive action confirmation checklists must not show one tap destructive action.
Destructive action confirmation checklists must not show silent destructive action.
Destructive action confirmation checklists must not show secure deletion guaranteed.
Destructive action confirmation checklists must not show forensic deletion guaranteed.
Destructive action confirmation checklists must not show remote wipe available.
Destructive action confirmation checklists must not show peer copy deleted.
Destructive action confirmation checklists must not show remote deletion verified.
Destructive action confirmation checklists must not show cloud backup deleted.
Destructive action confirmation checklists must not show cloud recovery available.
Destructive action confirmation checklists must not show data safe after device restore.
Destructive action confirmation checklists must not show rollback prevention guaranteed.
Destructive action confirmation checklists must not show store path shown.
Destructive action confirmation checklists must not show passphrase retained.
Destructive action confirmation checklists must not show plaintext exposed.
Destructive action confirmation checklists must not show key material exposed.
Destructive action confirmation checklists must not show production messaging ready.
Destructive action confirmation checklists must not show production E2EE ready.
Destructive action confirmation checklists must not show safe for sensitive communication.
Destructive action confirmation checklists must not show security-ready claims.

## Lifecycle Checklist Index Boundary

Future mobile lifecycle checklist indexes are documentation-only candidates
until a separate wrapper UI implementation phase exists.

Lifecycle checklist indexes may show mobile lifecycle checklist index status only.
Lifecycle checklist indexes may show checklist coverage index only.
Lifecycle checklist indexes may show non-claim index only.
Lifecycle checklist indexes may show first-run checklist coverage included.
Lifecycle checklist indexes may show local data lifecycle coverage included.
Lifecycle checklist indexes may show transcript status coverage included.
Lifecycle checklist indexes may show conversation deletion coverage included.
Lifecycle checklist indexes may show session profile wipe coverage included.
Lifecycle checklist indexes may show destructive confirmation coverage included.
Lifecycle checklist indexes may show documentation-only mobile wrapper boundary.
Lifecycle checklist indexes may show mobile app readiness not claimed.
Lifecycle checklist indexes may show production messaging not claimed.
Lifecycle checklist indexes may show security-ready not claimed.
Lifecycle checklist indexes may show external onion delivery not claimed.
Lifecycle checklist indexes may show cloud backup not claimed.

Lifecycle checklist indexes must not show mobile app ready.
Lifecycle checklist indexes must not show mobile lifecycle ready.
Lifecycle checklist indexes must not show all lifecycle checks passed.
Lifecycle checklist indexes must not show production messaging ready.
Lifecycle checklist indexes must not show production E2EE ready.
Lifecycle checklist indexes must not show safe for sensitive communication.
Lifecycle checklist indexes must not show audited.
Lifecycle checklist indexes must not show security-ready claims.
Lifecycle checklist indexes must not show external onion delivery verified.
Lifecycle checklist indexes must not show store approved.
Lifecycle checklist indexes must not show push delivery enabled.
Lifecycle checklist indexes must not show cloud backup enabled.
Lifecycle checklist indexes must not show secure deletion guaranteed.
Lifecycle checklist indexes must not show remote wipe available.
Lifecycle checklist indexes must not show no remaining mobile work.
Lifecycle checklist indexes must not show release ready.

## Pre-Release Non-Claim Audit Boundary

Future mobile pre-release non-claim audits are documentation-only candidates
until a separate wrapper release review phase exists.

Pre-release non-claim audits may show mobile pre-release non-claim audit status only.
Pre-release non-claim audits may show public wording audit only.
Pre-release non-claim audits may show documentation-only wrapper state reviewed.
Pre-release non-claim audits may show no buildable mobile app recorded.
Pre-release non-claim audits may show no store distribution recorded.
Pre-release non-claim audits may show no runtime messaging recorded.
Pre-release non-claim audits may show non-claim wording coverage included.
Pre-release non-claim audits may show lifecycle checklist index coverage included.
Pre-release non-claim audits may show unsigned experimental public beta retained.
Pre-release non-claim audits may show sensitive communication prohibited retained.
Pre-release non-claim audits may show not audited retained.
Pre-release non-claim audits may show not production-ready retained.
Pre-release non-claim audits may show external onion delivery not claimed.
Pre-release non-claim audits may show cloud backup not claimed.
Pre-release non-claim audits may show push notification not claimed.
Pre-release non-claim audits may show central account or contact discovery not claimed.

Pre-release non-claim audits must not show pre-release approved.
Pre-release non-claim audits must not show release candidate approved.
Pre-release non-claim audits must not show mobile beta ready.
Pre-release non-claim audits must not show mobile app ready.
Pre-release non-claim audits must not show security audit passed.
Pre-release non-claim audits must not show audited as an audit completion claim.
Pre-release non-claim audits must not show production-ready.
Pre-release non-claim audits must not show safe for sensitive communication.
Pre-release non-claim audits must not show store review ready.
Pre-release non-claim audits must not show App Store ready.
Pre-release non-claim audits must not show Play Store ready.
Pre-release non-claim audits must not show external onion delivery verified.
Pre-release non-claim audits must not show push notifications ready.
Pre-release non-claim audits must not show cloud backup ready.
Pre-release non-claim audits must not show central account ready.
Pre-release non-claim audits must not show all blockers cleared.
Pre-release non-claim audits must not show no remaining mobile work.
Pre-release non-claim audits must not show release ready.

## Release-Blocker Inventory Boundary

Future mobile release-blocker inventories are documentation-only candidates
until a separate wrapper implementation and release review phase exists.

Release-blocker inventories may show mobile release-blocker inventory status only.
Release-blocker inventories may show remaining blocker inventory only.
Release-blocker inventories may show documentation-only wrapper blocker recorded.
Release-blocker inventories may show buildable mobile app blocker recorded.
Release-blocker inventories may show store distribution blocker recorded.
Release-blocker inventories may show runtime messaging blocker recorded.
Release-blocker inventories may show external onion delivery evidence blocker recorded.
Release-blocker inventories may show push notification blocker recorded.
Release-blocker inventories may show cloud backup blocker recorded.
Release-blocker inventories may show central account and contact discovery blocker recorded.
Release-blocker inventories may show independent audit blocker recorded.
Release-blocker inventories may show release approval blocker recorded.
Release-blocker inventories may show blockers are not cleared.
Release-blocker inventories may show release readiness not claimed.
Release-blocker inventories may show security readiness not claimed.

Release-blocker inventories must not show all blockers cleared.
Release-blocker inventories must not show no remaining mobile blockers.
Release-blocker inventories must not show release blockers resolved.
Release-blocker inventories must not show release approved.
Release-blocker inventories must not show mobile release ready.
Release-blocker inventories must not show mobile beta ready.
Release-blocker inventories must not show mobile app ready.
Release-blocker inventories must not show store distribution ready.
Release-blocker inventories must not show runtime messaging ready.
Release-blocker inventories must not show external onion delivery verified.
Release-blocker inventories must not show push notification ready.
Release-blocker inventories must not show cloud backup ready.
Release-blocker inventories must not show central account ready.
Release-blocker inventories must not show contact discovery ready.
Release-blocker inventories must not show independent audit complete.
Release-blocker inventories must not show security-ready.
Release-blocker inventories must not show production-ready.
Release-blocker inventories must not show safe for sensitive communication.

## Blocker-To-Implementation Roadmap Boundary

Future mobile blocker-to-implementation roadmaps are documentation-only
candidates until a separate implementation phase exists.

Blocker-to-implementation roadmaps may show mobile blocker-to-implementation roadmap status only.
Blocker-to-implementation roadmaps may show implementation phase mapping only.
Blocker-to-implementation roadmaps may show documentation-only wrapper phase recorded.
Blocker-to-implementation roadmaps may show buildable mobile app implementation phase recorded.
Blocker-to-implementation roadmaps may show store distribution decision phase recorded.
Blocker-to-implementation roadmaps may show runtime messaging implementation phase recorded.
Blocker-to-implementation roadmaps may show external onion delivery evidence phase recorded.
Blocker-to-implementation roadmaps may show push notification exclusion phase recorded.
Blocker-to-implementation roadmaps may show cloud backup exclusion phase recorded.
Blocker-to-implementation roadmaps may show central account and contact discovery exclusion phase recorded.
Blocker-to-implementation roadmaps may show independent audit evidence phase recorded.
Blocker-to-implementation roadmaps may show release approval evidence phase recorded.
Blocker-to-implementation roadmaps may show roadmap does not clear blockers.
Blocker-to-implementation roadmaps may show roadmap does not implement mobile app.
Blocker-to-implementation roadmaps may show roadmap does not claim release readiness.
Blocker-to-implementation roadmaps may show roadmap does not claim security readiness.

Blocker-to-implementation roadmaps must not show roadmap blockers resolved.
Blocker-to-implementation roadmaps must not show implementation complete.
Blocker-to-implementation roadmaps must not show mobile implementation complete.
Blocker-to-implementation roadmaps must not show mobile app implemented.
Blocker-to-implementation roadmaps must not show store distribution decided.
Blocker-to-implementation roadmaps must not show runtime messaging implemented.
Blocker-to-implementation roadmaps must not show external onion delivery evidence recorded.
Blocker-to-implementation roadmaps must not show push notification implemented.
Blocker-to-implementation roadmaps must not show cloud backup implemented.
Blocker-to-implementation roadmaps must not show central account implemented.
Blocker-to-implementation roadmaps must not show contact discovery implemented.
Blocker-to-implementation roadmaps must not show independent audit evidence recorded.
Blocker-to-implementation roadmaps must not show release approval recorded.
Blocker-to-implementation roadmaps must not show all roadmap items complete.
Blocker-to-implementation roadmaps must not show release ready.
Blocker-to-implementation roadmaps must not show security-ready.
Blocker-to-implementation roadmaps must not show production-ready.
Blocker-to-implementation roadmaps must not show safe for sensitive communication.

## Mobile Wrapper Implementation Entry Criteria Boundary

Future mobile wrapper implementation entry criteria are documentation-only
candidates until a separate implementation authorization phase exists.

Implementation entry criteria may show mobile wrapper implementation entry criteria status only.
Implementation entry criteria may show entry criteria list only.
Implementation entry criteria may show target platform decision criteria recorded.
Implementation entry criteria may show shared core FFI boundary criteria recorded.
Implementation entry criteria may show status DTO and redaction criteria recorded.
Implementation entry criteria may show local data lifecycle criteria recorded.
Implementation entry criteria may show explicit user action criteria recorded.
Implementation entry criteria may show no central account criteria recorded.
Implementation entry criteria may show no push notification dependency criteria recorded.
Implementation entry criteria may show no cloud backup criteria recorded.
Implementation entry criteria may show platform build scaffold criteria recorded.
Implementation entry criteria may show wrapper test plan criteria recorded.
Implementation entry criteria may show public non-claim copy criteria recorded.
Implementation entry criteria may show criteria are not satisfied.
Implementation entry criteria may show implementation has not started.
Implementation entry criteria may show release readiness not claimed.
Implementation entry criteria may show security readiness not claimed.

Implementation entry criteria must not show entry criteria satisfied.
Implementation entry criteria must not show implementation can start.
Implementation entry criteria must not show mobile implementation started.
Implementation entry criteria must not show mobile implementation complete.
Implementation entry criteria must not show mobile app implemented.
Implementation entry criteria must not show Android implementation ready.
Implementation entry criteria must not show iOS implementation ready.
Implementation entry criteria must not show FFI boundary stable.
Implementation entry criteria must not show runtime messaging available.
Implementation entry criteria must not show external onion delivery evidence recorded.
Implementation entry criteria must not show store distribution ready.
Implementation entry criteria must not show push notification implemented.
Implementation entry criteria must not show cloud backup implemented.
Implementation entry criteria must not show central account implemented.
Implementation entry criteria must not show all entry criteria met.
Implementation entry criteria must not show release ready.
Implementation entry criteria must not show security-ready.
Implementation entry criteria must not show production-ready.
Implementation entry criteria must not show safe for sensitive communication.

## Mobile Wrapper Implementation Authorization Boundary

Future mobile wrapper implementation authorization records are documentation-only
candidates until a separate implementation authorization phase exists.

Implementation authorization records may show mobile wrapper implementation authorization status only.
Implementation authorization records may show authorization record only.
Implementation authorization records may show authorization checklist only.
Implementation authorization records may show entry criteria reviewed but not satisfied.
Implementation authorization records may show explicit owner authorization required.
Implementation authorization records may show implementation authorization not granted.
Implementation authorization records may show mobile implementation has not started.
Implementation authorization records may show security review authorization not granted.
Implementation authorization records may show release review authorization not granted.
Implementation authorization records may show store distribution authorization not granted.
Implementation authorization records may show runtime messaging authorization not granted.
Implementation authorization records may show external delivery evidence authorization not granted.
Implementation authorization records may show push notification dependency remains excluded.
Implementation authorization records may show cloud backup remains excluded.
Implementation authorization records may show central account remains excluded.
Implementation authorization records may show mobile readiness not claimed.
Implementation authorization records may show authorization does not claim release readiness.
Implementation authorization records may show authorization does not claim security readiness.
Implementation authorization records may show runtime messaging availability not claimed.
Implementation authorization records may show store readiness not claimed.
Implementation authorization records may show external delivery evidence not claimed.

Implementation authorization records must not show implementation authorized.
Implementation authorization records must not show implementation authorization granted.
Implementation authorization records must not show authorization granted.
Implementation authorization records must not show owner approved implementation.
Implementation authorization records must not show entry criteria satisfied.
Implementation authorization records must not show all entry criteria met.
Implementation authorization records must not show implementation can start.
Implementation authorization records must not show mobile implementation started.
Implementation authorization records must not show mobile implementation complete.
Implementation authorization records must not show implementation complete.
Implementation authorization records must not show mobile app implemented.
Implementation authorization records must not show mobile app ready.
Implementation authorization records must not show mobile readiness.
Implementation authorization records must not show security review approved.
Implementation authorization records must not show release review approved.
Implementation authorization records must not show release readiness.
Implementation authorization records must not show mobile release ready.
Implementation authorization records must not show security readiness.
Implementation authorization records must not show store distribution approved.
Implementation authorization records must not show store readiness.
Implementation authorization records must not show runtime messaging authorized.
Implementation authorization records must not show runtime messaging available.
Implementation authorization records must not show runtime messaging implemented.
Implementation authorization records must not show runtime messaging ready.
Implementation authorization records must not show external delivery evidence recorded.
Implementation authorization records must not show external delivery evidence accepted.
Implementation authorization records must not show external onion delivery verified.
Implementation authorization records must not show push notification authorized.
Implementation authorization records must not show push notification implemented.
Implementation authorization records must not show cloud backup authorized.
Implementation authorization records must not show cloud backup implemented.
Implementation authorization records must not show central account authorized.
Implementation authorization records must not show central account implemented.
Implementation authorization records must not show release ready.
Implementation authorization records must not show security-ready.
Implementation authorization records must not show production-ready.
Implementation authorization records must not show safe for sensitive communication.

## Mobile Wrapper Implementation Kickoff Blocker Boundary

Future mobile wrapper implementation kickoff blocker records are documentation-only
candidates until a separate implementation authorization phase grants kickoff.

Implementation kickoff blocker records may show mobile wrapper implementation kickoff blocker status only.
Implementation kickoff blocker records may show kickoff blocker record only.
Implementation kickoff blocker records may show authorization not granted blocker recorded.
Implementation kickoff blocker records may show entry criteria not satisfied blocker recorded.
Implementation kickoff blocker records may show implementation kickoff blocked.
Implementation kickoff blocker records may show no implementation task opened.
Implementation kickoff blocker records may show no mobile source scaffold created.
Implementation kickoff blocker records may show no Android build scaffold created.
Implementation kickoff blocker records may show no iOS build scaffold created.
Implementation kickoff blocker records may show no runtime messaging scaffold created.
Implementation kickoff blocker records may show no store distribution task opened.
Implementation kickoff blocker records may show no external delivery evidence task opened.
Implementation kickoff blocker records may show push notification remains excluded.
Implementation kickoff blocker records may show cloud backup remains excluded.
Implementation kickoff blocker records may show central account remains excluded.
Implementation kickoff blocker records may show kickoff blocker does not claim mobile readiness.
Implementation kickoff blocker records may show kickoff blocker does not claim release readiness.
Implementation kickoff blocker records may show kickoff blocker does not claim security readiness.

Implementation kickoff blocker records must not show implementation kickoff allowed.
Implementation kickoff blocker records must not show implementation kickoff unblocked.
Implementation kickoff blocker records must not show implementation task opened.
Implementation kickoff blocker records must not show mobile implementation started.
Implementation kickoff blocker records must not show mobile implementation complete.
Implementation kickoff blocker records must not show mobile source scaffold created.
Implementation kickoff blocker records must not show Android build scaffold created.
Implementation kickoff blocker records must not show iOS build scaffold created.
Implementation kickoff blocker records must not show runtime messaging scaffold created.
Implementation kickoff blocker records must not show store distribution task opened.
Implementation kickoff blocker records must not show external delivery evidence task opened.
Implementation kickoff blocker records must not show implementation authorized.
Implementation kickoff blocker records must not show authorization granted.
Implementation kickoff blocker records must not show entry criteria satisfied.
Implementation kickoff blocker records must not show mobile app ready.
Implementation kickoff blocker records must not show mobile readiness.
Implementation kickoff blocker records must not show release ready.
Implementation kickoff blocker records must not show security-ready.
Implementation kickoff blocker records must not show production-ready.
Implementation kickoff blocker records must not show safe for sensitive communication.

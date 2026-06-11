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

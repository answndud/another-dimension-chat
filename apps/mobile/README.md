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

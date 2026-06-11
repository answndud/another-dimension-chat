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

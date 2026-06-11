# iOS Wrapper Candidate Skeleton

This is a documentation-only skeleton for a future iOS shell candidate.

It is not an Xcode project, not an IPA artifact, not TestFlight distribution,
not App Store distribution, and not iOS app readiness.

The intended iOS boundary is a thin Swift shell over UniFFI or another narrow
FFI boundary into the shared Rust core. The wrapper may provide app-container
storage resolution, iCloud backup-exclusion verification evidence, redacted
status display, local permission explanations, and explicit user-triggered
actions.

The iOS skeleton must not define independent protocol, storage, transport,
pairing, contact discovery, background fetch delivery, APNs delivery, Apple
account identity, iCloud backup, Keychain-only unlock, App Store/TestFlight
trust, Developer ID/notarization trust, or security-ready behavior.

# iOS Documentation-Only Boundary

This is a documentation-only boundary for a future iOS shell candidate. It is
not a mobile wrapper source scaffold.

It is not an Xcode project, not an IPA artifact, not TestFlight distribution,
not App Store distribution, and not iOS app readiness.

iOS follows only after the Android shell candidate preserves the shared-core
boundary and after explicit owner authorization confirms iOS implementation
scope. This file does not grant that authorization and does not create an Xcode,
Swift, runtime, IPA, TestFlight, App Store, or external delivery evidence task.

The intended iOS boundary is a thin Swift shell over UniFFI or another narrow
FFI boundary into the shared Rust core. The wrapper may provide app-container
storage resolution, iCloud backup-exclusion verification evidence, redacted
status display, local permission explanations, and explicit user-triggered
actions.

This iOS boundary must not define independent protocol, storage, transport,
pairing, contact discovery, background fetch delivery, APNs delivery, Apple
account identity, iCloud backup, Keychain-only unlock, App Store/TestFlight
trust, Developer ID/notarization trust, or security-ready behavior.

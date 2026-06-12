# Android Documentation-Only Boundary

This is a documentation-only boundary for a future Android shell candidate. It
is not a mobile wrapper source scaffold.

It is not a Gradle project, not an APK or AAB artifact, not Play Store
distribution, and not Android app readiness.

The intended Android boundary is a thin Kotlin shell over UniFFI or another
narrow FFI boundary into the shared Rust core. The wrapper may provide platform
private storage root resolution, backup-exclusion verification evidence,
redacted status display, local permission explanations, and explicit
user-triggered actions.

This Android boundary must not define independent protocol, storage, transport,
pairing, contact discovery, background delivery, push delivery, Google account,
Play Services, Firebase Cloud Messaging, Android Keystore-only unlock, cloud
backup, Play Store trust, or security-ready behavior.

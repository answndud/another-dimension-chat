# iOS Shell Scaffold Boundary

This is the first iOS shell source scaffold. It is intentionally narrow and must
stay a thin Swift shell over the shared Rust core boundary.

It is not an IPA artifact, not TestFlight distribution, not App Store
distribution, not iOS app readiness, not production-ready, not audited, and not
suitable for sensitive communication.

Phase HQ records explicit implementation authorization for a minimal iOS source
scaffold only. It does not authorize release packaging, TestFlight/App Store
work, external delivery evidence, APNs delivery, cloud backup, central account
or contact discovery, or security-ready claims.

The scaffold provides:

- Minimal Xcode project marker and SwiftUI app source layout.
- A Swift `SharedCoreMobileApi` protocol mirroring the Phase HO API groups.
- A placeholder `IOSSharedCoreBoundary` that returns redacted, blocked status
  until a real shared Rust binding phase exists.
- A passphrase-first SwiftUI shell with invite, manual envelope, and diagnostics
  controls routed through the shared-core boundary protocol.
- Empty iCloud entitlement arrays to keep iCloud backup not claimed.

The scaffold must not define independent protocol, storage, transport, pairing,
contact discovery, background fetch delivery, APNs delivery, Apple account
identity, iCloud backup, Keychain-only unlock, App Store/TestFlight trust,
Developer ID/notarization trust, external onion delivery success, or
security-ready behavior.

The only allowed mobile command surface remains:

- `shared_core_status_surface`
- `profile_unlock_lock_status`
- `invite_code_create_join`
- `pairing_payload_export_import`
- `safety_transcript_confirm`
- `manual_envelope_export_import`
- `message_transcript_view`
- `local_data_lifecycle`
- `redacted_support_diagnostics`

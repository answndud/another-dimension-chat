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
- An `IOSSharedCoreBoundary` that delegates read-only status calls and blocked
  command calls to source-boundary adapters until a real shared Rust binding
  phase exists.
- A source-only read-only status adapter for
  `status_and_redacted_diagnostics_read_only_adapter`.
- A blocked command adapter for unlock, invite, pairing, safety transcript,
  manual envelope, message transcript, and local data lifecycle surfaces.
- A passphrase-first SwiftUI shell with invite, manual envelope, diagnostics
  copy, lifecycle confirmation, and no-network launch boundary controls routed
  through the shared-core boundary protocol.
- Empty iCloud entitlement arrays to keep iCloud backup not claimed.

Operator handoff check:

- run `scripts/verify_mobile_source_handoff.sh` from the repository root
- this is source-boundary verification only
- current controls include diagnostics copy, lifecycle confirmation, and
  no-network launch boundary
- it does not build IPA artifacts, generate FFI bindings, start runtime
  messaging, request local network usage, configure APNs, or claim iOS readiness

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

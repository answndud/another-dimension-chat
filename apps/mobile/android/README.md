# Android Shell Scaffold Boundary

This is the first Android shell source scaffold. It is intentionally narrow and
must stay a thin Kotlin shell over the shared Rust core boundary.

It is not an APK or AAB artifact, not Play Store distribution, not Android app
readiness, not production-ready, not audited, and not suitable for sensitive
communication.

Phase HP records explicit implementation authorization for a minimal Android
source scaffold only. It does not authorize release packaging, Play Store work,
external delivery evidence, push notification delivery, cloud backup, central
account or contact discovery, or security-ready claims.

The scaffold provides:

- Gradle Android application source layout.
- A Kotlin `SharedCoreMobileApi` interface mirroring the Phase HO API groups.
- A placeholder `AndroidSharedCoreBoundary` that returns redacted, blocked
  status until a real shared Rust binding phase exists.
- A passphrase-first `MainActivity` shell with invite, manual envelope, and
  diagnostics controls routed through the shared-core boundary interface.
- Android backup exclusion XML with app data excluded from cloud/device backup.

The scaffold must not define independent protocol, storage, transport, pairing,
contact discovery, background delivery, push delivery, Google account, Play
Services, Firebase Cloud Messaging, Android Keystore-only unlock, cloud backup,
Play Store trust, external onion delivery success, or security-ready behavior.

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

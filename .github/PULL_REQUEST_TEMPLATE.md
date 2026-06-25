# Pull Request Checklist

This project is not a secure messenger release today, and the macOS default
install path is source build rather than a downloadable DMG.

Before opening or merging a public change, confirm:

- [ ] The change does not add phone-number, email, global account, searchable
      username, centralized contact discovery, central message server, push
      notification, or cloud backup behavior.
- [ ] The change does not add App Store, notarization, Developer ID signing,
      telemetry, crash upload, cloud reporting, or auto-update behavior.
- [ ] The change does not claim secure messaging, audited security,
      production-ready E2EE, sensitive communication safety, reliable
      real-network onion delivery, completed independent review, or external
      two-machine onion evidence.
- [ ] Public text preserves the source-build primary boundary, keeps the legacy
      unsigned DMG fallback secondary, and still says `not audited`,
      `not production-ready`, and `sensitive communication prohibited` where
      release wording is touched.
- [ ] Public files do not include bridge lines, onion endpoints, invite codes,
      payloads, safety phrases, profile names, message text, local paths, raw
      logs, crash dumps, passphrases, private keys, key material, private
      planning notes, files from `docs/`, local app data, or screenshots of
      private room data.
- [ ] If release files changed, the legacy unsigned DMG path still matches the
      documented fallback flow and checksum instructions.
- [ ] No external peer report or independent review evidence was fabricated.

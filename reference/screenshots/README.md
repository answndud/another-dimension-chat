# Public Screenshot Set

These screenshots are reviewed source-side visual aids for the macOS Apple
Silicon unsigned experimental public beta. They are not GitHub Release assets,
not install evidence, not audit evidence, and not production-ready evidence.
Sensitive communication is prohibited.

Capture mode:

```text
http://127.0.0.1:1420/?reset-preview=1&screenshot-safe=1
```

The `screenshot-safe=1` preview is localhost-only and blanks private-looking
fields before capture. Do not publish alternate screenshots that show profile
names, passphrases, invite codes, delivery codes, onion endpoints, payloads,
safety phrases, message text, local paths, raw logs, private keys, key material,
or files from `docs/`.

Reviewed files:

- `macos-public-beta-first-run-desktop.png`: first-run unsigned beta warning and checklist.
- `macos-public-beta-first-run-mobile.png`: narrow first-run warning and invite entry layout.
- `macos-public-beta-room-flow-desktop.png`: invite room and manual encrypted envelope flow with blank invite fields.
- `macos-public-beta-manual-envelope-desktop.png`: manual/default path and blank envelope flow state.
- `macos-public-beta-diagnostics-desktop.png`: public diagnostics and recovery guide with redacted-only fields.
- `macos-public-beta-profile-lifecycle-desktop.png`: blank profile unlock/create inputs and local data lifecycle boundary.

Release boundary:

- These files may be referenced by the README or repository pages.
- They must not be uploaded to the existing GitHub Release without a separate
  release-asset review.
- They do not claim external onion delivery success, audit completion,
  production readiness, or sensitive communication safety.

# Public Screenshot Checklist

Another Dimension Chat is not a secure messenger release today. Screenshots are
only visual aids for the unsigned experimental public beta. They must not create
a security, audit, external delivery, or sensitive-use claim.

## Capture Mode

Use the browser preview with blank local state:

```bash
npm --prefix apps/desktop-tauri run dev:ui
```

Then open:

```text
http://127.0.0.1:1420/?reset-preview=1&screenshot-safe=1
```

The `screenshot-safe=1` mode is localhost-only. It blanks profile, passphrase,
endpoint, invite-code, delivery-code, payload, message, transcript, and
diagnostics fields that could otherwise show private-looking demo data.

Generated screenshot candidates are local artifacts only. Store them under
`apps/desktop-tauri/screenshot-candidates/` if needed, and do not commit that
folder.

The reviewed source-side public screenshot set lives under
`reference/screenshots/`. These committed files are repository visual aids only.
They are not GitHub Release assets and must not be uploaded to the existing
release without a separate release-asset review.

## Required Candidate Frames

- First-run warning and checklist.
- Profile unlock panel before any profile or passphrase is typed.
- Invite/manual envelope flow before any invite code, payload, endpoint, or
  message text is generated or pasted.
- Public diagnostics and recovery guide with an empty or redacted diagnostics
  field only.
- Local data lifecycle guide and blank confirmation inputs.

## Forbidden Visible Data

Do not publish a screenshot that shows:

- profile names
- passphrases
- invite codes
- delivery codes
- onion endpoints
- pairing, endpoint, handshake, or envelope payloads
- safety phrases
- message text
- transcript rows from real use
- local paths
- raw logs or crash dumps
- private keys, key material, tokens, or secrets
- files from `docs/`
- local app data

## Visual Acceptance

Before using a screenshot publicly:

- Verify the first viewport says `unsigned experimental public beta`,
  `sensitive communication prohibited`, `not audited`, and
  `not production-ready`.
- Verify no visible copy claims production readiness, audit completion,
  external onion delivery success, Briar/Cwtch equivalence, censorship
  resistance, or sensitive communication safety.
- Check desktop at approximately `1440x1000` and narrow preview at
  approximately `390x844`.
- Confirm important buttons, warnings, lifecycle notes, and diagnostics controls
  do not overlap or overflow their containers.
- Keep screenshots out of release assets unless a separate release task reviews
  the exact image files.

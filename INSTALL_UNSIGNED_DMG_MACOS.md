# Install the unsigned DMG on macOS

This is the primary macOS install path for Apple Silicon users.

## Steps

1. Download the GitHub Release DMG and the matching `SHA256SUMS.txt`.
2. Verify the checksum from the same release:

```sh
shasum -a 256 -c SHA256SUMS.txt
```

3. Open the DMG, drag `Another Dimension Chat.app` into `/Applications`, and
   eject the DMG.
4. Launch the app once. If macOS blocks the first launch, open **System
   Settings > Privacy & Security**, scroll down, and click **Open Anyway**.
   The button only appears after macOS has blocked an attempted launch.
5. If **Open Anyway** still does not appear, open **Applications**, Control-click
   **Another Dimension Chat**, choose **Open**, then choose **Open** again in the
   confirmation dialog. This is the normal Finder approval path for an unsigned
   app.

## What Not To Do

- Do not use `xattr` to remove quarantine.
- Do not disable Gatekeeper globally.
- Do not install a custom certificate.

## Source Build Alternate

If you intentionally want the alternate path, use
[Install from source on macOS](INSTALL_FROM_SOURCE_MACOS.md).

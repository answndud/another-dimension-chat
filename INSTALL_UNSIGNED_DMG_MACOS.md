# Legacy unsigned DMG on macOS

The web runtime is the current product direction. This document describes a
historical unsigned macOS artifact only; it is not the primary installation
path and is not a production security release.

If you intentionally test the legacy artifact:

1. Download the DMG and matching checksum from the same historical release.
2. Verify the checksum with `shasum -a 256`.
3. Drag the app into `/Applications`.
4. If macOS blocks the first launch, use Finder's **Open** confirmation path
   or **Privacy & Security > Open Anyway**.

Do not remove quarantine with `xattr`, disable Gatekeeper, or install a custom
certificate. Prefer the local web runtime for current development.

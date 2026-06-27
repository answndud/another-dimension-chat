# Install from Source on macOS

This is the primary macOS install path for developers and other people who want
to build the app locally instead of downloading a DMG.

## Requirements

- macOS on Apple Silicon
- Xcode Command Line Tools
- Rust toolchain
- Node.js and npm
- Git

## Build

1. Clone the repository.

   ```sh
   git clone https://github.com/answndud/another-dimension-chat.git
   cd another-dimension-chat
   ```

2. Install the desktop package dependencies.

   ```sh
   npm ci --prefix apps/desktop-tauri
   ```

3. Build the macOS app bundle.

   ```sh
   npm --prefix apps/desktop-tauri run tauri:build:beta-onion
   ```

4. Open the built app bundle.

   ```sh
   open apps/desktop-tauri/src-tauri/target/release/bundle/macos/Another\ Dimension\ Chat.app
   ```

## Verification Ladder

If you want to check the checkout before or after building, use the repo-root
verification scripts in this order:

```sh
scripts/verify_light.sh  # source-build boundaries + all desktop JavaScript tests
scripts/verify_warm.sh   # light + rustfmt + desktop Tauri cargo check
scripts/verify_cold.sh   # warm + runtime/workspace tests + clippy; pre-release only
```

`scripts/verify_all.sh` is a compatibility alias for light and
`scripts/verify_full.sh` is a compatibility alias for cold. The optional
`smoke_dev_cli.sh` and `smoke_tauri_two_profile.sh` flows are manual acceptance
checks for prototype and production two-profile resume behavior; they are not
part of default verification.

## Reproducibility

For build-version and toolchain expectations, see
[Reproducible build notes for macOS](REPRODUCIBLE_BUILD_MACOS.md).

## What To Expect

- This is a developer-oriented path.
- It does not depend on a signed or notarized GitHub Release DMG.
- It does not claim audited, production-ready, or secure-messenger readiness.

## Common Failures

- `cargo` is missing or not on `PATH`
- `npm ci` fails because Node.js or lockfile prerequisites are missing
- Xcode Command Line Tools are not installed
- Tauri build or bundling fails because the local macOS toolchain is incomplete

## Notes

- If you are trying to help a non-developer, the source build path is usually
  the wrong path.
- If you intentionally use the legacy DMG fallback, verify the checksum
  first and treat it as an optional convenience path, not the primary one.

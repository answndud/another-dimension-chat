# Desktop Tauri Scaffold

This directory is the first desktop shell scaffold for Another Dimension Chat.

It is intentionally not a production messaging UI.

Current boundary:

- Tauri shell only.
- Rust owns security-sensitive state and future protocol/storage/transport behavior.
- Frontend may request redacted prototype status only.
- No Tor bootstrap, onion hosting, descriptor publication, stream I/O, envelope I/O, push notifications, cloud backup, groups, file transfer, or multi-device support.
- `src-tauri` is excluded from the root Cargo workspace until the Tauri dependency and platform build costs are accepted as a separate phase.

Planned local commands after dependency installation:

```bash
npm install
npm run dev
npm run build
```

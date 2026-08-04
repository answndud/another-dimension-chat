#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const bridge = await readFile("apps/daemon/src/bridge.rs", "utf8");
const failures = [];
for (const marker of [
  "TcpListener",
  "is_loopback",
  "#ad_bootstrap=",
  "self.bootstrap_hash = None",
  "HttpOnly",
  "SameSite=Strict",
  "constant_time_equal",
  "InvalidRequestOrigin",
  "InvalidHost",
  "CsrfRequired",
  "invalidate_session",
  "ui_version",
]) {
  if (!bridge.includes(marker)) failures.push(`local bridge marker missing: ${marker}`);
}
for (const forbidden of ["localStorage", "IndexedDB", "private_key", "plaintext"]) {
  if (bridge.includes(forbidden)) failures.push(`local bridge must not own browser/private-state surface: ${forbidden}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("local bridge boundary passed: loopback, one-time bootstrap, origin/host, CSRF, cookie, version, and restart controls present");

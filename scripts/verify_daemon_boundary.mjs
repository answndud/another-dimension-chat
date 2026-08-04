#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const cargo = await readFile("Cargo.toml", "utf8");
const manifest = await readFile("apps/daemon/Cargo.toml", "utf8");
const library = await readFile("apps/daemon/src/lib.rs", "utf8");
const main = await readFile("apps/daemon/src/main.rs", "utf8");
const storage = await readFile("apps/daemon/src/storage.rs", "utf8");
const bridge = await readFile("apps/daemon/src/bridge.rs", "utf8");
const cli = await readFile("apps/daemon/src/cli.rs", "utf8");
const boundary = JSON.parse(await readFile("reference/product_boundary.json", "utf8"));
const failures = [];

if (!/^\s*"apps\/daemon",/m.test(cargo)) failures.push("daemon is not a workspace member");
if (!/name\s*=\s*"another-dimension-daemon"/.test(manifest)) failures.push("daemon package name is not fixed");
if (!/boundary-only-not-high-risk-ready/.test(library) || !/High-risk release remains disabled/.test(main)) failures.push("daemon readiness marker is missing");
for (const marker of ["Argon2id", "Aes256Gcm", "RollbackDetected", "OsKeyStoreUnavailable", "zeroize"]) {
  if (!storage.includes(marker)) failures.push(`daemon storage boundary marker missing: ${marker}`);
}
if (/println!|eprintln!/.test(storage)) failures.push("daemon storage must not print secrets or storage diagnostics");
for (const marker of ["is_loopback", "HttpOnly", "SameSite=Strict", "CsrfRequired", "invalidate_session"]) {
  if (!bridge.includes(marker)) failures.push(`daemon bridge boundary marker missing: ${marker}`);
}
for (const marker of ["ADRECOVERY1", "UnsafeSecretArgument", "read_to_string", "release readiness blocked"]) {
  if (!cli.includes(marker) && !main.includes(marker)) failures.push(`daemon CLI boundary marker missing: ${marker}`);
}
for (const forbidden of ["another-dimension-crypto", "another-dimension-transport", "another-dimension-storage", "apps/desktop-tauri", "vodozemac", "tokio", "axum"]) {
  if (manifest.includes(forbidden) || library.includes(forbidden) || main.includes(forbidden)) failures.push(`daemon boundary imports forbidden dependency or surface: ${forbidden}`);
}
if (boundary.candidateProductPath !== "apps/daemon" || !String(boundary.candidateProduct).includes("not implemented")) failures.push("product boundary does not mark daemon as not implemented");
if (boundary.highRiskAllowed !== false) failures.push("high-risk mode must remain disabled");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("daemon boundary passed: isolated workspace member, no runtime dependencies, high-risk disabled");

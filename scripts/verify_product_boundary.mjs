#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { isForbiddenReleasePath, loadProductBoundary, PRODUCT_BOUNDARY_FILE } from "./product_boundary.mjs";

const root = path.resolve(process.argv[2] || ".");
const releaseMode = process.argv[3] === "--release";
const boundary = await loadProductBoundary(root);

if (releaseMode) {
  const entries = [];
  const walk = async (dir, prefix = "") => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative);
      else entries.push(relative);
    }
  };
  await walk(root);
  const leaked = entries.filter((file) => isForbiddenReleasePath(file, boundary.forbiddenReleasePaths));
  if (leaked.length) throw new Error(`legacy product files leaked into release: ${leaked.join(", ")}`);
  for (const file of boundary.requiredReleaseFiles) await access(path.join(root, file), constants.R_OK);
  console.log(`product boundary passed: ${entries.length} release files, no legacy surface`);
  process.exit(0);
}

const requiredSource = [
  "apps/web/package.json",
  "apps/server/server.mjs",
  "apps/server/storage.mjs",
  "apps/daemon/Cargo.toml",
  "apps/daemon/src/lib.rs",
  "apps/daemon/src/model.rs",
  "apps/daemon/src/protocol_gate.rs",
  "reference/PRODUCT_BOUNDARY.md",
  PRODUCT_BOUNDARY_FILE,
  "SECURITY.md",
];
for (const file of requiredSource) await access(path.join(root, file), constants.R_OK);
const daemonManifest = await readFile(path.join(root, "apps/daemon/Cargo.toml"), "utf8");
const workspaceManifest = await readFile(path.join(root, "Cargo.toml"), "utf8");
const cargoLock = await readFile(path.join(root, "Cargo.lock"), "utf8");
const daemonSource = await readFile(path.join(root, "apps/daemon/src/lib.rs"), "utf8");
const protocolGate = await readFile(path.join(root, "apps/daemon/src/protocol_gate.rs"), "utf8");
const webEntry = await readFile(path.join(root, "apps/web/src/main.js"), "utf8");
if (!daemonManifest.includes("name = \"another-dimension-daemon\"")) {
  throw new Error("daemon manifest is not the current product owner");
}
if (/from\s+["']\.\/web-runtime\.js["']/.test(webEntry)) {
  throw new Error("daemon web entrypoint must not import browser-owned web-runtime");
}
for (const legacyCrypto of [
  "apps/desktop-tauri",
  "apps/cli",
  "apps/engine",
  "crates/core",
  "crates/crypto",
  "crates/identity",
  "crates/pairing",
  "crates/protocol",
  "crates/storage",
  "crates/transport",
  "apps/web/src/web-runtime.js",
  "apps/web/src/argon2-worker.js",
  "apps/web/src/generated/ad_crypto_bg.wasm",
  "crates/web-crypto-wasm/Cargo.toml",
]) {
  try {
    await access(path.join(root, legacyCrypto), constants.F_OK);
    throw new Error(`legacy product source remains: ${legacyCrypto}`);
  } catch (error) {
    if (error.message?.startsWith("legacy product source")) throw error;
    if (error.code !== "ENOENT") throw error;
  }
}
for (const marker of ["web-crypto-wasm", "vodozemac", "apps/cli", "apps/engine", "crates/core", "crates/transport"]) {
  if (workspaceManifest.includes(marker) || cargoLock.includes(marker)) throw new Error(`legacy crypto dependency remains: ${marker}`);
}
for (const marker of ["renderLegacy", "bindAuth", "bindRoom", "browserStatus"]) {
  if (webEntry.includes(marker)) throw new Error(`legacy browser UI marker leaked into daemon entrypoint: ${marker}`);
}
for (const marker of ["pub mod model;", "local-security-daemon", "openmls-1"]) {
  const source = marker === "openmls-1" ? protocolGate : daemonSource;
  if (!source.includes(marker)) throw new Error(`daemon product contract missing marker: ${marker}`);
}

const boundaryDocument = await readFile(path.join(root, "reference/PRODUCT_BOUNDARY.md"), "utf8");
for (const marker of [boundary.supportedProduct, "high-risk route is permanently disabled", ...boundary.nonClaims]) {
  if (!boundaryDocument.toLowerCase().includes(marker.toLowerCase())) throw new Error(`product boundary missing marker: ${marker}`);
}
console.log("product boundary source checks passed");

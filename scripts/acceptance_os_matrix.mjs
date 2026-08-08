#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";

if (process.argv[2] !== "--current-host") {
  console.error("usage: node scripts/acceptance_os_matrix.mjs --current-host");
  process.exit(2);
}

assert.equal(platform(), "darwin", "this matrix entry is only for the current macOS host");
assert.equal(arch(), "arm64", "this matrix entry is only for the current arm64 host");
const major = Number(process.versions.node.split(".")[0]);
assert.ok(major >= 20, `Node.js 20+ is required; found ${process.versions.node}`);

const root = resolve(import.meta.dirname, "..");
const timeoutMs = Number(process.env.AD_ACCEPTANCE_TIMEOUT_MS ?? "30000");
assert.ok(Number.isInteger(timeoutMs) && timeoutMs >= 30_000 && timeoutMs <= 120_000,
  "AD_ACCEPTANCE_TIMEOUT_MS must be an integer between 30000 and 120000");
const child = spawn(process.execPath, ["scripts/acceptance_release_local_only.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=256" },
});
const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
const code = await new Promise((resolveExit, reject) => {
  child.on("error", reject);
  child.on("close", (exitCode, signal) => resolveExit(signal ? 124 : exitCode));
});
clearTimeout(timer);
assert.equal(code, 0, "release local-only acceptance failed or timed out");
console.log(`OS matrix passed: ${platform()} ${arch()} · Node.js ${process.versions.node} · kernel ${release()}`);
console.log("OS matrix scope: bundled-runtime install, doctor, permissions, tamper, update, rollback, key/version/revocation gates");

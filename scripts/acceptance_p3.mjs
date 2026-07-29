#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = join(tmpdir(), `another-dimension-acceptance-${process.pid}`);
await mkdir(root, { recursive: true });
const releaseMode = process.argv.includes("--release");
const commands = [
  ["server", process.execPath, ["--test", "apps/server/server.test.mjs"]],
  ["web-runtime", process.execPath, ["--test", "apps/web/src/web-runtime.test.js"]],
  ["relay-smoke", process.execPath, ["scripts/smoke_user_owned_servers.mjs"]],
  ["local-only-acceptance", process.execPath, ["scripts/acceptance_local_only.mjs"]],
  ["release-tests", process.execPath, ["--test", "scripts/release_manifest.test.mjs"]],
  ["claim-scan", process.execPath, ["scripts/verify_docs_claims.mjs"]],
];
const run = (name, command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: process.cwd(), stdio: "inherit", env: { ...process.env, AD_ACCEPTANCE_TMP: root } });
  const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`${name} timed out after 30s`)); }, 30_000);
  child.on("exit", (code, signal) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${name} failed (${code ?? signal})`)); });
});
try {
  if (releaseMode) {
    await access("apps/web/node_modules/.bin/vite", constants.X_OK);
    await run("production-build", process.env.npm_execpath || "npm", ["--prefix", "apps/web", "run", "build", "--workspaces=false"]);
  }
  for (const [name, command, args] of commands) await run(name, command, args);
  await access("apps/web/src/generated/ad_crypto_bg.wasm", constants.R_OK);
  await writeFile(join(root, "acceptance.json"), JSON.stringify({ format: "another-dimension-p3-acceptance", status: "passed", mode: releaseMode ? "release" : "focused", checks: [ ...(releaseMode ? ["production-build"] : []), ...commands.map(([name]) => name) ], wasmFreshness: "committed-module-present" }, null, 2));
  console.log(`P3 automated acceptance passed; artifact: ${join(root, "acceptance.json")}`);
} finally {
  // Keep the artifact for inspection; it is in the OS temp directory, never in the repository.
}

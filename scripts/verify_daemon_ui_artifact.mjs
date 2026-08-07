#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
if (process.argv[2] !== "--daemon-ui-artifact") {
  console.error("usage: node scripts/verify_daemon_ui_artifact.mjs --daemon-ui-artifact");
  process.exit(2);
}

const run = (command, args) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => resolveRun({ code, stdout, stderr }));
});

await access(resolve(root, "apps/web/dist/index.html"));
const index = await readFile(resolve(root, "apps/web/dist/index.html"), "utf8");
if (index.includes("/@vite/client") || index.includes("/src/main.js")) {
  throw new Error("daemon UI artifact contains Vite development paths");
}
try {
  await access(resolve(root, "apps/web/dist/sw.js"));
  throw new Error("daemon UI artifact must not contain a persistent service worker");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const serverHttp = await readFile(resolve(root, "apps/server/http.mjs"), "utf8");
if (!serverHttp.includes("script-src 'self';")) throw new Error("relay CSP does not restrict scripts to local assets");
if (/script-src[^;]*(?:unsafe-eval|wasm-unsafe-eval)/.test(serverHttp)) {
  throw new Error("relay CSP permits runtime code generation");
}
for (const script of ["scripts/verify_support_matrix.mjs"]) {
  const result = await run(process.execPath, [script]);
  if (result.code !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.code || 1);
  }
  process.stdout.write(result.stdout);
}
console.log("daemon UI artifact verified: production paths, CSP, support claims and no persistent service worker");
console.log("note: this static verifier is not Chromium end-to-end evidence");

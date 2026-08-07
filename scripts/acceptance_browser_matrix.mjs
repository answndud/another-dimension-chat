#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const mode = process.argv[2];
if (mode !== "--in-app-browser") {
  console.error("usage: node scripts/acceptance_browser_matrix.mjs --in-app-browser");
  process.exit(2);
}

const run = (command, args) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => resolveRun({ code, stdout, stderr }));
});

await access(resolve(root, "apps/web/dist/index.html"));
const index = await readFile(resolve(root, "apps/web/dist/index.html"), "utf8");
if (index.includes("/@vite/client") || index.includes("/src/main.js")) throw new Error("production artifact contains Vite development paths");
const server = await readFile(resolve(root, "apps/server/server.mjs"), "utf8");
if (!server.includes("script-src 'self';")) throw new Error("server CSP does not restrict scripts to signed local assets");
if (/script-src[^;]*(?:unsafe-eval|wasm-unsafe-eval)/.test(server)) throw new Error("server CSP permits runtime code generation");
const result = await run(process.execPath, ["scripts/verify_support_matrix.mjs"]);
if (result.code !== 0) { process.stderr.write(result.stderr); process.exit(result.code || 1); }
process.stdout.write(result.stdout);
const serviceWorkerResult = await run(process.execPath, ["scripts/verify_service_worker.mjs"]);
if (serviceWorkerResult.code !== 0) { process.stderr.write(serviceWorkerResult.stderr); process.exit(serviceWorkerResult.code || 1); }
process.stdout.write(serviceWorkerResult.stdout);
const serviceWorkerRuntimeResult = await run(process.execPath, ["scripts/verify_service_worker_runtime.mjs"]);
if (serviceWorkerRuntimeResult.code !== 0) { process.stderr.write(serviceWorkerRuntimeResult.stderr); process.exit(serviceWorkerRuntimeResult.code || 1); }
process.stdout.write(serviceWorkerRuntimeResult.stdout);
console.log("browser acceptance: production artifact boundary checked");
console.log("browser acceptance: CSP blocks JavaScript and WebAssembly runtime code generation");
console.log("browser acceptance: in-app browser checks are local evidence; exact macOS Chromium version evidence remains unverified");

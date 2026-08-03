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
if (!server.includes("script-src 'self' 'wasm-unsafe-eval';")) throw new Error("server CSP does not permit the required WASM boundary");
if (server.includes("script-src 'self' 'unsafe-eval'")) throw new Error("server CSP broadened to JavaScript unsafe-eval");
const result = await run(process.execPath, ["scripts/verify_support_matrix.mjs"]);
if (result.code !== 0) { process.stderr.write(result.stderr); process.exit(result.code || 1); }
process.stdout.write(result.stdout);
console.log("browser acceptance: production artifact boundary checked");
console.log("browser acceptance: WASM CSP boundary checked without broad unsafe-eval");
console.log("browser acceptance: in-app browser profile-creation result is scoped verified-local; full browser matrix remains unverified");

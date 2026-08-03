#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { generateKeyPairSync } from "node:crypto";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = join(tmpdir(), `another-dimension-acceptance-${process.pid}`);
await mkdir(root, { recursive: true });
const releaseMode = process.argv.includes("--release");
const seed = process.env.AD_ACCEPTANCE_SEED || "another-dimension-p3-fixed-seed-v1";
const timeoutMs = 30_000;
const maxOldSpaceMb = 256;
const commands = [
  ["server", process.execPath, ["--test", "apps/server/server.test.mjs"]],
  ["web-runtime", process.execPath, ["--test", "apps/web/src/web-runtime.test.js"]],
  ["relay-smoke", process.execPath, ["scripts/smoke_user_owned_servers.mjs"]],
  ["local-only-acceptance", process.execPath, ["scripts/acceptance_local_only.mjs"]],
  ["release-local-only-acceptance", process.execPath, ["scripts/acceptance_release_local_only.mjs"]],
  ["release-tests", process.execPath, ["--test", "scripts/release_manifest.test.mjs"]],
  ["transport-boundary", process.execPath, ["scripts/verify_transport_boundary.mjs"]],
  ["security-requirements", process.execPath, ["scripts/verify_security_requirements.mjs"]],
  ["claim-scan", process.execPath, ["scripts/verify_docs_claims.mjs"]],
];
const run = (name, command, args, extraEnv = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
      AD_ACCEPTANCE_TMP: root,
      AD_ACCEPTANCE_SEED: seed,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=${maxOldSpaceMb}`.trim(),
    },
  });
  const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`${name} timed out after ${timeoutMs}ms`)); }, timeoutMs);
  child.on("exit", (code, signal) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${name} failed (${code ?? signal})`)); });
});
try {
  if (releaseMode) {
    await access("apps/web/node_modules/.bin/vite", constants.X_OK);
    const keys = generateKeyPairSync("ed25519");
    const privateKeyFile = join(root, "release-signing.pem");
    const publicKeyFile = join(root, "release-public.pem");
    await writeFile(privateKeyFile, keys.privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    await writeFile(publicKeyFile, keys.publicKey.export({ type: "spki", format: "pem" }), { mode: 0o600 });
    await run("signed-public-release", "sh", ["scripts/build_release.sh"], {
      AD_RELEASE_PROFILE: "public",
      AD_NODE_RUNTIME: process.execPath,
      AD_RELEASE_SIGNING_KEY: privateKeyFile,
      AD_RELEASE_PUBLIC_KEY: publicKeyFile,
      AD_RELEASE_SOURCE_DATE_EPOCH: "0",
    });
  }
  for (const [name, command, args] of commands) await run(name, command, args);
  await access("apps/web/src/generated/ad_crypto_bg.wasm", constants.R_OK);
  const artifact = {
    format: "another-dimension-p3-acceptance",
    status: "passed",
    mode: releaseMode ? "release" : "focused",
    seed,
    policy: { timeoutMs, maxOldSpaceMb, workers: 1, artifact: "redacted-temp-only" },
    checks: [ ...(releaseMode ? ["signed-public-release"] : []), ...commands.map(([name]) => name) ],
    wasmFreshness: "committed-module-present",
  };
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ["passphrase", "plaintext", "capability", "invite", "envelope", "127.0.0.1:"]) {
    if (serialized.toLowerCase().includes(forbidden)) throw new Error(`acceptance artifact contains forbidden field: ${forbidden}`);
  }
  await writeFile(join(root, "acceptance.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`P3 automated acceptance passed; artifact: ${join(root, "acceptance.json")}`);
} finally {
  // Keep the artifact for inspection; it is in the OS temp directory, never in the repository.
}

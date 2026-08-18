#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { generateKeyPairSync } from "node:crypto";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = join(tmpdir(), `another-dimension-acceptance-${process.pid}`);
const releaseMode = process.argv.includes("--release");
const seed = process.env.AD_ACCEPTANCE_SEED || "another-dimension-p3-fixed-seed-v1";
const timeoutMs = 30_000;
const maxOldSpaceMb = 256;
const commands = [
  ["server", process.execPath, ["--test", "apps/server/server.test.mjs"]],
  ["web", "npm", ["--prefix", "apps/web", "test", "--workspaces=false"]],
  ["relay-smoke", process.execPath, ["scripts/smoke_user_owned_servers.mjs"]],
  ["release-local-only-acceptance", process.execPath, ["scripts/acceptance_release_local_only.mjs"]],
  ["release-tests", process.execPath, ["--test", "scripts/release_manifest.test.mjs"]],
  ["transport-boundary", process.execPath, ["scripts/verify_transport_boundary.mjs"]],
  ["web-exposure", process.execPath, ["scripts/verify_web_exposure.mjs"]],
  ["security-requirements", process.execPath, ["scripts/verify_security_requirements.mjs"]],
  ["claim-scan", process.execPath, ["scripts/verify_docs_claims.mjs"]],
];
let activeChild;
let childCleanupPromise;
let rootCleanupPromise;
let signalShutdownPromise;

function cleanupRoot() {
  rootCleanupPromise ??= rm(root, { recursive: true, force: true });
  return rootCleanupPromise;
}

function stopChild(signal) {
  if (childCleanupPromise) return childCleanupPromise;
  childCleanupPromise = (async () => {
    const child = activeChild;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    try { child.kill(signal); } catch (error) { if (error.code !== "ESRCH") throw error; }
    await new Promise((resolve) => child.once("close", resolve));
  })();
  return childCleanupPromise;
}

function handleSignal(signal) {
  if (signalShutdownPromise) return;
  signalShutdownPromise = (async () => {
    try {
      await stopChild(signal);
      await cleanupRoot();
    } catch (error) {
      console.error(`P3 cleanup failed during ${signal}:`, error);
    } finally {
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
  })();
}

process.once("SIGINT", () => handleSignal("SIGINT"));
process.once("SIGTERM", () => handleSignal("SIGTERM"));

const run = (name, command, args, extraEnv = {}) => new Promise((resolve, reject) => {
  const child = activeChild = spawn(command, args, {
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
  child.on("exit", (code, signal) => {
    clearTimeout(timer);
    activeChild = undefined;
    code === 0 ? resolve() : reject(new Error(`${name} failed (${code ?? signal})`));
  });
});
try {
  await mkdir(root, { recursive: true });
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
  const artifact = {
    format: "another-dimension-p3-acceptance",
    status: "passed",
    mode: releaseMode ? "release" : "focused",
    seed,
    policy: { timeoutMs, maxOldSpaceMb, workers: 1, artifact: "redacted-temp-only" },
    checks: [ ...(releaseMode ? ["signed-public-release"] : []), ...commands.map(([name]) => name) ],
    browserCryptoBoundary: "absent-daemon-owned-crypto-only",
  };
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ["passphrase", "plaintext", "capability", "invite", "envelope", "127.0.0.1:"]) {
    if (serialized.toLowerCase().includes(forbidden)) throw new Error(`acceptance artifact contains forbidden field: ${forbidden}`);
  }
  await writeFile(join(root, "acceptance.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`P3 automated acceptance passed; artifact: ${join(root, "acceptance.json")}`);
} finally {
  await stopChild("SIGTERM");
  await cleanupRoot();
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { writeManifest } from "./release_manifest.mjs";
import { verifyInstallState } from "./verify_install_state.mjs";
import { createTrustManifest } from "./verify_release_trust.mjs";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = await mkdtemp(join(tmpdir(), "another-dimension-release-acceptance-"));
const archive = join(root, "archive");
const archive2 = join(root, "archive-2");
const install = join(root, "install");
const data = join(root, "data");
const noNodeEnvironment = { env: { ...process.env, PATH: "/usr/bin:/bin" } };
const activeChildren = new Set();
let childCleanupPromise;
let rootCleanupPromise;
let signalShutdownPromise;

function trackChild(child) {
  activeChildren.add(child);
  child.once("close", () => activeChildren.delete(child));
  return child;
}

async function waitForChildClose(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(settle, timeoutMs);
    child.once("close", settle);
    child.once("error", settle);
  });
}

function stopChildren(signal) {
  if (childCleanupPromise) return childCleanupPromise;
  childCleanupPromise = (async () => {
    const children = [...activeChildren];
    for (const child of children) {
      if (child.exitCode !== null || child.signalCode !== null) continue;
      try { child.kill(signal); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    await Promise.all(children.map((child) => waitForChildClose(child)));
    for (const child of children) {
      if (child.exitCode !== null || child.signalCode !== null) continue;
      try { child.kill("SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    await Promise.all(children.map((child) => waitForChildClose(child, 1_000)));
  })();
  return childCleanupPromise;
}

function cleanupRoot() {
  rootCleanupPromise ??= rm(root, { recursive: true, force: true });
  return rootCleanupPromise;
}

function handleSignal(signal) {
  if (signalShutdownPromise) return;
  signalShutdownPromise = (async () => {
    try {
      try {
        await stopChildren(signal);
      } catch (error) {
        console.error(`acceptance child cleanup failed during ${signal}:`, error);
      }
    } finally {
      try {
        await cleanupRoot();
      } catch (error) {
        console.error(`acceptance root cleanup failed during ${signal}:`, error);
      }
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
  })();
}

process.once("SIGINT", () => handleSignal("SIGINT"));
process.once("SIGTERM", () => handleSignal("SIGTERM"));

try {
const keys = generateKeyPairSync("ed25519");
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" });
const publicKey = keys.publicKey.export({ type: "spki", format: "pem" });
const publicKeyFile = join(root, "release-public.pem");
const bootstrap = generateKeyPairSync("ed25519");
const bootstrapPublicKeyFile = join(root, "trust-bootstrap-public.pem");
const trustManifestFile = join(root, "release-trust.json");
const reviewer = generateKeyPairSync("ed25519");
const reviewerPublicKeyFile = join(root, "reviewer-public.pem");
const reviewSignoffFile = join(root, "review-signoff.json");
const reviewBundle = join(root, "review-bundle");

function reviewerKeyId(publicKey) {
  return createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex").slice(0, 32);
}
function canonicalReview(value) { return JSON.stringify({ ...value, signature: null }); }

async function copy(relativePath) {
  const source = join(projectDir, relativePath);
  const destination = join(archive, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = trackChild(spawn(command, args, { cwd: projectDir, stdio: "pipe", ...options }));
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

async function runWithInput(command, args, input, options = {}) {
  const child = trackChild(spawn(command, args, { cwd: projectDir, stdio: ["pipe", "pipe", "pipe"], ...options }));
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.stdin.end(input);
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

await writeFile(publicKeyFile, publicKey, { mode: 0o600 });
await writeFile(bootstrapPublicKeyFile, bootstrap.publicKey.export({ type: "spki", format: "pem" }), { mode: 0o600 });
await writeFile(reviewerPublicKeyFile, reviewer.publicKey.export({ type: "spki", format: "pem" }), { mode: 0o600 });
const reviewBase = {
  format: "another-dimension-independent-review-signoff", version: 1, status: "signed", independentReviewer: true,
  sourceRevision: "0123456789abcdef0123456789abcdef01234567", reviewedAt: "2026-08-08T00:00:00Z",
  reviewer: { organization: "fixture-review-organization", identityCheck: "external-record-fixture" },
  scopeCovered: ["protocol", "browser", "storage", "relay", "release", "transport"],
  scopeExcluded: ["compromised-device protection"], decision: "experimental-only", findings: [], residualRisk: ["fixture only"], signature: null,
};
const signedReview = { ...reviewBase, signature: { algorithm: "Ed25519", keyId: reviewerKeyId(reviewer.publicKey), value: sign(null, Buffer.from(canonicalReview(reviewBase)), reviewer.privateKey).toString("base64") } };
await writeFile(reviewSignoffFile, JSON.stringify(signedReview, null, 2) + "\n", { mode: 0o600 });
await mkdir(join(reviewBundle, "source"), { recursive: true });
await mkdir(join(reviewBundle, "source/apps/daemon/src"), { recursive: true });
await mkdir(join(reviewBundle, "review/reference"), { recursive: true });
await mkdir(join(reviewBundle, "evidence"), { recursive: true });
const fixtureSource = "x\n";
const fixtureSourceHash = createHash("sha256").update(fixtureSource).digest("hex");
const fixtureReview = "fixture review template\n";
const fixtureReviewHash = createHash("sha256").update(fixtureReview).digest("hex");
await writeFile(join(reviewBundle, "source/apps/daemon/src/lib.rs"), fixtureSource);
await writeFile(join(reviewBundle, "review/reference/SECURITY_REVIEW_RESULT_TEMPLATE.md"), fixtureReview);
await writeFile(join(reviewBundle, "evidence/STATUS.json"), JSON.stringify({ status: "not-provided" }) + "\n");
await writeFile(join(reviewBundle, "REVIEW-MANIFEST.json"), JSON.stringify({ format: "another-dimension-security-review-bundle", version: 1, sourceRevision: reviewBase.sourceRevision, contents: { sourceFiles: [{ path: "apps/daemon/src/lib.rs", sha256: fixtureSourceHash, bytes: Buffer.byteLength(fixtureSource) }], reviewDocuments: ["reference/SECURITY_REVIEW_RESULT_TEMPLATE.md"], reviewFiles: [{ path: "reference/SECURITY_REVIEW_RESULT_TEMPLATE.md", sha256: fixtureReviewHash, bytes: Buffer.byteLength(fixtureReview) }], evidenceStatus: "not-provided" }, claims: { independentReview: "not-provided", productionReady: false, highRiskAllowed: false } }) + "\n", { mode: 0o600 });
const reviewArgs = ["--review-bundle", reviewBundle, "--review-signoff", reviewSignoffFile, "--reviewer-public-key", reviewerPublicKeyFile];
await Promise.all([
  copy("README.md"),
  copy("README.ko.md"),
  copy("SECURITY.md"),
  copy("SUPPORT.md"),
  copy("reference/PRODUCT_BOUNDARY.md"),
  copy("reference/product_boundary.json"),
  copy("reference/SUPPORT_MATRIX.json"),
  copy("apps/web/dist"),
  copy("apps/server/server.mjs"),
  copy("apps/server/routes.mjs"),
  copy("apps/server/http.mjs"),
  copy("apps/server/errors.mjs"),
  copy("apps/server/invite-code.mjs"),
  copy("apps/server/storage.mjs"),
  copy("apps/server/package.json"),
  copy("apps/server/package-lock.json"),
  copy("scripts/verify_public_release_gate.mjs"),
  copy("scripts/verify_security_review_signoff.mjs"),
  copy("scripts/verify_security_review_handoff.mjs"),
  copy("scripts/verify_release_trust.mjs"),
  copy("scripts/product_boundary.mjs"),
  copy("scripts/verify_web_artifact.mjs"),
  copy("scripts/release_manifest.mjs"),
  copy("scripts/install_local_server.sh"),
  copy("scripts/installed_launcher.sh"),
  copy("scripts/relay_backup.mjs"),
  copy("scripts/update_local_server.sh"),
  copy("scripts/verify_install_state.mjs"),
]);
const serverDependencies = await run("npm", ["ci", "--prefix", join(archive, "apps/server"), "--omit=dev", "--no-audit", "--no-fund", "--workspaces=false"]);
assert.equal(serverDependencies.code, 0, serverDependencies.output);
await rm(join(archive, "apps/server/node_modules/.bin"), { recursive: true, force: true });
const daemonBinary = process.env.AD_DAEMON_BINARY || join(projectDir, ".build-cache/cargo-target/debug/another-dimension-daemon");
await mkdir(join(archive, "bin"), { recursive: true });
await cp(daemonBinary, join(archive, "bin/another-dimension-daemon"));
await chmod(join(archive, "bin/another-dimension-daemon"), 0o700);
await mkdir(join(archive, "runtime"), { recursive: true });
await cp(process.execPath, join(archive, "runtime/node"));
await chmod(join(archive, "runtime/node"), 0o700);
await writeFile(join(archive, "SBOM.cyclonedx.json"), JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.5", components: [] }) + "\n");
await writeFile(join(archive, "RELEASE-PROVENANCE.json"), JSON.stringify({ format: "acceptance-fixture", sourceCommit: reviewBase.sourceRevision }) + "\n");
await writeManifest(archive, { version: "0.1.0", privateKey });
const trustManifest = createTrustManifest({ rootPrivateKey: bootstrap.privateKey, releaseKeys: [{ publicKey: keys.publicKey, validFromVersion: "0.1.0" }], minimumReleaseVersion: "0.1.0" });
await writeFile(trustManifestFile, `${JSON.stringify(trustManifest, null, 2)}\n`, { mode: 0o600 });

const nodeAbsent = await run("sh", ["-c", "command -v node"], noNodeEnvironment);
assert.notEqual(nodeAbsent.code, 0, "the no-Node fixture unexpectedly found node on PATH");

const missingTrust = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--destination", join(root, "missing-trust-install"), "--data-dir", join(root, "missing-trust-data")]);
assert.notEqual(missingTrust.code, 0);
assert.match(missingTrust.output, /trust-manifest/);

const gate = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs]);
assert.equal(gate.code, 0, gate.output);
assert.match(gate.output, /public release gate passed/);
const missingReview = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile]);
assert.notEqual(missingReview.code, 0);
assert.match(missingReview.output, /independent security review/);
const mismatchedBase = { ...reviewBase, sourceRevision: "f".repeat(40) };
const mismatchedReview = { ...mismatchedBase, signature: { algorithm: "Ed25519", keyId: reviewerKeyId(reviewer.publicKey), value: sign(null, Buffer.from(canonicalReview(mismatchedBase)), reviewer.privateKey).toString("base64") } };
await writeFile(reviewSignoffFile, JSON.stringify(mismatchedReview));
const mismatchedReviewResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs]);
assert.notEqual(mismatchedReviewResult.code, 0);
assert.match(mismatchedReviewResult.output, /source revision does not match/);
await writeFile(reviewSignoffFile, JSON.stringify(signedReview, null, 2) + "\n");
const tamperedTrust = structuredClone(trustManifest);
tamperedTrust.policy.minimumReleaseVersion = "9.0.0";
await writeFile(trustManifestFile, JSON.stringify(tamperedTrust));
const tamperedTrustResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs]);
assert.notEqual(tamperedTrustResult.code, 0);
assert.match(tamperedTrustResult.output, /invalid trust manifest signature/);
await writeFile(trustManifestFile, JSON.stringify(trustManifest));

const installResult = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs, "--destination", install, "--data-dir", data], noNodeEnvironment);
assert.equal(installResult.code, 0, installResult.output);
const config = JSON.parse(await readFile(join(install, "server-config.json"), "utf8"));
assert.equal(config.bindHost, "127.0.0.1");
assert.equal(config.serveStatic, false);
assert.equal(config.distDir, join(install, "apps/web/dist"));
assert.equal(config.daemonDataDir, join(data, "daemon"));
assert.equal(config.relayDataDir, join(data, "relay"));
assert.equal((await stat(join(install, "runtime-node"))).mode & 0o777, 0o700);
assert.equal((await stat(join(install, "server-config.json"))).mode & 0o777, 0o600);
assert.equal((await stat(data)).mode & 0o777, 0o700);
assert.equal((await stat(join(install, "bin/another-dimension-daemon"))).mode & 0o777, 0o700);
assert.equal((await run(join(install, "another-dimension"), ["doctor"], noNodeEnvironment)).code, 0);
const initialStatus = await run(join(install, "another-dimension"), ["status"], noNodeEnvironment);
assert.equal(initialStatus.code, 0);
assert.match(initialStatus.output, /not initialized|stopped/i);
const releaseRelayPort = 19422;
const releaseDaemonPort = 19420;
const releaseConfig = join(install, "release-acceptance-server-config.json");
await writeFile(releaseConfig, JSON.stringify({
  bindHost: "127.0.0.1",
  port: releaseRelayPort,
  dataDir: join(data, "relay"),
  distDir: join(install, "apps/web/dist"),
  serveStatic: true,
}) + "\n", { mode: 0o600 });
function startReady(command, args, pattern) {
  const child = trackChild(spawn(command, args, { cwd: install, stdio: ["ignore", "pipe", "pipe"] }));
  let output = "";
  return new Promise((resolveStart, rejectStart) => {
    const timer = setTimeout(() => rejectStart(new Error(`release process did not start: ${output}`)), 8000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (!pattern.test(output)) return;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      resolveStart(child);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", rejectStart);
    child.once("exit", (code, signal) => {
      if (code !== null || signal !== null) rejectStart(new Error(`release process exited: ${code}/${signal}\n${output}`));
    });
  });
}
const releaseRelay = await startReady(join(install, "runtime-node"), [join(install, "apps/server/server.mjs"), "--config", releaseConfig], /local server listening/);
const releaseInit = trackChild(spawn(join(install, "bin/another-dimension-daemon"), ["init", "--display-name", "Release", "--data-dir", join(data, "daemon")], { cwd: install, stdio: ["ignore", "pipe", "pipe"] }));
let releaseInitOutput = "";
releaseInit.stdout.on("data", (chunk) => { releaseInitOutput += chunk.toString(); });
await new Promise((resolveInit, rejectInit) => {
  let output = "";
  releaseInit.stderr.on("data", (chunk) => { output += chunk.toString(); });
  releaseInit.once("exit", (code) => code === 0 ? resolveInit() : rejectInit(new Error(`release daemon init failed: ${output}`)));
});
const releasePassphrase = releaseInitOutput.match(/^passphrase: ([0-9a-f]{64})$/m)?.[1];
assert.match(releasePassphrase || "", /^[0-9a-f]{64}$/);
const releaseDaemon = trackChild(spawn(join(install, "bin/another-dimension-daemon"), [
  "serve", "--data-dir", join(data, "daemon"), "--port", String(releaseDaemonPort),
  "--relay-origin", `http://127.0.0.1:${releaseRelayPort}`,
  "--inbox-url", `http://127.0.0.1:${releaseRelayPort}/api/v1/inbox/release-acceptance-capability`,
  "--ui-dir", join(install, "apps/web/dist"),
], { cwd: install, stdio: ["pipe", "ignore", "pipe"] }));
releaseDaemon.stdin.end(`${releasePassphrase}\n`);
await new Promise((resolveStart, rejectStart) => {
  let output = "";
  const timer = setTimeout(() => rejectStart(new Error(`release daemon did not start: ${output}`)), 8000);
  releaseDaemon.stderr.on("data", (chunk) => {
    output += chunk.toString();
    if (!/open once: http:\/\//.test(output)) return;
    clearTimeout(timer);
    resolveStart();
  });
  releaseDaemon.once("exit", (code, signal) => {
    if (code !== null || signal !== null) rejectStart(new Error(`release daemon exited: ${code}/${signal}\n${output}`));
  });
});
const relayHealth = await fetch(`http://127.0.0.1:${releaseRelayPort}/api/v1/health`);
assert.equal(relayHealth.status, 200);
const daemonPage = await fetch(`http://127.0.0.1:${releaseDaemonPort}/`);
assert.equal(daemonPage.status, 200);
assert.match(await daemonPage.text(), /Another Dimension/);
releaseDaemon.kill("SIGTERM");
releaseRelay.kill("SIGTERM");
await Promise.all([
  new Promise((resolveExit) => releaseDaemon.once("exit", resolveExit)),
  new Promise((resolveExit) => releaseRelay.once("exit", resolveExit)),
]);
const relayBackupFile = join(root, "relay.adrelaybackup");
const backupResult = await runWithInput(join(install, "another-dimension"), ["relay-backup", relayBackupFile], "relay-acceptance-passphrase\n", noNodeEnvironment);
assert.equal(backupResult.code, 0, backupResult.output);
const relayDataBeforeRestore = join(root, "relay-before-restore");
await rename(join(data, "relay"), relayDataBeforeRestore);
const wrongRestore = await runWithInput(join(install, "another-dimension"), ["relay-restore", relayBackupFile], "wrong-passphrase\n", noNodeEnvironment);
assert.notEqual(wrongRestore.code, 0);
assert.equal((await stat(relayDataBeforeRestore)).isDirectory(), true);
assert.equal((await stat(join(data, "relay")).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error))), null);
const restoreResult = await runWithInput(join(install, "another-dimension"), ["relay-restore", relayBackupFile], "relay-acceptance-passphrase\n", noNodeEnvironment);
assert.equal(restoreResult.code, 0, restoreResult.output);
assert.equal((await stat(join(data, "relay", "relay.sqlite"))).isFile(), true);
const archiveFlow = await run(join(install, "runtime-node"), [join(projectDir, "scripts/acceptance_daemon_repair.mjs")], {
  env: {
    ...process.env,
    AD_DAEMON_BINARY: join(install, "bin/another-dimension-daemon"),
    AD_RELAY_MODULE: join(install, "apps/server/server.mjs"),
  },
});
assert.equal(archiveFlow.code, 0, archiveFlow.output);
assert.match(archiveFlow.output, /daemon E2E acceptance passed/);
const installedServerFile = join(install, "apps/server/server.mjs");
const originalServerFile = await readFile(installedServerFile, "utf8");
await writeFile(installedServerFile, `${originalServerFile}\n// tampered fixture\n`);
await assert.rejects(() => verifyInstallState(install), /Installed file hash mismatch/);
await writeFile(installedServerFile, originalServerFile);
await verifyInstallState(install);
assert.equal((await run(join(install, "another-dimension"), ["doctor"], noNodeEnvironment)).code, 0);
await writeFile(join(data, "retained-sentinel"), "keep-me\n", { mode: 0o600 });
await writeFile(join(install, "relay.pid"), `${process.pid}\n`, { mode: 0o600 });
const foreignPid = await run(join(install, "another-dimension"), ["relay-start"], noNodeEnvironment);
assert.notEqual(foreignPid.code, 0);
await writeFile(join(install, "relay.pid"), "999999\n", { mode: 0o600 });
const symlinkDestination = join(root, "install-symlink");
await symlink(install, symlinkDestination);
const symlinkInstall = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs, "--destination", symlinkDestination, "--data-dir", join(root, "data-symlink")], noNodeEnvironment);
assert.notEqual(symlinkInstall.code, 0);
await cp(archive, archive2, { recursive: true });
await writeFile(join(archive2, "README.md"), "updated release fixture\n");
await writeManifest(archive2, { version: "0.2.0", privateKey });
const update = await run(join(install, "another-dimension"), ["update", "--archive", archive2, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, ...reviewArgs, "--stop"], noNodeEnvironment);
assert.equal(update.code, 0, update.output);
const updatedMarker = JSON.parse(await readFile(join(install, ".another-dimension-install.json"), "utf8"));
assert.equal(updatedMarker.releaseVersion, "0.2.0");
assert.equal((await readFile(join(data, "retained-sentinel"), "utf8")), "keep-me\n");
const rollback = await run(join(install, "another-dimension"), ["rollback"], noNodeEnvironment);
assert.equal(rollback.code, 0, rollback.output);
const rolledBackMarker = JSON.parse(await readFile(join(install, ".another-dimension-install.json"), "utf8"));
assert.equal(rolledBackMarker.releaseVersion, "0.1.0");
assert.equal((await readFile(join(data, "retained-sentinel"), "utf8")), "keep-me\n");

const wrongKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
const wrongKeyFile = join(root, "wrong-public.pem");
await writeFile(wrongKeyFile, wrongKey, { mode: 0o600 });
const wrongKeyResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", wrongKeyFile, ...reviewArgs]);
assert.notEqual(wrongKeyResult.code, 0);
assert.match(wrongKeyResult.output, /fingerprint mismatch/);

const oldVersionResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--min-version", "0.2.0", ...reviewArgs]);
assert.notEqual(oldVersionResult.code, 0);
assert.match(oldVersionResult.output, /older than the minimum/);

const keyId = JSON.parse(await readFile(join(archive, "release-manifest.json"), "utf8")).signature.keyId;
const revokedResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--revoked-key-id", keyId, ...reviewArgs]);
assert.notEqual(revokedResult.code, 0);
assert.match(revokedResult.output, /signing key is revoked/);

const manifestPath = join(archive, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.files.find((file) => file.path === "README.md").sha256 = "0".repeat(64);
await writeFile(manifestPath, JSON.stringify(manifest));
const tamperedResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, ...reviewArgs]);
assert.notEqual(tamperedResult.code, 0);
assert.match(tamperedResult.output, /release hash mismatch/);

console.log("release local-only acceptance passed: signed gate -> no-Node install contract -> permission checks -> key/version/revocation/tamper rejection");
} finally {
  try {
    await stopChildren("SIGTERM");
  } finally {
    await cleanupRoot();
  }
}

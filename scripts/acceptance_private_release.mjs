#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { writeManifest } from "./release_manifest.mjs";
import { createTrustManifest } from "./verify_release_trust.mjs";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = await mkdtemp(join(tmpdir(), "another-dimension-private-release-"));
const archive = join(root, "archive");
const archive2 = join(root, "archive-2");
const install = join(root, "install");
const data = join(root, "data");
const noNodeEnvironment = { env: { ...process.env, PATH: "/usr/bin:/bin" } };
const activeChildren = new Set();
let childCleanupPromise;
let rootCleanupPromise;

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

try {
  const keys = generateKeyPairSync("ed25519");
  const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" });
  const publicKey = keys.publicKey.export({ type: "spki", format: "pem" });
  const publicKeyFile = join(root, "release-public.pem");
  const bootstrap = generateKeyPairSync("ed25519");
  const bootstrapPublicKeyFile = join(root, "trust-bootstrap-public.pem");
  const trustManifestFile = join(root, "release-trust.json");

  await writeFile(publicKeyFile, publicKey, { mode: 0o600 });
  await writeFile(bootstrapPublicKeyFile, bootstrap.publicKey.export({ type: "spki", format: "pem" }), { mode: 0o600 });

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

  await Promise.all([
    copy("README.md"),
    copy("README.ko.md"),
    copy("SECURITY.md"),
    copy("SUPPORT.md"),
    copy("reference/PRODUCT_BOUNDARY.md"),
    copy("reference/product_boundary.json"),
    copy("reference/SUPPORT_MATRIX.json"),
    copy("reference/evidence/macos-arm64-node20-local-gate.json"),
    copy("reference/evidence/macos-arm64-chromium-production-ui.json"),
    copy("reference/RELAY_OPERATIONS.md"),
    copy("apps/web/dist"),
    copy("apps/server/server.mjs"),
    copy("apps/server/routes.mjs"),
    copy("apps/server/http.mjs"),
    copy("apps/server/errors.mjs"),
    copy("apps/server/invite-code.mjs"),
    copy("apps/server/storage.mjs"),
    copy("apps/server/package.json"),
    copy("apps/server/package-lock.json"),
    copy("scripts/verify_private_release_gate.mjs"),
    copy("scripts/verify_archive_hygiene.mjs"),
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
  await writeFile(join(archive, "RELEASE-PROVENANCE.json"), JSON.stringify({ format: "acceptance-fixture", sourceCommit: "0123456789abcdef0123456789abcdef01234567" }) + "\n");
  await writeManifest(archive, { version: "0.1.0", privateKey });
  const trustManifest = createTrustManifest({ rootPrivateKey: bootstrap.privateKey, releaseKeys: [{ publicKey: keys.publicKey, validFromVersion: "0.1.0" }], minimumReleaseVersion: "0.1.0" });
  await writeFile(trustManifestFile, `${JSON.stringify(trustManifest, null, 2)}\n`, { mode: 0o600 });

  // Archive hygiene: clean archive passes; a leaked secret or over-broad mode fails.
  const hygiene = await run(process.execPath, [join(projectDir, "scripts/verify_archive_hygiene.mjs"), archive]);
  assert.equal(hygiene.code, 0, hygiene.output);
  const leakyArchive = join(root, "leaky-archive");
  await cp(archive, leakyArchive, { recursive: true });
  await writeFile(join(leakyArchive, "leak.pem"), "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n", { mode: 0o600 });
  const leakyHygiene = await run(process.execPath, [join(projectDir, "scripts/verify_archive_hygiene.mjs"), leakyArchive]);
  assert.notEqual(leakyHygiene.code, 0);
  assert.match(leakyHygiene.output, /private key material/);
  const broadArchive = join(root, "broad-archive");
  await cp(archive, broadArchive, { recursive: true });
  await chmod(join(broadArchive, "README.md"), 0o666);
  const broadHygiene = await run(process.execPath, [join(projectDir, "scripts/verify_archive_hygiene.mjs"), broadArchive]);
  assert.notEqual(broadHygiene.code, 0);
  assert.match(broadHygiene.output, /over-broad permissions/);

  // Private gate: signed archive + trust manifest only (no review bundle).
  const gate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile]);
  assert.equal(gate.code, 0, gate.output);
  assert.match(gate.output, /private release gate passed/);
  assert.match(gate.output, /trust manifest authorized/);
  const missingTrustGate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", publicKeyFile]);
  assert.notEqual(missingTrustGate.code, 0);
  assert.match(missingTrustGate.output, /trust manifest/);

  // Install without review bundle succeeds and prints the signing key id.
  const installResult = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, "--destination", install, "--data-dir", data], noNodeEnvironment);
  assert.equal(installResult.code, 0, installResult.output);
  const keyId = JSON.parse(await readFile(join(archive, "release-manifest.json"), "utf8")).signature.keyId;
  assert.match(installResult.output, new RegExp(`release signing key ${keyId}`));
  const config = JSON.parse(await readFile(join(install, "server-config.json"), "utf8"));
  assert.equal(config.bindHost, "127.0.0.1");
  assert.equal(config.serveStatic, false);
  assert.equal((await stat(join(install, "runtime-node"))).mode & 0o777, 0o700);
  assert.equal((await stat(join(install, "server-config.json"))).mode & 0o777, 0o600);
  assert.equal((await stat(data)).mode & 0o777, 0o700);
  assert.equal((await run(join(install, "another-dimension"), ["doctor"], noNodeEnvironment)).code, 0);

  // Wrong signing key is rejected before any install work.
  const wrongKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
  const wrongKeyFile = join(root, "wrong-public.pem");
  await writeFile(wrongKeyFile, wrongKey, { mode: 0o600 });
  const wrongKeyGate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", wrongKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile]);
  assert.notEqual(wrongKeyGate.code, 0);
  assert.match(wrongKeyGate.output, /fingerprint mismatch/);

  // Older-than-minimum release is rejected.
  const oldVersionGate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, "--min-version", "0.2.0"]);
  assert.notEqual(oldVersionGate.code, 0);
  assert.match(oldVersionGate.output, /older than the minimum/);

  // A revoked signing key is rejected through the trust manifest.
  const revokedTrust = createTrustManifest({ rootPrivateKey: bootstrap.privateKey, releaseKeys: [{ publicKey: keys.publicKey, validFromVersion: "0.1.0" }], minimumReleaseVersion: "0.1.0", revokedKeyIds: [keyId] });
  const revokedTrustFile = join(root, "revoked-trust.json");
  await writeFile(revokedTrustFile, `${JSON.stringify(revokedTrust, null, 2)}\n`, { mode: 0o600 });
  const revokedGate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", revokedTrustFile, "--trust-manifest-key", bootstrapPublicKeyFile]);
  assert.notEqual(revokedGate.code, 0);
  assert.match(revokedGate.output, /revoked/);

  // Tampered archive hash is detected and the installer refuses.
  const manifestPath = join(archive, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files.find((file) => file.path === "README.md").sha256 = "0".repeat(64);
  await writeFile(manifestPath, JSON.stringify(manifest));
  const tamperedGate = await run(process.execPath, [join(archive, "scripts/verify_private_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile]);
  assert.notEqual(tamperedGate.code, 0);
  assert.match(tamperedGate.output, /release hash mismatch/);
  const tamperedInstall = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, "--destination", join(root, "refused-install"), "--data-dir", join(root, "refused-data")], noNodeEnvironment);
  assert.notEqual(tamperedInstall.code, 0);
  await writeManifest(archive, { version: "0.1.0", privateKey });

  // Private update (no review bundle) succeeds, data is preserved, failed update preserves the current install, rollback works.
  await writeFile(join(data, "retained-sentinel"), "keep-me\n", { mode: 0o600 });
  await cp(archive, archive2, { recursive: true });
  await writeFile(join(archive2, "README.md"), "updated private release fixture\n");
  await writeManifest(archive2, { version: "0.2.0", privateKey });
  const update = await run(join(install, "another-dimension"), ["update", "--archive", archive2, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, "--stop"], noNodeEnvironment);
  assert.equal(update.code, 0, update.output);
  assert.equal(JSON.parse(await readFile(join(install, ".another-dimension-install.json"), "utf8")).releaseVersion, "0.2.0");
  assert.equal(await readFile(join(data, "retained-sentinel"), "utf8"), "keep-me\n");

  const rollback = await run(join(install, "another-dimension"), ["rollback"], noNodeEnvironment);
  assert.equal(rollback.code, 0, rollback.output);
  assert.equal(JSON.parse(await readFile(join(install, ".another-dimension-install.json"), "utf8")).releaseVersion, "0.1.0");
  assert.equal(await readFile(join(data, "retained-sentinel"), "utf8"), "keep-me\n");

  // A failed update (gate rejects the archive) preserves the current install and data.
  const brokenUpdateArchive = join(root, "broken-update");
  await cp(archive2, brokenUpdateArchive, { recursive: true });
  await writeFile(join(brokenUpdateArchive, "apps/server/server.mjs"), "tampered\n");
  const failedUpdate = await run(join(install, "another-dimension"), ["update", "--archive", brokenUpdateArchive, "--public-key", publicKeyFile, "--trust-manifest", trustManifestFile, "--trust-manifest-key", bootstrapPublicKeyFile, "--stop"], noNodeEnvironment);
  assert.notEqual(failedUpdate.code, 0);
  assert.equal(JSON.parse(await readFile(join(install, ".another-dimension-install.json"), "utf8")).releaseVersion, "0.1.0");
  assert.equal(await readFile(join(data, "retained-sentinel"), "utf8"), "keep-me\n");

  // Uninstall removes only the code installation and prints the preserved data scope.
  const uninstall = await run(join(install, "another-dimension"), ["uninstall"], noNodeEnvironment);
  assert.equal(uninstall.code, 0, uninstall.output);
  assert.match(uninstall.output, /삭제하지 않습니다/);
  await assert.rejects(() => stat(join(install, "another-dimension")), { code: "ENOENT" });
  assert.equal(await readFile(join(data, "retained-sentinel"), "utf8"), "keep-me\n");

  const finalManifest = JSON.parse(await readFile(join(archive, "release-manifest.json"), "utf8"));
  const archiveHash = createHash("sha256")
    .update(JSON.stringify(finalManifest.files.map((file) => [file.path, file.sha256]).sort()))
    .digest("hex");
  console.log(`archive sha256: ${archiveHash}`);
  console.log("private release acceptance passed: signed gate without review bundle -> install -> tamper/wrong-key/min-version/revoked rejection -> private update/failed-update/rollback -> uninstall scope");
} finally {
  try {
    await stopChildren("SIGTERM");
  } finally {
    await cleanupRoot();
  }
}

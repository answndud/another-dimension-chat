#!/usr/bin/env node
// Build and inspect one real private archive produced by build_release.sh.
// This is intentionally a release-candidate check, not a normal development loop.
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createTrustManifest } from "./verify_release_trust.mjs";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = await mkdtemp(join(tmpdir(), "another-dimension-release-builder-"));
const releaseRoot = join(root, "public-release");
const extractedRoot = join(root, "extracted");
const installRoot = join(root, "installed");
const dataRoot = join(root, "data");
const version = "0.1.0";
const sourceRevision = process.env.AD_RELEASE_SOURCE_COMMIT || (await run("git", ["rev-parse", "HEAD"], { cwd: projectDir })).stdout.trim();
const daemonBinary = process.env.AD_DAEMON_BINARY || join(projectDir, ".build-cache/cargo-target/debug/another-dimension-daemon");

async function run(command, args, options = {}) {
  return await new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolveRun({ code, signal, stdout, stderr, output: `${stdout}${stderr}` }));
  });
}

async function writePem(path, value) {
  await writeFile(path, value, { mode: 0o600 });
}

try {
  await access(daemonBinary);
  const release = generateKeyPairSync("ed25519");
  const bootstrap = generateKeyPairSync("ed25519");
  const releasePrivatePath = join(root, "release-signing-private.pem");
  const releasePublicPath = join(root, "release-public.pem");
  const bootstrapPublicPath = join(root, "trust-bootstrap-public.pem");
  const trustManifestPath = join(root, "release-trust.json");
  await writePem(releasePrivatePath, release.privateKey.export({ type: "pkcs8", format: "pem" }));
  await writePem(releasePublicPath, release.publicKey.export({ type: "spki", format: "pem" }));
  await writePem(bootstrapPublicPath, bootstrap.publicKey.export({ type: "spki", format: "pem" }));
  await writeFile(trustManifestPath, `${JSON.stringify(createTrustManifest({
    rootPrivateKey: bootstrap.privateKey,
    releaseKeys: [{ publicKey: release.publicKey, validFromVersion: version }],
    minimumReleaseVersion: version,
  }), null, 2)}\n`, { mode: 0o600 });

  const build = await run("sh", ["scripts/build_release.sh"], {
    cwd: projectDir,
    env: {
      ...process.env,
      AD_RELEASE_PROFILE: "private",
      AD_RELEASE_VERSION: version,
      AD_RELEASE_ROOT: releaseRoot,
      AD_RELEASE_SIGNING_KEY: releasePrivatePath,
      AD_RELEASE_PUBLIC_KEY: releasePublicPath,
      AD_RELEASE_TRUST_MANIFEST: trustManifestPath,
      AD_RELEASE_TRUST_MANIFEST_KEY: bootstrapPublicPath,
      AD_RELEASE_SOURCE_COMMIT: sourceRevision,
      AD_RELEASE_SOURCE_DATE_EPOCH: "0",
      AD_DAEMON_BINARY: daemonBinary,
      AD_NODE_RUNTIME: process.execPath,
      CARGO_BUILD_JOBS: "2",
      CARGO_INCREMENTAL: "0",
    },
  });
  assert.equal(build.code, 0, build.output);

  const archives = (await readdir(releaseRoot)).filter((entry) => entry.endsWith(".tar.gz"));
  assert.equal(archives.length, 1, `expected one release archive, found ${archives.length}`);
  const archivePath = join(releaseRoot, archives[0]);
  const archiveHash = createHash("sha256").update(await readFile(archivePath)).digest("hex");
  await mkdir(extractedRoot);
  const extract = await run("tar", ["-xzf", archivePath, "-C", extractedRoot]);
  assert.equal(extract.code, 0, extract.output);
  const releaseDirName = (await readdir(extractedRoot, { withFileTypes: true })).find((entry) => entry.isDirectory())?.name;
  assert.ok(releaseDirName, "release archive did not contain a root directory");
  const releaseDir = join(extractedRoot, releaseDirName);

  const checks = [
    ["scripts/verify_archive_hygiene.mjs", [releaseDir]],
    ["scripts/verify_release_manifest.mjs", [releaseDir, "--require-signature", "--public-key", releasePublicPath]],
    ["scripts/verify_private_release_gate.mjs", [releaseDir, "--public-key", releasePublicPath, "--trust-manifest", trustManifestPath, "--trust-manifest-key", bootstrapPublicPath]],
  ];
  for (const [script, args] of checks) {
    const result = await run(process.execPath, [join(projectDir, script), ...args], { cwd: projectDir });
    assert.equal(result.code, 0, `${script}\n${result.output}`);
  }

  const noNodeEnvironment = { ...process.env, PATH: "/usr/bin:/bin" };
  const install = await run("sh", [join(releaseDir, "scripts/install_local_server.sh"), "--archive", releaseDir, "--public-key", releasePublicPath, "--trust-manifest", trustManifestPath, "--trust-manifest-key", bootstrapPublicPath, "--destination", installRoot, "--data-dir", dataRoot], { cwd: projectDir, env: noNodeEnvironment });
  assert.equal(install.code, 0, install.output);
  const doctor = await run(join(installRoot, "another-dimension"), ["doctor"], { cwd: installRoot, env: noNodeEnvironment });
  assert.equal(doctor.code, 0, doctor.output);
  console.log(`release archive sha256: ${archiveHash}`);
  console.log(`release archive acceptance passed: build_release.sh -> signed private archive -> hygiene/manifest/private gate -> no-Node install -> doctor (source ${sourceRevision})`);
} finally {
  await rm(root, { recursive: true, force: true });
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { writeManifest } from "./release_manifest.mjs";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = await mkdtemp(join(tmpdir(), "another-dimension-release-acceptance-"));
const archive = join(root, "archive");
const install = join(root, "install");
const data = join(root, "data");
const keys = generateKeyPairSync("ed25519");
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" });
const publicKey = keys.publicKey.export({ type: "spki", format: "pem" });
const publicKeyFile = join(root, "release-public.pem");

async function copy(relativePath) {
  const source = join(projectDir, relativePath);
  const destination = join(archive, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectDir, stdio: "pipe", ...options });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

await writeFile(publicKeyFile, publicKey, { mode: 0o600 });
await Promise.all([
  copy("README.md"),
  copy("README.ko.md"),
  copy("SECURITY.md"),
  copy("SUPPORT.md"),
  copy("reference/PRODUCT_BOUNDARY.md"),
  copy("apps/server/server.mjs"),
  copy("scripts/verify_public_release_gate.mjs"),
  copy("scripts/release_manifest.mjs"),
  copy("scripts/install_local_server.sh"),
]);
await mkdir(join(archive, "apps/web/dist"), { recursive: true });
await writeFile(join(archive, "apps/web/dist/index.html"), "<!doctype html><title>fixture</title>\n");
await mkdir(join(archive, "runtime"), { recursive: true });
await cp(process.execPath, join(archive, "runtime/node"));
await chmod(join(archive, "runtime/node"), 0o700);
await writeFile(join(archive, "SBOM.cyclonedx.json"), JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.5", components: [] }) + "\n");
await writeFile(join(archive, "RELEASE-PROVENANCE.json"), JSON.stringify({ format: "acceptance-fixture", sourceCommit: "fixture" }) + "\n");
await writeManifest(archive, { version: "0.1.0", privateKey });

const gate = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile]);
assert.equal(gate.code, 0, gate.output);
assert.match(gate.output, /public release gate passed/);

const installResult = await run("sh", [join(archive, "scripts/install_local_server.sh"), "--archive", archive, "--public-key", publicKeyFile, "--destination", install, "--data-dir", data]);
assert.equal(installResult.code, 0, installResult.output);
const config = JSON.parse(await readFile(join(install, "server-config.json"), "utf8"));
assert.equal(config.bindHost, "127.0.0.1");
assert.equal(config.serveStatic, true);
assert.equal(config.distDir, join(install, "apps/web/dist"));
assert.equal((await stat(join(install, "runtime-node"))).mode & 0o777, 0o700);
assert.equal((await stat(join(install, "server-config.json"))).mode & 0o777, 0o600);
assert.equal((await stat(data)).mode & 0o777, 0o700);

const wrongKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
const wrongKeyFile = join(root, "wrong-public.pem");
await writeFile(wrongKeyFile, wrongKey, { mode: 0o600 });
const wrongKeyResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", wrongKeyFile]);
assert.notEqual(wrongKeyResult.code, 0);
assert.match(wrongKeyResult.output, /fingerprint mismatch/);

const oldVersionResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--min-version", "0.2.0"]);
assert.notEqual(oldVersionResult.code, 0);
assert.match(oldVersionResult.output, /older than the minimum/);

const keyId = JSON.parse(await readFile(join(archive, "release-manifest.json"), "utf8")).signature.keyId;
const revokedResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile, "--revoked-key-id", keyId]);
assert.notEqual(revokedResult.code, 0);
assert.match(revokedResult.output, /signing key is revoked/);

const manifestPath = join(archive, "release-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.files.find((file) => file.path === "README.md").sha256 = "0".repeat(64);
await writeFile(manifestPath, JSON.stringify(manifest));
const tamperedResult = await run(process.execPath, [join(archive, "scripts/verify_public_release_gate.mjs"), archive, "--public-key", publicKeyFile]);
assert.notEqual(tamperedResult.code, 0);
assert.match(tamperedResult.output, /release hash mismatch/);

console.log("release local-only acceptance passed: signed gate -> no-Node install contract -> permission checks -> key/version/revocation/tamper rejection");

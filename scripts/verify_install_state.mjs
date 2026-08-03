#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "runtime-node",
  "server-config.json",
  "apps/server/server.mjs",
  "scripts/verify_install_state.mjs",
  "apps/web/dist/index.html",
  "apps/web/dist/asset-integrity.json",
  "release-manifest.json",
  ".another-dimension-install.json",
];

async function assertRegular(root, relative) {
  const file = path.join(root, relative);
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Installed path is not a regular file: ${relative}`);
  return info;
}

async function assertNoSymlinks(root, current = root) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const file = path.join(current, entry.name);
    const info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error(`Installed tree contains a symlink: ${path.relative(root, file)}`);
    if (info.isDirectory()) await assertNoSymlinks(root, file);
  }
}

function modeIs(info, expected) {
  return (info.mode & 0o777) === expected;
}

async function verifyInstalledFile(localPath, releasePath, manifestFiles) {
  const info = await lstat(localPath);
  if (info.isSymbolicLink()) throw new Error(`Installed tree contains a symlink: ${localPath}`);
  if (info.isDirectory()) {
    for (const entry of await readdir(localPath, { withFileTypes: true })) {
      await verifyInstalledFile(path.join(localPath, entry.name), path.posix.join(releasePath, entry.name), manifestFiles);
    }
    return;
  }
  if (!info.isFile()) throw new Error(`Installed path is not a regular file: ${localPath}`);
  const expected = manifestFiles.get(releasePath);
  if (!expected) throw new Error(`Installed file is not listed in the release manifest: ${releasePath}`);
  const contents = await readFile(localPath);
  const actualHash = createHash("sha256").update(contents).digest("hex");
  if (actualHash !== expected.sha256 || contents.byteLength !== expected.bytes) throw new Error(`Installed file hash mismatch: ${releasePath}`);
}

export async function verifyInstallState(rootValue) {
  const root = path.resolve(rootValue);
  await assertNoSymlinks(root);
  for (const relative of REQUIRED) await access(path.join(root, relative), constants.R_OK);
  const marker = JSON.parse(await readFile(path.join(root, ".another-dimension-install.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(root, "release-manifest.json"), "utf8"));
  if (marker.format !== "another-dimension-install" || marker.version !== 1) throw new Error("Installation marker is invalid.");
  if (!marker.releaseVersion || marker.releaseVersion !== manifest.releaseVersion) throw new Error("Installed release version does not match its manifest.");
  const manifestHash = createHash("sha256").update(await readFile(path.join(root, "release-manifest.json"))).digest("hex");
  if (manifestHash !== marker.manifestSha256) throw new Error("Installed release manifest changed after installation.");
  const manifestFiles = new Map((manifest.files || []).map((file) => [file.path, file]));
  for (const [local, release] of [["apps", "apps"], ["scripts", "scripts"]]) await verifyInstalledFile(path.join(root, local), release, manifestFiles);
  for (const file of ["README.md", "README.ko.md", "SECURITY.md", "SUPPORT.md", "RELEASE-PROVENANCE.json", "SBOM.cyclonedx.json"]) {
    await verifyInstalledFile(path.join(root, file), file, manifestFiles);
  }
  await verifyInstalledFile(path.join(root, "runtime-node"), "runtime/node", manifestFiles);
  const config = JSON.parse(await readFile(path.join(root, "server-config.json"), "utf8"));
  if (!config || typeof config.dataDir !== "string" || path.resolve(config.dataDir).startsWith(`${root}${path.sep}`)) throw new Error("Installed data directory must remain outside the code installation.");
  const runtime = await assertRegular(root, "runtime-node");
  const configInfo = await assertRegular(root, "server-config.json");
  const launcherPath = path.join(root, "another-dimension-server");
  const launcherInfo = await lstat(launcherPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (launcherInfo && (!launcherInfo.isFile() || launcherInfo.isSymbolicLink() || !modeIs(launcherInfo, 0o700))) throw new Error("Installed launcher permissions are too broad.");
  if (!modeIs(runtime, 0o700) || !modeIs(configInfo, 0o600)) throw new Error("Installed runtime or config permissions are too broad.");
  const dataInfo = await lstat(config.dataDir).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (dataInfo && (!dataInfo.isDirectory() || dataInfo.isSymbolicLink() || !modeIs(dataInfo, 0o700))) throw new Error("Installed data directory must be a real owner-only directory.");
  return { root, releaseVersion: marker.releaseVersion, dataDir: config.dataDir, manifestSha256: manifestHash };
}

const launchedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (launchedDirectly) {
  const root = process.argv[2];
  if (!root) throw new Error("Usage: verify_install_state.mjs INSTALL_ROOT");
  const result = await verifyInstallState(root);
  console.log(`install state passed: ${result.releaseVersion} · ${result.root}`);
}

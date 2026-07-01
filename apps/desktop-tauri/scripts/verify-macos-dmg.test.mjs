import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeExecutableScript(dir, name, source) {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: options.cwd ?? appRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runNode(args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawnNode(args, options);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", rejectRun);
    child.on("exit", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
  });
}

function makeFixtureRepo(root) {
  const appRoot = join(root, "Volumes", "Another Dimension Chat");
  const appBundle = join(appRoot, "Another Dimension Chat.app");
  mkdirSync(join(appBundle, "Contents", "MacOS"), { recursive: true });
  mkdirSync(join(appBundle, "Contents", "Resources", "binaries"), { recursive: true });
  writeFileSync(join(appBundle, "Contents", "Info.plist"), '<key>CFBundleIdentifier</key><string>chat.anotherdimension.app</string><key>CFBundleShortVersionString</key><string>0.1.0</string>', "utf8");
  writeFileSync(join(appBundle, "Contents", "MacOS", "Another Dimension Chat"), "arm64 executable", "utf8");
  writeFileSync(join(appBundle, "Contents", "Resources", "binaries", "another-dimension-engine-aarch64-apple-darwin"), "arm64 sidecar", "utf8");
  symlinkSync("/Applications", join(appRoot, "Applications"));
  return { appRoot, appBundle };
}

function makeFakeToolchain(dir, fixtureRoot) {
  const mountPoint = join(fixtureRoot, "Volumes", "Another Dimension Chat");
  const fileScript = join(dir, "fake-file.mjs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(fileScript, `
console.log(process.argv[2] + ": Mach-O 64-bit executable arm64");
`, "utf8");
  return { mountPoint, fileScript };
}

test("verify-macos-dmg accepts expected macOS bundle layout", async () => {
  const sandbox = makeTempDir("ad-verify-macos-dmg-success-");
  makeFixtureRepo(sandbox);
  const binDir = join(sandbox, "bin");
  const { mountPoint, fileScript } = makeFakeToolchain(binDir, sandbox);
  writeFileSync(join(sandbox, "bundle.dmg"), "fixture-dmg", "utf8");
  const result = await runNode([join("scripts", "verify-macos-dmg.mjs"), join(sandbox, "bundle.dmg")], {
    env: {
      AD_VERIFY_MACOS_DMG_FILE_SCRIPT: fileScript,
      AD_VERIFY_MACOS_DMG_MOUNT_POINT: mountPoint,
    },
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /verify_macos_dmg_ok=/);
  rmSync(sandbox, { recursive: true, force: true });
});

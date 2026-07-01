import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
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

function writeFixtureDmg(dir, name, body = "fixture-dmg") {
  const path = join(dir, name);
  writeFileSync(path, body, "utf8");
  return path;
}

test("prepare-macos-release writes fixed-name packet and checksum", async () => {
  const sandbox = makeTempDir("ad-prepare-macos-release-success-");
  const sourceDir = join(sandbox, "source");
  const outDir = join(sandbox, "out");
  mkdirSync(sourceDir, { recursive: true });
  const sourceDmg = writeFixtureDmg(sourceDir, "Another Dimension Chat.dmg");

  const result = await runNode(
    [join("scripts", "prepare-macos-release.mjs"), "--source-dir", sourceDir, "--out-dir", outDir, "--version", "0.1.0", "--commit", "abc123", "--tag", "v0.1.0", "--channel", "beta-onion", "--arch", "arm64"],
  );

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null, result.stderr);
  assert.match(result.stdout, /release_packet_dir=/);
  assert.match(result.stdout, /release_packet_sha256=/);
  assert.equal(existsSync(join(outDir, "another-dimension-chat-0.1.0-beta-onion-arm64.dmg")), true);
  assert.equal(existsSync(join(outDir, "SHA256SUMS.txt")), true);
  assert.equal(existsSync(join(outDir, "RELEASE_METADATA.json")), true);
  const checksum = readFileSync(join(outDir, "SHA256SUMS.txt"), "utf8");
  assert.match(checksum, /another-dimension-chat-0.1.0-beta-onion-arm64\.dmg/);
  rmSync(sandbox, { recursive: true, force: true });
});

test("prepare-macos-release fails when source dmg is missing", async () => {
  const sandbox = makeTempDir("ad-prepare-macos-release-missing-");
  const sourceDir = join(sandbox, "source");
  const outDir = join(sandbox, "out");
  mkdirSync(sourceDir, { recursive: true });

  const result = await runNode(
    [join("scripts", "prepare-macos-release.mjs"), "--source-dir", sourceDir, "--out-dir", outDir, "--version", "0.1.0", "--commit", "abc123", "--tag", "v0.1.0", "--channel", "beta-onion", "--arch", "arm64"],
  );

  assert.equal(result.code, 1);
  assert.match(result.stderr, /missing-dmg/);
  rmSync(sandbox, { recursive: true, force: true });
});

test("prepare-macos-release fails when multiple dmg files are present", async () => {
  const sandbox = makeTempDir("ad-prepare-macos-release-multiple-");
  const sourceDir = join(sandbox, "source");
  const outDir = join(sandbox, "out");
  mkdirSync(sourceDir, { recursive: true });
  writeFixtureDmg(sourceDir, "a.dmg");
  writeFixtureDmg(sourceDir, "b.dmg");

  const result = await runNode(
    [join("scripts", "prepare-macos-release.mjs"), "--source-dir", sourceDir, "--out-dir", outDir, "--version", "0.1.0", "--commit", "abc123", "--tag", "v0.1.0", "--channel", "beta-onion", "--arch", "arm64"],
  );

  assert.equal(result.code, 1);
  assert.match(result.stderr, /multiple-dmg/);
  rmSync(sandbox, { recursive: true, force: true });
});

test("prepare-macos-release fails when tag and version mismatch", async () => {
  const sandbox = makeTempDir("ad-prepare-macos-release-tag-");
  const sourceDir = join(sandbox, "source");
  const outDir = join(sandbox, "out");
  mkdirSync(sourceDir, { recursive: true });
  writeFixtureDmg(sourceDir, "a.dmg");

  const result = await runNode(
    [join("scripts", "prepare-macos-release.mjs"), "--source-dir", sourceDir, "--out-dir", outDir, "--version", "0.1.0", "--commit", "abc123", "--tag", "v0.2.0", "--channel", "beta-onion", "--arch", "arm64"],
  );

  assert.equal(result.code, 1);
  assert.match(result.stderr, /tag-version-mismatch/);
  rmSync(sandbox, { recursive: true, force: true });
});

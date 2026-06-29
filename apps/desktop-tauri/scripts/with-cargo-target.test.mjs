import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  chmodSync,
  utimesSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { reapStaleCargoTargets } from "./with-cargo-target.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");

function targetTriple() {
  if (process.platform === "win32") {
    if (process.arch === "x64") return "x86_64-pc-windows-msvc";
    if (process.arch === "arm64") return "aarch64-pc-windows-msvc";
  }
  if (process.platform === "darwin") {
    if (process.arch === "x64") return "x86_64-apple-darwin";
    if (process.arch === "arm64") return "aarch64-apple-darwin";
  }
  if (process.platform === "linux") {
    if (process.arch === "x64") return "x86_64-unknown-linux-gnu";
    if (process.arch === "arm64") return "aarch64-unknown-linux-gnu";
  }
  throw new Error(`unsupported test host ${process.platform}-${process.arch}`);
}

function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeExecutableScript(dir, name, source) {
  const path = join(dir, name);
  writeFileSync(path, source, { mode: 0o755 });
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
    child.on("exit", (code, signal) => {
      resolveRun({ code, signal, stdout, stderr });
    });
  });
}

function waitFor(predicate, timeoutMs = 3000) {
  const started = Date.now();
  return new Promise((resolveWait, rejectWait) => {
    const tick = () => {
      if (predicate()) {
        resolveWait();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        rejectWait(new Error("timed out waiting for condition"));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

function captureAndRestorePath(path) {
  const existed = existsSync(path);
  const original = existed ? readFileSync(path) : null;
  return () => {
    if (existed) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, original);
      return;
    }
    rmSync(path, { recursive: true, force: true });
  };
}

function touchOld(path, ageMs = 25 * 60 * 60 * 1000) {
  const old = new Date(Date.now() - ageMs);
  utimesSync(path, old, old);
}

function makeChildScriptSource(mode) {
  return `
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outputPath = process.argv[2];
const targetDir = process.env.CARGO_TARGET_DIR;
if (!targetDir) {
  throw new Error("missing CARGO_TARGET_DIR");
}

writeFileSync(outputPath, targetDir, "utf8");
mkdirSync(join(targetDir, ${JSON.stringify(mode)}), { recursive: true });

if (${JSON.stringify(mode)} === "signal") {
  setInterval(() => {}, 1000);
} else if (${JSON.stringify(mode)} === "failure") {
  process.exit(7);
} else {
  process.exit(0);
}
`;
}

test("disposable target is cleaned after success", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-success-");
  const childScript = writeExecutableScript(sandbox, "child-success.mjs", makeChildScriptSource("success"));
  const targetFile = join(sandbox, "target-path.txt");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const result = await runNode(
    [join("scripts", "with-cargo-target.mjs"), process.execPath, childScript, targetFile],
    {
      env: { AD_BUILD_CACHE_DIR: cacheRoot },
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  const targetDir = readFileSync(targetFile, "utf8");
  assert.equal(existsSync(targetDir), false);
  assert.deepEqual(readdirSync(cacheRoot), []);
  rmSync(sandbox, { recursive: true, force: true });
});

test("disposable target is cleaned after failure", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-failure-");
  const childScript = writeExecutableScript(sandbox, "child-failure.mjs", makeChildScriptSource("failure"));
  const targetFile = join(sandbox, "target-path.txt");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const result = await runNode(
    [join("scripts", "with-cargo-target.mjs"), process.execPath, childScript, targetFile],
    {
      env: { AD_BUILD_CACHE_DIR: cacheRoot },
    },
  );

  assert.equal(result.code, 7);
  assert.equal(result.signal, null);
  const targetDir = readFileSync(targetFile, "utf8");
  assert.equal(existsSync(targetDir), false);
  assert.deepEqual(readdirSync(cacheRoot), []);
  rmSync(sandbox, { recursive: true, force: true });
});

test("disposable target is cleaned after SIGTERM", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-signal-");
  const childScript = writeExecutableScript(sandbox, "child-signal.mjs", makeChildScriptSource("signal"));
  const targetFile = join(sandbox, "target-path.txt");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const child = spawnNode(
    [join("scripts", "with-cargo-target.mjs"), process.execPath, childScript, targetFile],
    {
      env: { AD_BUILD_CACHE_DIR: cacheRoot },
    },
  );

  await waitFor(() => existsSync(targetFile));
  child.kill("SIGTERM");

  const result = await new Promise((resolveRun, rejectRun) => {
    child.on("error", rejectRun);
    child.on("exit", (code, signal) => resolveRun({ code, signal }));
  });

  const targetDir = readFileSync(targetFile, "utf8");
  assert.equal(existsSync(targetDir), false);
  assert.deepEqual(readdirSync(cacheRoot), []);
  assert.equal(result.code, 128);
  assert.equal(result.signal, null);
  rmSync(sandbox, { recursive: true, force: true });
});

test("sidecar preparation and tauri build share one disposable target", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-sidecar-");
  const fakeBinDir = join(sandbox, "bin");
  mkdirSync(fakeBinDir, { recursive: true });
  const cargoTargetFile = join(sandbox, "cargo-target.txt");
  const tauriTargetFile = join(sandbox, "tauri-target.txt");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const executableSuffix = process.platform === "win32" ? ".exe" : "";
  const sidecarName = `another-dimension-engine-${targetTriple()}${executableSuffix}`;
  const sidecarPath = join(repoRoot, "apps/desktop-tauri/src-tauri/binaries", sidecarName);
  const restoreSidecar = captureAndRestorePath(sidecarPath);

  writeExecutableScript(
    fakeBinDir,
    process.platform === "win32" ? "cargo.cmd" : "cargo",
    `#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const targetDir = process.env.CARGO_TARGET_DIR;
const binaryPath = join(
  targetDir,
  "release",
  ${JSON.stringify(`another-dimension-engine${executableSuffix}`)},
);
mkdirSync(dirname(binaryPath), { recursive: true });
writeFileSync(binaryPath, "fake-engine", "utf8");
writeFileSync(${JSON.stringify(cargoTargetFile)}, targetDir, "utf8");
process.exit(0);
`,
  );

  writeExecutableScript(
    fakeBinDir,
    process.platform === "win32" ? "tauri.cmd" : "tauri",
    `#!/usr/bin/env node
const { writeFileSync } = require("node:fs");

writeFileSync(${JSON.stringify(tauriTargetFile)}, process.env.CARGO_TARGET_DIR ?? "", "utf8");
process.exit(0);
`,
  );

  const originalPath = process.env.PATH || "";
  const env = {
    AD_BUILD_CACHE_DIR: cacheRoot,
    PATH: `${fakeBinDir}${process.platform === "win32" ? ";" : ":"}${originalPath}`,
  };

  const result = await runNode(
    [
      join("scripts", "prepare-engine-sidecar.mjs"),
      "--release",
      "--manual-e2ee-runtime",
      "--tauri-build",
      "--",
      "tauri",
      "build",
      "--config",
      "src-tauri/tauri.sidecar.conf.json",
    ],
    { env },
  );

  try {
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    const cargoTargetDir = readFileSync(cargoTargetFile, "utf8");
    const tauriTargetDir = readFileSync(tauriTargetFile, "utf8");
    assert.equal(cargoTargetDir, tauriTargetDir);
    assert.equal(existsSync(cargoTargetDir), false);
    assert.deepEqual(readdirSync(cacheRoot), []);
    assert.match(result.stdout, /engine_sidecar_prepared=true/);
  } finally {
    restoreSidecar();
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare-engine-sidecar compiles engine once and tauri compiles shell once", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-sidecar-count-");
  const fakeBinDir = join(sandbox, "bin");
  mkdirSync(fakeBinDir, { recursive: true });
  const invocationLog = join(sandbox, "invocations.jsonl");
  const engineTargetFile = join(sandbox, "engine-target.txt");
  const shellTargetFile = join(sandbox, "shell-target.txt");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const executableSuffix = process.platform === "win32" ? ".exe" : "";
  const sidecarName = `another-dimension-engine-${targetTriple()}${executableSuffix}`;
  const sidecarPath = join(repoRoot, "apps/desktop-tauri/src-tauri/binaries", sidecarName);
  const restoreSidecar = captureAndRestorePath(sidecarPath);

  writeExecutableScript(
    fakeBinDir,
    process.platform === "win32" ? "cargo.cmd" : "cargo",
    `#!/usr/bin/env node
const { appendFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const args = process.argv.slice(2);
const targetDir = process.env.CARGO_TARGET_DIR;
if (!targetDir) {
  throw new Error("missing CARGO_TARGET_DIR");
}

appendFileSync(${JSON.stringify(invocationLog)}, JSON.stringify({ bin: "cargo", args }) + "\\n", "utf8");
const isEngineBuild = args.includes("-p") && args.includes("another-dimension-engine");
const targetFile = isEngineBuild ? ${JSON.stringify(engineTargetFile)} : ${JSON.stringify(shellTargetFile)};
writeFileSync(targetFile, targetDir, "utf8");

if (isEngineBuild) {
  const binaryPath = join(
    targetDir,
    "release",
    ${JSON.stringify(`another-dimension-engine${executableSuffix}`)},
  );
  mkdirSync(dirname(binaryPath), { recursive: true });
  writeFileSync(binaryPath, "fake-engine", "utf8");
}

process.exit(0);
`,
  );

  writeExecutableScript(
    fakeBinDir,
    process.platform === "win32" ? "tauri.cmd" : "tauri",
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(invocationLog)}, JSON.stringify({ bin: "tauri", args }) + "\\n", "utf8");

const result = spawnSync(
  "cargo",
  [
    "build",
    "--manifest-path",
    "apps/desktop-tauri/src-tauri/Cargo.toml",
    "--no-default-features",
    "--features",
    "public-shell",
  ],
  {
    cwd: ${JSON.stringify(repoRoot)},
    env: process.env,
    shell: false,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
`,
  );

  const originalPath = process.env.PATH || "";
  const env = {
    AD_BUILD_CACHE_DIR: cacheRoot,
    PATH: `${fakeBinDir}${process.platform === "win32" ? ";" : ":"}${originalPath}`,
  };

  const result = await runNode(
    [
      join("scripts", "prepare-engine-sidecar.mjs"),
      "--release",
      "--manual-e2ee-runtime",
      "--tauri-build",
      "--",
      "tauri",
      "build",
      "--config",
      "src-tauri/tauri.sidecar.conf.json",
    ],
    { env },
  );

  try {
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    const invocations = readFileSync(invocationLog, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const cargoInvocations = invocations.filter((entry) => entry.bin === "cargo");
    const tauriInvocations = invocations.filter((entry) => entry.bin === "tauri");

    assert.equal(cargoInvocations.length, 2);
    assert.equal(tauriInvocations.length, 1);
    assert.match(cargoInvocations[0].args.join(" "), /another-dimension-engine/);
    assert.match(cargoInvocations[1].args.join(" "), /--manifest-path apps\/desktop-tauri\/src-tauri\/Cargo\.toml/);
    assert.equal(readFileSync(engineTargetFile, "utf8"), readFileSync(shellTargetFile, "utf8"));
    assert.equal(existsSync(readFileSync(engineTargetFile, "utf8")), false);
    assert.deepEqual(readdirSync(cacheRoot), []);
    assert.match(result.stdout, /engine_sidecar_prepared=true/);
  } finally {
    restoreSidecar();
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("stale project-tagged temp targets are reaped", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-reap-temp-");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(cacheRoot, { recursive: true });

  const staleTemp = join(cacheRoot, "another-dimension-cargo-target-1111111111111-old");
  const freshTemp = join(cacheRoot, "another-dimension-cargo-target-9999999999999-new");
  const otherProject = join(cacheRoot, "other-project-target-1111111111111-old");
  mkdirSync(staleTemp, { recursive: true });
  mkdirSync(freshTemp, { recursive: true });
  mkdirSync(otherProject, { recursive: true });
  touchOld(staleTemp);
  touchOld(otherProject);

  reapStaleCargoTargets({ cacheRoot, repoRoot });

  assert.equal(existsSync(staleTemp), false);
  assert.equal(existsSync(freshTemp), true);
  assert.equal(existsSync(otherProject), true);

  rmSync(sandbox, { recursive: true, force: true });
});

test("allowlisted checkout targets preserve live pid markers", async () => {
  const sandbox = makeTempDir("ad-with-cargo-target-reap-checkout-");
  const repoSandbox = join(sandbox, "repo");
  const cacheRoot = join(sandbox, "cache");
  mkdirSync(repoSandbox, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });

  const preservedTarget = join(repoSandbox, "target");
  const staleTarget = join(repoSandbox, "apps/desktop-tauri/src-tauri/target");
  mkdirSync(preservedTarget, { recursive: true });
  mkdirSync(staleTarget, { recursive: true });
  writeFileSync(
    join(preservedTarget, ".another-dimension-cargo-target.json"),
    JSON.stringify({ pid: process.pid, createdAt: Date.now() - 26 * 60 * 60 * 1000 }),
    "utf8",
  );
  touchOld(preservedTarget);
  touchOld(staleTarget);

  reapStaleCargoTargets({ repoRoot: repoSandbox, cacheRoot });

  assert.equal(existsSync(preservedTarget), true);
  assert.equal(existsSync(staleTarget), false);

  rmSync(sandbox, { recursive: true, force: true });
});

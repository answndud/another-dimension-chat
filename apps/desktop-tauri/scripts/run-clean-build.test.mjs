import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { test } from "node:test";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeExecutableScript(dir, name, source) {
  const path = join(dir, name);
  writeFileSync(path, source, "utf8");
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

function makeRepoFixture(root) {
  const desktopRoot = join(root, "apps/desktop-tauri");
  mkdirSync(join(root, ".git"), { recursive: true });
  mkdirSync(join(root, "target"), { recursive: true });
  mkdirSync(join(desktopRoot, "src-tauri/target"), { recursive: true });
  mkdirSync(join(root, ".build-cache"), { recursive: true });
  mkdirSync(join(desktopRoot, "dist"), { recursive: true });
  mkdirSync(join(desktopRoot, "src-tauri/binaries"), { recursive: true });
  writeFileSync(join(root, ".git", "HEAD"), "ref: refs/heads/main", "utf8");
  return { desktopRoot };
}

function makeChildScriptSource(mode) {
  return `
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.env.AD_REPO_ROOT;
if (!repoRoot) {
  throw new Error("missing AD_REPO_ROOT");
}

const outputPath = process.argv[2];
writeFileSync(outputPath, repoRoot, "utf8");
mkdirSync(join(repoRoot, "target"), { recursive: true });
  writeFileSync(join(repoRoot, "target", "build.log"), ${JSON.stringify(mode)}, "utf8");

if (${JSON.stringify(mode)} === "failure") {
  process.exit(7);
} else if (${JSON.stringify(mode)} === "signal") {
  setInterval(() => {}, 1000);
} else {
  process.exit(0);
}
`;
}

test("run-clean-build cleans generated paths after success", async () => {
  const sandbox = makeTempDir("ad-run-clean-build-success-");
  makeRepoFixture(sandbox);
  const childScript = writeExecutableScript(sandbox, "child-success.mjs", makeChildScriptSource("success"));
  const outputFile = join(sandbox, "repo-root.txt");

  const result = await runNode(
    [join("scripts", "run-clean-build.mjs"), process.execPath, childScript, outputFile],
    { env: { AD_REPO_ROOT: sandbox, AD_SKIP_STORAGE_BUDGET: "1" } },
  );

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(readFileSync(outputFile, "utf8"), sandbox);
  assert.deepEqual(
    readdirSync(sandbox).filter((entry) => entry === "target" || entry === ".build-cache"),
    [],
  );
  assert.equal(existsSync(join(sandbox, "target")), false);
  assert.equal(existsSync(join(sandbox, ".build-cache")), false);
  rmSync(sandbox, { recursive: true, force: true });
});

test("run-clean-build cleans generated paths after failure and preserves exit code", async () => {
  const sandbox = makeTempDir("ad-run-clean-build-failure-");
  makeRepoFixture(sandbox);
  const childScript = writeExecutableScript(sandbox, "child-failure.mjs", makeChildScriptSource("failure"));
  const outputFile = join(sandbox, "repo-root.txt");

  const result = await runNode(
    [join("scripts", "run-clean-build.mjs"), process.execPath, childScript, outputFile],
    { env: { AD_REPO_ROOT: sandbox, AD_SKIP_STORAGE_BUDGET: "1" } },
  );

  assert.equal(result.code, 7, result.stderr);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(existsSync(join(sandbox, "target")), false);
  assert.equal(existsSync(join(sandbox, ".build-cache")), false);
  assert.equal(existsSync(outputFile), true);
  rmSync(sandbox, { recursive: true, force: true });
});

test("run-clean-build terminates with 128 on SIGTERM and still cleans generated paths", async () => {
  const sandbox = makeTempDir("ad-run-clean-build-signal-");
  makeRepoFixture(sandbox);
  const childScript = writeExecutableScript(sandbox, "child-signal.mjs", makeChildScriptSource("signal"));
  const outputFile = join(sandbox, "repo-root.txt");

  const child = spawnNode(
    [join("scripts", "run-clean-build.mjs"), process.execPath, childScript, outputFile],
    { env: { AD_REPO_ROOT: sandbox, AD_SKIP_STORAGE_BUDGET: "1" } },
  );

  await waitFor(() => existsSync(outputFile));

  child.kill("SIGTERM");

  const result = await new Promise((resolveRun, rejectRun) => {
    child.on("error", rejectRun);
    child.on("exit", (code, signal) => resolveRun({ code, signal }));
  });

  assert.equal(result.code, 128, result.stdout || result.stderr);
  assert.equal(result.signal, null, result.stdout || result.stderr);
  assert.equal(existsSync(join(sandbox, "target")), false);
  assert.equal(existsSync(join(sandbox, ".build-cache")), false);
  rmSync(sandbox, { recursive: true, force: true });
});

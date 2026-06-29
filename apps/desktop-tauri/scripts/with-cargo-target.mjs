import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_TAG = "another-dimension-cargo-target";
const PROJECT_TAG_PREFIX = `${PROJECT_TAG}-`;
const TARGET_MARKER_FILE = ".another-dimension-cargo-target.json";
const STALE_TARGET_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readTargetMarker(targetDir) {
  const markerPath = join(targetDir, TARGET_MARKER_FILE);
  if (!existsSync(markerPath)) {
    return null;
  }
  try {
    const body = JSON.parse(readFileSync(markerPath, "utf8"));
    if (typeof body !== "object" || body === null) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

function writeTargetMarker(targetDir, marker) {
  const markerPath = join(targetDir, TARGET_MARKER_FILE);
  writeFileSync(markerPath, JSON.stringify(marker), { encoding: "utf8" });
}

function shouldReapTargetDir(targetDir, cutoffMs) {
  if (!existsSync(targetDir)) {
    return false;
  }

  const marker = readTargetMarker(targetDir);
  if (marker && pidIsAlive(marker.pid)) {
    return false;
  }

  let stat;
  try {
    stat = statSync(targetDir);
  } catch {
    return false;
  }

  return stat.mtimeMs < cutoffMs;
}

function reapTargetDir(targetDir, cutoffMs) {
  if (!shouldReapTargetDir(targetDir, cutoffMs)) {
    return false;
  }
  rmSync(targetDir, { recursive: true, force: true });
  return true;
}

function reapProjectTaggedTempTargets(cacheRoot, cutoffMs) {
  if (!existsSync(cacheRoot)) {
    return 0;
  }

  let removed = 0;
  for (const entry of readdirSync(cacheRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(PROJECT_TAG_PREFIX)) {
      continue;
    }
    const targetDir = join(cacheRoot, entry.name);
    if (reapTargetDir(targetDir, cutoffMs)) {
      removed += 1;
    }
  }
  return removed;
}

function reapAllowlistedCheckoutTargets(repoRoot, cutoffMs) {
  const allowlistedRelativePaths = [
    "target",
    "apps/desktop-tauri/src-tauri/target",
    ".build-cache/cargo-target",
  ];

  let removed = 0;
  for (const relativePath of allowlistedRelativePaths) {
    const targetDir = resolve(repoRoot, relativePath);
    if (reapTargetDir(targetDir, cutoffMs)) {
      removed += 1;
    }
  }
  return removed;
}

export function reapStaleCargoTargets(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../.."));
  const cacheRoot = resolve(options.cacheRoot ?? tmpdir());
  const now = options.now ?? Date.now();
  const cutoffMs = now - STALE_TARGET_MAX_AGE_MS;
  if (options.skipAllowlistedCheckoutTargets !== true) {
    reapAllowlistedCheckoutTargets(repoRoot, cutoffMs);
  }
  reapProjectTaggedTempTargets(cacheRoot, cutoffMs);
}

export function createDisposableCargoTargetEnv(baseEnv = process.env) {
  if (baseEnv.CARGO_TARGET_DIR) {
    return {
      env: { ...baseEnv },
      targetDir: resolve(baseEnv.CARGO_TARGET_DIR),
      cleanup() {},
      ownsTargetDir: false,
    };
  }

  const cacheRoot = resolve(baseEnv.AD_BUILD_CACHE_DIR || tmpdir());
  reapStaleCargoTargets({
    cacheRoot,
    repoRoot: resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
  });
  mkdirSync(cacheRoot, { recursive: true });
  const targetDir = mkdtempSync(join(cacheRoot, `${PROJECT_TAG}-${Date.now()}-`));
  writeTargetMarker(targetDir, {
    pid: process.pid,
    createdAt: Date.now(),
    projectTag: PROJECT_TAG,
  });
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    rmSync(targetDir, { recursive: true, force: true });
  };

  return {
    env: { ...baseEnv, CARGO_TARGET_DIR: targetDir },
    targetDir,
    cleanup,
    ownsTargetDir: true,
  };
}

export function spawnWithDisposableCargoTarget(command, args, options = {}) {
  const context = createDisposableCargoTargetEnv(options.env);
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: context.env,
    shell: options.shell ?? process.platform === "win32",
    stdio: options.stdio ?? "inherit",
  });

  const terminate = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
    context.cleanup();
    process.exit(128);
  };

  const onSigint = () => terminate("SIGINT");
  const onSigterm = () => terminate("SIGTERM");

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  child.on("exit", (code, signal) => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    context.cleanup();
    if (signal) {
      process.exit(128);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    context.cleanup();
    console.error(error.message);
    process.exit(1);
  });

  return child;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isCli) {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.error("usage: node scripts/with-cargo-target.mjs <command> [...args]");
    process.exit(2);
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

  spawnWithDisposableCargoTarget(command, args, {
    cwd: repoRoot,
    env: process.env,
  });
}

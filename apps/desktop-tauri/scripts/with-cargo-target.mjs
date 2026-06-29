import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  mkdirSync(cacheRoot, { recursive: true });
  const targetDir = mkdtempSync(join(cacheRoot, "another-dimension-cargo-target-"));
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

  const cleanupAndExit = (code) => {
    context.cleanup();
    process.exit(code);
  };

  const terminate = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
    cleanupAndExit(128);
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

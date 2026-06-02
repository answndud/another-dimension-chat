import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("usage: node scripts/with-cargo-target.mjs <command> [...args]");
  process.exit(2);
}

const env = { ...process.env };
if (!env.CARGO_TARGET_DIR) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "../../..");
  const cacheRoot = env.AD_BUILD_CACHE_DIR || join(repoRoot, ".build-cache");
  env.CARGO_TARGET_DIR = join(cacheRoot, "cargo-target");
}

const child = spawn(command, args, {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

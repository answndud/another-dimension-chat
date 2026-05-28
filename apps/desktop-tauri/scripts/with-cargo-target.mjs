import { spawn } from "node:child_process";
import { join } from "node:path";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("usage: node scripts/with-cargo-target.mjs <command> [...args]");
  process.exit(2);
}

const env = { ...process.env };
if (!env.CARGO_TARGET_DIR) {
  const tempRoot = env.TMPDIR || "/tmp";
  const cacheRoot = env.AD_BUILD_CACHE_DIR || join(tempRoot, "another-dimension-chat");
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

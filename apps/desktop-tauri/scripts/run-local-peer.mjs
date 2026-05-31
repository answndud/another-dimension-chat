import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const peer = process.argv[2];
const printPathsOnly = process.argv.includes("--print-paths");
if (!["peer-a", "peer-b"].includes(peer)) {
  console.error("usage: node scripts/run-local-peer.mjs <peer-a|peer-b> [--print-paths]");
  process.exit(2);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const peerRoot = join(repoRoot, `another-dimension-dev-${peer}`);
const appDataRoot = join(peerRoot, "app-data");
const appCacheRoot = join(peerRoot, "app-cache");

mkdirSync(appDataRoot, { recursive: true });
mkdirSync(appCacheRoot, { recursive: true });

const env = {
  ...process.env,
  ANOTHER_DIMENSION_APP_DATA_DIR: appDataRoot,
  ANOTHER_DIMENSION_APP_CACHE_DIR: appCacheRoot,
};

const noBeforeDevConfig = JSON.stringify({
  build: {
    beforeDevCommand: "node scripts/noop-dev-server.mjs",
  },
});

console.log(`Launching ${peer}`);
console.log(`App data: ${appDataRoot}`);
console.log(`App cache: ${appCacheRoot}`);

if (printPathsOnly) {
  process.exit(0);
}

const child = spawn(
  process.execPath,
  [
    "scripts/with-cargo-target.mjs",
    "tauri",
    "dev",
    "--features",
    "manual-onion-client-attempt",
    "--no-dev-server-wait",
    "--no-watch",
    "--config",
    noBeforeDevConfig,
  ],
  {
    cwd: appRoot,
    env,
    stdio: "inherit",
  },
);

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

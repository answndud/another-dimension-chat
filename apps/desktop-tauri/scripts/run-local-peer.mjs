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
const rendezvousRoot = join(repoRoot, "another-dimension-dev-rendezvous");

mkdirSync(appDataRoot, { recursive: true });
mkdirSync(appCacheRoot, { recursive: true });
mkdirSync(rendezvousRoot, { recursive: true });

const env = {
  ...process.env,
  ANOTHER_DIMENSION_DEV_PEER_LABEL: peer,
  ANOTHER_DIMENSION_APP_DATA_DIR: appDataRoot,
  ANOTHER_DIMENSION_APP_CACHE_DIR: appCacheRoot,
  ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR: rendezvousRoot,
  VITE_AD_LOCAL_DEV_PEER: peer,
};

const peerTitle = peer === "peer-a" ? "Another Dimension Chat Peer A" : "Another Dimension Chat Peer B";
const peerIdentifier = `chat.anotherdimension.prototype.${peer.replace("-", "")}`;
const devPort = peer === "peer-a" ? 1420 : 1421;
const localPeerConfig = JSON.stringify({
  productName: peerTitle,
  identifier: peerIdentifier,
  build: {
    beforeDevCommand: `npm exec -- vite --host 127.0.0.1 --port ${devPort} --strictPort`,
    devUrl: `http://127.0.0.1:${devPort}`,
  },
  app: {
    windows: [
      {
        title: peerTitle,
        width: 1000,
        height: 700,
      },
    ],
  },
});

console.log(`Launching ${peer}`);
console.log(`App label: ${peer}`);
console.log(`App data: ${appDataRoot}`);
console.log(`App cache: ${appCacheRoot}`);
console.log(`Dev rendezvous: ${rendezvousRoot}`);

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
    "--no-watch",
    "--config",
    localPeerConfig,
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

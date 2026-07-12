import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const peer = process.argv[2];
const printPathsOnly = process.argv.includes("--print-paths");
const bridgeCapable = process.argv.includes("--bridge");
const bridgeConfigFileArgIndex = process.argv.indexOf("--bridge-config-file");
const ptBinaryArgIndex = process.argv.indexOf("--pt-binary");
const obfs4PtBinaryArgIndex = process.argv.indexOf("--obfs4-pt-binary");
const explicitPtBinaryArgIndex = ptBinaryArgIndex >= 0 ? ptBinaryArgIndex : obfs4PtBinaryArgIndex;
const bridgeConfigFile =
  bridgeConfigFileArgIndex >= 0
    ? process.argv[bridgeConfigFileArgIndex + 1]
    : bridgeCapable
      ? process.env.ANOTHER_DIMENSION_LOCAL_PEER_BRIDGE_CONFIG_FILE
      : undefined;
const ptBinary =
  explicitPtBinaryArgIndex >= 0
    ? process.argv[explicitPtBinaryArgIndex + 1]
    : bridgeCapable
      ? process.env.ANOTHER_DIMENSION_LOCAL_PEER_PT_BINARY ||
        process.env.ANOTHER_DIMENSION_LOCAL_PEER_OBFS4_PT_BINARY
      : undefined;
if (!["peer-a", "peer-b"].includes(peer)) {
  console.error(
    "usage: node scripts/run-local-peer.mjs <peer-a|peer-b> [--bridge] [--bridge-config-file <path>] [--pt-binary <path>] [--print-paths]",
  );
  process.exit(2);
}
if (
  bridgeConfigFileArgIndex >= 0 &&
  (!process.argv[bridgeConfigFileArgIndex + 1] || process.argv[bridgeConfigFileArgIndex + 1].startsWith("--"))
) {
  console.error("--bridge-config-file requires a path");
  process.exit(2);
}
if (bridgeConfigFileArgIndex >= 0 && bridgeConfigFile && !bridgeCapable) {
  console.error("--bridge-config-file requires --bridge");
  process.exit(2);
}
if (ptBinaryArgIndex >= 0 && obfs4PtBinaryArgIndex >= 0) {
  console.error("use only one pluggable transport binary argument");
  process.exit(2);
}
if (
  explicitPtBinaryArgIndex >= 0 &&
  (!process.argv[explicitPtBinaryArgIndex + 1] ||
    process.argv[explicitPtBinaryArgIndex + 1].startsWith("--"))
) {
  console.error("--pt-binary requires a path");
  process.exit(2);
}
if (explicitPtBinaryArgIndex >= 0 && ptBinary && !bridgeCapable) {
  console.error("--pt-binary requires --bridge");
  process.exit(2);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const peerRoot = join(repoRoot, `another-dimension-dev-${peer}`);
const appDataRoot = join(peerRoot, "app-data");
const appCacheRoot = join(peerRoot, "app-cache");
const rendezvousRoot = join(repoRoot, "another-dimension-dev-rendezvous");

const env = {
  ...process.env,
  ANOTHER_DIMENSION_DEV_PEER_LABEL: peer,
  ANOTHER_DIMENSION_APP_DATA_DIR: appDataRoot,
  ANOTHER_DIMENSION_APP_CACHE_DIR: appCacheRoot,
  ANOTHER_DIMENSION_DEV_RENDEZVOUS_DIR: rendezvousRoot,
  VITE_AD_LOCAL_DEV_PEER: peer,
  VITE_AD_BUILD_CHANNEL: bridgeCapable ? "local-peer-bridge" : "local-peer",
};

let bridgeConfigInstalled = false;
let bridgeRequiresPtBinary = false;
let ptBinaryInstalled = false;

const managedBridgeTransportProtocols = new Set([
  "obfs4",
  "webtunnel",
  "meek_lite",
  "snowflake",
  "obfs2",
  "obfs3",
  "scramblesuit",
]);

function managedBridgeTransportProtocol(line) {
  const parts = line.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const candidates = parts[0].toLowerCase() === "bridge" ? [parts[1]] : [parts[0], parts[1]];
  return candidates
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .find((part) => managedBridgeTransportProtocols.has(part));
}

console.log(`Launching ${peer}`);
console.log(`App label: ${peer}`);
console.log(`App data: ${appDataRoot}`);
console.log(`App cache: ${appCacheRoot}`);
console.log(`Dev rendezvous: ${rendezvousRoot}`);
console.log(`Bridge-capable build: ${bridgeCapable ? "yes" : "no"}`);

mkdirSync(appDataRoot, { recursive: true });
mkdirSync(appCacheRoot, { recursive: true });
mkdirSync(rendezvousRoot, { recursive: true });

if (printPathsOnly) {
  console.log("Bridge config installed: no");
  console.log("Pluggable transport required: unknown");
  console.log("Pluggable transport configured: no");
  process.exit(0);
}

if (bridgeConfigFile) {
  const contents = readFileSync(resolve(bridgeConfigFile), "utf8");
  const bridgeLines = contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (bridgeLines.length === 0 || bridgeLines.length > 8 || bridgeLines.some((line) => line.length > 2048)) {
    console.error("Bridge config file is invalid or outside local limits");
    process.exit(1);
  }
  bridgeRequiresPtBinary = bridgeLines.some((line) => managedBridgeTransportProtocol(line));
  if (bridgeRequiresPtBinary && !ptBinary) {
    console.error("Bridge config requires a pluggable transport binary");
    process.exit(1);
  }
  const bridgeConfigPath = join(appDataRoot, "transport", "bridge-lines.txt");
  mkdirSync(dirname(bridgeConfigPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(bridgeConfigPath), 0o700);
  writeFileSync(bridgeConfigPath, contents, { encoding: "utf8", mode: 0o600 });
  chmodSync(bridgeConfigPath, 0o600);
  bridgeConfigInstalled = true;
}

if (ptBinary) {
  const resolvedPtBinary = resolve(ptBinary);
  let ptBinaryIsFile = false;
  try {
    ptBinaryIsFile = statSync(resolvedPtBinary).isFile();
  } catch {
    ptBinaryIsFile = false;
  }
  if (!ptBinaryIsFile) {
    console.error("Pluggable transport binary is unavailable");
    process.exit(1);
  }
  const ptBinaryPath = join(appDataRoot, "transport", "pt-binary-path.txt");
  mkdirSync(dirname(ptBinaryPath), { recursive: true, mode: 0o700 });
  chmodSync(dirname(ptBinaryPath), 0o700);
  writeFileSync(ptBinaryPath, resolvedPtBinary, { encoding: "utf8", mode: 0o600 });
  chmodSync(ptBinaryPath, 0o600);
  ptBinaryInstalled = true;
}

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

console.log(`Bridge config installed: ${bridgeConfigInstalled ? "yes" : "no"}`);
console.log(`Pluggable transport required: ${bridgeRequiresPtBinary ? "yes" : "no"}`);
console.log(`Pluggable transport configured: ${ptBinaryInstalled ? "yes" : "no"}`);

const child = spawn(
  process.execPath,
  [
    "scripts/with-cargo-target.mjs",
    "tauri",
    "dev",
    "--features",
    bridgeCapable ? "manual-onion-bridge-client" : "manual-onion-client-attempt",
    "--no-watch",
    "--config",
    localPeerConfig,
    "--",
    "--no-default-features",
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

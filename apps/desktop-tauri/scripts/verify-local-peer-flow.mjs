import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const peerRoots = ["peer-a", "peer-b"].map((peer) => join(repoRoot, `another-dimension-dev-${peer}`));
const rendezvousRoot = join(repoRoot, "another-dimension-dev-rendezvous");

function cleanPeerRoots() {
  for (const peerRoot of peerRoots) {
    rmSync(peerRoot, { recursive: true, force: true });
  }
  rmSync(rendezvousRoot, { recursive: true, force: true });
}

function assertPeerRootsCreatedAndDistinct() {
  if (peerRoots[0] === peerRoots[1]) {
    throw new Error("peer roots must be distinct");
  }
  for (const peerRoot of peerRoots) {
    if (!existsSync(join(peerRoot, "app-data")) || !existsSync(join(peerRoot, "app-cache"))) {
      throw new Error(`peer root was not prepared: ${peerRoot}`);
    }
  }
  if (!existsSync(rendezvousRoot)) {
    throw new Error(`rendezvous root was not prepared: ${rendezvousRoot}`);
  }
}

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? appRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: "inherit",
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} stopped by ${signal}`));
        return;
      }
      if (code === 0) {
        resolveRun();
        return;
      }
      reject(new Error(`${label} exited with ${code ?? 1}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  cleanPeerRoots();
  await run("peer-a isolated paths", process.execPath, ["scripts/run-local-peer.mjs", "peer-a", "--print-paths"]);
  await run("peer-b isolated paths", process.execPath, ["scripts/run-local-peer.mjs", "peer-b", "--print-paths"]);
  assertPeerRootsCreatedAndDistinct();
  await run("isolated invite roots exchange", process.execPath, [
    "scripts/with-cargo-target.mjs",
    "cargo",
    "test",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--lib",
    "production_isolated_invite_roots_exchange_payloads_without_peer_private_profile",
  ]);
  await run("invite recovery and failed-send state", process.execPath, [
    "scripts/with-cargo-target.mjs",
    "cargo",
    "test",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--lib",
    "production_two_profile_room_setup_accepts_invite_derived_profiles",
  ]);
  await run("resume after runtime reinitialization", process.execPath, [
    "scripts/with-cargo-target.mjs",
    "cargo",
    "test",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--lib",
    "production_two_profile_resume_keeps_retryable_send_after_runtime_reinitialization",
  ]);
  await run("receive import transcript refresh state", process.execPath, [
    "scripts/with-cargo-target.mjs",
    "cargo",
    "test",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--lib",
    "production_receive_import_updates_transcript_and_receive_loop_refresh_counters",
  ]);
  await run("private route update and retry state", process.execPath, [
    "scripts/with-cargo-target.mjs",
    "cargo",
    "test",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--lib",
    "production_onion_send_attempt_result_persists_failed_and_sent_resume_state",
  ]);
  cleanPeerRoots();
  console.log("\nlocal peer flow verification passed");
}

main().catch((error) => {
  cleanPeerRoots();
  console.error(error.message);
  process.exit(1);
});

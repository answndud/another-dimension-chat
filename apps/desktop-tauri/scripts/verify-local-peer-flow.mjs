import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

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
  await run("peer-a isolated paths", process.execPath, ["scripts/run-local-peer.mjs", "peer-a", "--print-paths"]);
  await run("peer-b isolated paths", process.execPath, ["scripts/run-local-peer.mjs", "peer-b", "--print-paths"]);
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
  console.log("\nlocal peer flow verification passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

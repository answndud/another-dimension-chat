import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const tauriRoot = resolve(appRoot, "src-tauri");

const release = process.argv.includes("--release");

function fail(message) {
  console.error(`error=${message}`);
  process.exit(1);
}

function targetTriple() {
  if (process.platform === "win32") {
    if (process.arch === "x64") return "x86_64-pc-windows-msvc";
    if (process.arch === "arm64") return "aarch64-pc-windows-msvc";
  }
  if (process.platform === "darwin") {
    if (process.arch === "x64") return "x86_64-apple-darwin";
    if (process.arch === "arm64") return "aarch64-apple-darwin";
  }
  if (process.platform === "linux") {
    if (process.arch === "x64") return "x86_64-unknown-linux-gnu";
    if (process.arch === "arm64") return "aarch64-unknown-linux-gnu";
  }
  fail(`unsupported-sidecar-host-${process.platform}-${process.arch}`);
}

const profile = release ? "release" : "debug";
const cargoTargetDir = process.env.CARGO_TARGET_DIR
  ? resolve(repoRoot, process.env.CARGO_TARGET_DIR)
  : resolve(repoRoot, "target");
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const sourceBinary = resolve(
  cargoTargetDir,
  profile,
  `another-dimension-engine${executableSuffix}`,
);
const sidecarDir = resolve(tauriRoot, "binaries");
const sidecarName = `another-dimension-engine-${targetTriple()}${executableSuffix}`;
const sidecarBinary = resolve(sidecarDir, sidecarName);

const cargoArgs = ["build", "-p", "another-dimension-engine"];
if (release) cargoArgs.push("--release");

const cargo = spawnSync("cargo", cargoArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});
if (cargo.status !== 0) {
  fail("engine-sidecar-build-failed");
}

statSync(sourceBinary);
mkdirSync(sidecarDir, { recursive: true });
copyFileSync(sourceBinary, sidecarBinary);

console.log("engine_sidecar_prepared=true");
console.log(`engine_sidecar_profile=${profile}`);
console.log(`engine_sidecar_protocol=ad-engine-json-stdio-v1`);
console.log(`engine_sidecar_contract_version=1`);
console.log(`engine_sidecar_filename=${sidecarName}`);

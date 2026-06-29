import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createDisposableCargoTargetEnv } from "./with-cargo-target.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");
const tauriRoot = resolve(appRoot, "src-tauri");

const release = process.argv.includes("--release");
const manualE2eeRuntime = process.argv.includes("--manual-e2ee-runtime");
const fullRuntime = process.argv.includes("--full-runtime");
const tauriBuildIndex = process.argv.indexOf("--tauri-build");
const tauriBuildArgs =
  tauriBuildIndex === -1 ? [] : process.argv.slice(tauriBuildIndex + 1).filter(Boolean);

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

function runCommand(command, args, env) {
  const child = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (child.status !== 0) {
    fail(`${command}-failed`);
  }
}

const profile = release ? "release" : "debug";
const cargoTargetContext = createDisposableCargoTargetEnv(process.env);
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const sourceBinary = resolve(
  cargoTargetContext.targetDir,
  profile,
  `another-dimension-engine${executableSuffix}`,
);
const sidecarDir = resolve(tauriRoot, "binaries");
const sidecarName = `another-dimension-engine-${targetTriple()}${executableSuffix}`;
const sidecarBinary = resolve(sidecarDir, sidecarName);

const cargoArgs = ["build", "-p", "another-dimension-engine"];
if (release) cargoArgs.push("--release");
const features = [];
if (manualE2eeRuntime) features.push("manual-e2ee-runtime");
if (fullRuntime) features.push("full-runtime");
if (features.length > 0) cargoArgs.push("--features", features.join(","));

try {
  runCommand("cargo", cargoArgs, cargoTargetContext.env);

  statSync(sourceBinary);
  mkdirSync(sidecarDir, { recursive: true });
  copyFileSync(sourceBinary, sidecarBinary);

  if (tauriBuildArgs.length > 0) {
    const [buildCommand, ...buildCommandArgs] = tauriBuildArgs[0] === "--"
      ? tauriBuildArgs.slice(1)
      : tauriBuildArgs;
    if (!buildCommand) {
      fail("missing-tauri-build-command");
    }
    runCommand(buildCommand, buildCommandArgs, cargoTargetContext.env);
  }

  console.log("engine_sidecar_prepared=true");
  console.log(`engine_sidecar_profile=${profile}`);
  console.log(`engine_sidecar_protocol=ad-engine-json-stdio-v1`);
  console.log(`engine_sidecar_contract_version=1`);
  console.log(`engine_sidecar_manual_e2ee_runtime=${manualE2eeRuntime || fullRuntime}`);
  console.log(`engine_sidecar_full_runtime=${fullRuntime}`);
  console.log(`engine_sidecar_filename=${sidecarName}`);
} finally {
  cargoTargetContext.cleanup();
}

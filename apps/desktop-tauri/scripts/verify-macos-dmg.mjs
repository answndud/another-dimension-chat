import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");

function fail(message) {
  console.error(`error=${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    fail(`${command}-failed`);
  }
  return result.stdout;
}

function runTool(toolName, args) {
  const scriptOverrideKey =
    toolName === "hdiutil"
      ? "AD_VERIFY_MACOS_DMG_HDIUTIL_SCRIPT"
      : toolName === "file"
        ? "AD_VERIFY_MACOS_DMG_FILE_SCRIPT"
        : null;
  if (scriptOverrideKey && process.env[scriptOverrideKey]) {
    return run(process.execPath, [process.env[scriptOverrideKey], ...args]);
  }
  return run(toolName, args);
}

function readVersion() {
  const body = readFileSync(resolve(repoRoot, "apps/desktop-tauri/src-tauri/tauri.conf.json"), "utf8");
  const match = body.match(/"version"\s*:\s*"([^"]+)"/);
  if (!match) fail("missing-version");
  return match[1];
}

function findSingleDmgInput(inputPath) {
  const resolved = resolve(inputPath);
  const stats = statSync(resolved);
  if (stats.isFile()) return resolved;
  if (!stats.isDirectory()) fail("invalid-input");
  const matches = readdirSync(resolved).filter((entry) => entry.endsWith(".dmg"));
  if (matches.length !== 1) fail(matches.length === 0 ? "missing-dmg" : "multiple-dmg");
  return resolve(resolved, matches[0]);
}

function parseHdiutilAttach(output) {
  const lines = output.trim().split("\n");
  const entry = lines.find((line) => line.includes("/Volumes/"));
  if (!entry) fail("missing-mount-point");
  const mountPath = entry.split("\t").at(-1);
  if (!mountPath || !mountPath.startsWith("/Volumes/")) fail("missing-mount-point");
  return mountPath;
}

function findAppBundle(mountPoint) {
  const entries = readdirSync(mountPoint, { withFileTypes: true });
  const apps = entries.filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
  if (apps.length !== 1) fail(apps.length === 0 ? "missing-app" : "multiple-app");
  return join(mountPoint, apps[0].name);
}

function assertContains(text, pattern, label) {
  if (!text.includes(pattern)) {
    fail(label);
  }
}

const input = process.argv[2];
if (!input) fail("missing-input");

const dmgPath = findSingleDmgInput(input);
const mountPath = process.env.AD_VERIFY_MACOS_DMG_MOUNT_POINT
  ? process.env.AD_VERIFY_MACOS_DMG_MOUNT_POINT
  : parseHdiutilAttach(runTool("hdiutil", ["attach", "-nobrowse", "-readonly", "-plist", dmgPath]));
let mountedApp = null;

try {
  mountedApp = findAppBundle(mountPath);
  assertContains(mountedApp, "Another Dimension Chat.app", "unexpected-app-name");
  const applicationsLink = join(mountPath, "Applications");
  if (!existsSync(applicationsLink)) fail("missing-applications-link");
  const linkStat = lstatSync(applicationsLink);
  if (!linkStat.isSymbolicLink()) fail("applications-link-not-symlink");

  const version = readVersion();
  const infoPath = join(mountedApp, "Contents", "Info.plist");
  const info = readFileSync(infoPath, "utf8");
  assertContains(info, version, "version-mismatch");
  assertContains(info, "chat.anotherdimension.app", "bundle-identifier-mismatch");

  const executablePath = join(mountedApp, "Contents", "MacOS", "Another Dimension Chat");
  const fileOutput = runTool("file", [executablePath]);
  assertContains(fileOutput, "arm64", "main-executable-not-arm64");

  const sidecarPath = join(mountedApp, "Contents", "Resources", "binaries", "another-dimension-engine-aarch64-apple-darwin");
  if (!existsSync(sidecarPath)) fail("missing-sidecar");
  const sidecarOutput = runTool("file", [sidecarPath]);
  assertContains(sidecarOutput, "arm64", "sidecar-not-arm64");

  const debugPaths = [
    join(mountedApp, "Contents", "MacOS", "debug"),
    join(mountedApp, "Contents", "Resources", "debug"),
    join(mountedApp, "Contents", "Resources", "bundle", "debug"),
  ];
  for (const path of debugPaths) {
    if (existsSync(path)) fail("debug-artefact-present");
  }

  console.log(`verify_macos_dmg_ok=${dmgPath}`);
} finally {
  if (mountPath && !process.env.AD_VERIFY_MACOS_DMG_MOUNT_POINT) {
    runTool("hdiutil", ["detach", mountPath]);
  }
}

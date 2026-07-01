import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "../..");

function fail(message) {
  console.error(`error=${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    sourceDir: process.env.AD_MACOS_RELEASE_SOURCE_DIR,
    outDir: process.env.AD_MACOS_RELEASE_OUT_DIR,
    version: process.env.AD_MACOS_RELEASE_VERSION,
    commit: process.env.AD_MACOS_RELEASE_COMMIT,
    tag: process.env.AD_MACOS_RELEASE_TAG,
    channel: process.env.AD_MACOS_RELEASE_BUILD_CHANNEL,
    arch: process.env.AD_MACOS_RELEASE_ARCH ?? "arm64",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag.startsWith("--")) {
      fail(`unexpected-argument-${flag}`);
    }
    if (!value || value.startsWith("--")) {
      fail(`missing-value-for-${flag}`);
    }
    if (flag === "--source-dir") args.sourceDir = value;
    else if (flag === "--out-dir") args.outDir = value;
    else if (flag === "--version") args.version = value;
    else if (flag === "--commit") args.commit = value;
    else if (flag === "--tag") args.tag = value;
    else if (flag === "--channel") args.channel = value;
    else if (flag === "--arch") args.arch = value;
    else fail(`unknown-flag-${flag}`);
    index += 1;
  }

  return args;
}

function readAppVersion() {
  const body = readFileSync(resolve(repoRoot, "apps/desktop-tauri/src-tauri/tauri.conf.json"), "utf8");
  const match = body.match(/"version"\s*:\s*"([^"]+)"/);
  if (!match) {
    fail("missing-tauri-version");
  }
  return match[1];
}

function sha256(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function findSingleDmg(sourceDir) {
  const dmgFiles = readdirSync(sourceDir)
    .filter((entry) => extname(entry) === ".dmg")
    .map((entry) => join(sourceDir, entry));
  if (dmgFiles.length === 0) {
    fail("missing-dmg");
  }
  if (dmgFiles.length > 1) {
    fail("multiple-dmg");
  }
  return dmgFiles[0];
}

const options = parseArgs(process.argv);
if (!options.sourceDir) fail("missing-source-dir");
if (!options.outDir) fail("missing-out-dir");
if (!options.commit) fail("missing-commit");
if (!options.tag) fail("missing-tag");
if (!options.channel) fail("missing-channel");
if (!options.arch) fail("missing-arch");

const appVersion = options.version ?? readAppVersion();
if (options.tag !== `v${appVersion}`) {
  fail("tag-version-mismatch");
}

const sourceDmg = findSingleDmg(options.sourceDir);
const fixedName = `another-dimension-chat-${appVersion}-${options.channel}-${options.arch}.dmg`;
const destinationDir = resolve(options.outDir);
mkdirSync(destinationDir, { recursive: true });

const destinationDmg = resolve(destinationDir, fixedName);
copyFileSync(sourceDmg, destinationDmg);

const checksum = sha256(destinationDmg);
const checksumManifest = `${checksum}  ${fixedName}\n`;
writeFileSync(resolve(destinationDir, "SHA256SUMS.txt"), checksumManifest, "utf8");

const metadata = {
  app_version: appVersion,
  build_channel: options.channel,
  commit: options.commit,
  dmg_filename: fixedName,
  dmg_sha256: checksum,
  release_tag: options.tag,
  release_architecture: options.arch,
};
writeFileSync(resolve(destinationDir, "RELEASE_METADATA.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(`release_packet_dir=${destinationDir}`);
console.log(`release_packet_dmg=${destinationDmg}`);
console.log(`release_packet_sha256=${checksum}`);

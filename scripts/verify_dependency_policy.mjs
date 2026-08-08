import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const policy = JSON.parse(await readFile(join(root, "reference/DEPENDENCY_POLICY.json"), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);

function cargoMetadata() {
  const result = spawnSync("cargo", ["metadata", "--locked", "--format-version", "1"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    fail(`cargo metadata --locked failed: ${result.stderr.trim()}`);
    return null;
  }
  return JSON.parse(result.stdout);
}

async function scanNodeLicenses(directory, seen = new Set()) {
  if (!existsSync(directory)) return false;
  const entries = await (await import("node:fs/promises")).readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) {
      const scopedDirectory = join(directory, entry.name);
      const scopedEntries = await (await import("node:fs/promises")).readdir(scopedDirectory, { withFileTypes: true });
      for (const scopedEntry of scopedEntries) {
        if (scopedEntry.isDirectory()) await inspectNodePackage(join(scopedDirectory, scopedEntry.name), seen);
      }
      continue;
    }
    await inspectNodePackage(join(directory, entry.name), seen);
  }
  return true;
}

async function inspectNodePackage(packageDirectory, seen) {
  const packageFile = join(packageDirectory, "package.json");
  if (existsSync(packageFile) && !seen.has(packageFile)) {
    seen.add(packageFile);
    const packageMeta = JSON.parse(await readFile(packageFile, "utf8"));
    const license = packageMeta.license ?? (Array.isArray(packageMeta.licenses) ? packageMeta.licenses.map((item) => item.type).join(" OR ") : "");
    const normalized = license.replace(/[()]/g, "").trim();
    const alternatives = normalized.split(/\s+OR\s+/).map((item) => item.trim()).filter(Boolean);
    const atoms = normalized.split(/\s+AND\s+/).map((item) => item.trim()).filter(Boolean);
    const accepted = normalized.includes(" OR ")
      ? alternatives.some((item) => policy.node.allowedLicenses.includes(item))
      : atoms.length > 0 && atoms.every((item) => policy.node.allowedLicenses.includes(item));
    if (!accepted) fail(`installed Node package has an unreviewed license: ${packageMeta.name ?? "UNKNOWN"}@${packageMeta.version ?? "UNKNOWN"} (${license || "UNKNOWN"})`);
  }
  const nested = join(packageDirectory, "node_modules");
  if (existsSync(nested)) await scanNodeLicenses(nested, seen);
}

const metadata = cargoMetadata();
if (metadata) {
  const workspace = metadata.packages.find((pkg) => pkg.name === "another-dimension-daemon");
  const direct = new Map(Object.entries(policy.rust.direct));
  const dependencies = new Set((workspace?.dependencies ?? []).filter((dep) => dep.kind === null).map((dep) => dep.name));
  for (const name of dependencies) if (!direct.has(name)) fail(`Rust direct dependency is not documented: ${name}`);
  for (const name of direct.keys()) if (!dependencies.has(name)) fail(`Rust policy lists missing direct dependency: ${name}`);

  const forbiddenLicenses = ["GPL-2", "GPL-3", "AGPL", "LGPL-3"];
  for (const pkg of metadata.packages) {
    if (pkg.source && !pkg.source.startsWith("registry+https://github.com/rust-lang/crates.io-index")) {
      fail(`Rust package source is not crates.io or workspace: ${pkg.name}@${pkg.version}`);
    }
    if (!pkg.source) continue;
    if (!pkg.license) fail(`Rust package has no declared license: ${pkg.name}@${pkg.version}`);
    for (const forbidden of forbiddenLicenses) {
      if (pkg.license?.includes(forbidden) && !pkg.license.includes(" OR MIT") && !pkg.license.includes(" OR Apache-2.0")) {
        fail(`Rust package uses forbidden license expression: ${pkg.name}@${pkg.version} (${pkg.license})`);
      }
    }
    const atoms = pkg.license?.replaceAll("WITH LLVM-exception", "").split(/\s+(?:OR|AND)\s+|\s*\/\s*/).map((x) => x.trim()).filter(Boolean) ?? [];
    const unknown = atoms.filter((atom) => !policy.allowedRustLicenses.includes(atom) && !["LGPL-2.1-or-later"].includes(atom));
    if (unknown.length && !pkg.license.includes(" OR MIT") && !pkg.license.includes(" OR Apache-2.0")) {
      fail(`Rust package license is outside the reviewed allowlist: ${pkg.name}@${pkg.version} (${pkg.license})`);
    }
  }

  const duplicateOutput = spawnSync("cargo", ["tree", "-d", "--locked"], { cwd: root, encoding: "utf8" }).stdout;
  const sensitive = new Set(["aes", "aes-gcm", "argon2", "ed25519-dalek", "openmls", "openmls_traits", "rustls", "tokio-rustls", "sha2", "zeroize", "tls_codec"]);
  const versions = new Map();
  for (const line of duplicateOutput.split("\n")) {
    const match = line.match(/^([a-zA-Z0-9_-]+) v([^\s]+)/);
    if (!match || !sensitive.has(match[1])) continue;
    if (!versions.has(match[1])) versions.set(match[1], new Set());
    versions.get(match[1]).add(match[2]);
  }
  for (const [name, values] of versions) if (values.size > 1) fail(`directly security-sensitive crate has multiple versions: ${name} (${[...values].join(", ")})`);
}

for (const [packageRoot, packageFile] of [["apps/web", "apps/web/package.json"], ["apps/server", "apps/server/package.json"]]) {
  const manifest = JSON.parse(await readFile(join(root, packageFile), "utf8"));
  const direct = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const policyNames = new Set(Object.keys(policy.node.direct));
  for (const name of Object.keys(direct)) if (!policyNames.has(name)) fail(`Node direct dependency is not documented: ${name}`);
  const lockFile = join(root, packageRoot, "package-lock.json");
  const lock = JSON.parse(await readFile(lockFile, "utf8"));
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || !entry.version) continue;
    if (!entry.resolved?.startsWith("https://registry.npmjs.org/")) fail(`Node dependency is not from npm registry: ${packageRoot}/${path}`);
    if (policy.node.requireIntegrity && !entry.integrity) fail(`Node dependency has no integrity: ${packageRoot}/${path}`);
  }
  for (const name of Object.keys(direct)) {
    const installed = join(root, packageRoot, "node_modules", name, "package.json");
    if (!existsSync(installed)) continue;
    const packageMeta = JSON.parse(await readFile(installed, "utf8"));
    const expected = policy.node.direct[name];
    if (packageMeta.license !== expected.license) fail(`Node license changed without policy update: ${name} (${packageMeta.license ?? "UNKNOWN"})`);
  }
  const installed = await scanNodeLicenses(join(root, packageRoot, "node_modules"));
  if (!installed && policy.node.requireInstalledLicenseScan && process.env.CI === "true") {
    fail(`Node license scan requires installed dependencies in CI: ${packageRoot}/node_modules`);
  }
}

const scanFiles = [
  "apps/web/index.html",
  "apps/web/src/main.js",
  "apps/web/src/daemon-bridge.js",
  "apps/web/src/daemon-controller.js",
  "apps/web/src/daemon-view.js",
  "apps/server/server.mjs",
  "apps/server/routes.mjs",
  "apps/server/http.mjs"
];
const source = (await Promise.all(scanFiles.map(async (file) => [file, await readFile(join(root, file), "utf8")])));
for (const [file, contents] of source) {
  for (const pattern of [/\beval\s*\(/, /\bnew\s+Function\s*\(/, /\bWebAssembly\b/, /document\.cookie/, /\blocalStorage\b/, /\bsessionStorage\b/]) {
    if (pattern.test(contents)) fail(`forbidden runtime API in ${file}: ${pattern}`);
  }
  if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(contents) && file.startsWith("apps/web/")) fail(`browser bundle contains a non-local hardcoded URL: ${file}`);
  if (/google-analytics|googletagmanager|segment\.com|plausible\.io|cdn\./i.test(contents)) fail(`analytics or CDN marker in product source: ${file}`);
}

if (failures.length) {
  console.error("dependency/security policy failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("dependency/security policy passed: locked sources, direct ownership, licenses, duplicates, and runtime APIs");

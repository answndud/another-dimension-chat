#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const packageFile = args[0];
const outputFile = args[1];
const cargoIndex = args.indexOf("--cargo-lock");
const cargoFile = cargoIndex >= 0 ? args[cargoIndex + 1] : "";
const nodeIndex = args.indexOf("--node-version");
const nodeVersion = nodeIndex >= 0 ? args[nodeIndex + 1] : process.version;
if (!packageFile || !outputFile) {
  console.error("Usage: generate_sbom.mjs PACKAGE_LOCK_JSON OUTPUT_JSON [--cargo-lock CARGO_LOCK] [--node-version VERSION]");
  process.exit(2);
}
const lock = JSON.parse(await readFile(packageFile, "utf8"));
const components = Object.entries(lock.packages || {})
  .filter(([name]) => name)
  .map(([name, packageInfo]) => ({
    type: "library",
    name: name.replace(/^node_modules\//, ""),
    version: packageInfo.version || "unknown",
    license: packageInfo.license || undefined,
  }))
  .sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`));
if (cargoFile) {
  const cargo = await readFile(cargoFile, "utf8");
  const packageBlocks = cargo.match(/\[\[package\]\][\s\S]*?(?=\n\[\[package\]\]|\s*$)/g) || [];
  for (const block of packageBlocks) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    const source = block.match(/^source = "([^"]+)"/m)?.[1];
    if (name && version) components.push({ type: "library", name: `cargo:${name}`, version, ...(source ? { purl: source } : {}) });
  }
}
components.push({ type: "framework", name: "Node.js", version: nodeVersion });
components.sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`));
const document = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: { component: { type: "application", name: "another-dimension-web" } },
  components,
};
await writeFile(path.resolve(outputFile), `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Generated SBOM with ${components.length} components: ${outputFile}`);

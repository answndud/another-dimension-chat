#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [packageFile, outputFile] = process.argv.slice(2);
if (!packageFile || !outputFile) {
  console.error("Usage: generate_sbom.mjs PACKAGE_LOCK_JSON OUTPUT_JSON");
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
const document = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: { component: { type: "application", name: "another-dimension-web" } },
  components,
};
await writeFile(path.resolve(outputFile), `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Generated SBOM with ${components.length} components: ${outputFile}`);

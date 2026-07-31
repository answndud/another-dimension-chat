#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { isForbiddenReleasePath, loadProductBoundary, PRODUCT_BOUNDARY_FILE } from "./product_boundary.mjs";

const root = path.resolve(process.argv[2] || ".");
const requiredSource = [
  "apps/web/package.json",
  "apps/server/server.mjs",
  "reference/PRODUCT_BOUNDARY.md",
  PRODUCT_BOUNDARY_FILE,
  "SECURITY.md",
];
for (const file of requiredSource) await access(path.join(root, file), constants.R_OK);
const boundary = await loadProductBoundary(root);

const release = process.argv[2] && process.argv[3] === "--release" ? root : null;
if (release) {
  const entries = [];
  const walk = async (dir, prefix = "") => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative);
      else entries.push(relative);
    }
  };
  await walk(release);
  const leaked = entries.filter((file) => isForbiddenReleasePath(file, boundary.forbiddenReleasePaths));
  if (leaked.length) throw new Error(`legacy product files leaked into release: ${leaked.join(", ")}`);
  for (const file of boundary.requiredReleaseFiles) {
    await access(path.join(release, file), constants.R_OK);
  }
  console.log(`product boundary passed: ${entries.length} release files, no legacy surface`);
  process.exit(0);
}

const boundaryDocument = await readFile(path.join(root, "reference/PRODUCT_BOUNDARY.md"), "utf8");
for (const marker of [boundary.supportedProduct, "high-risk route remains disabled", ...boundary.nonClaims]) {
  if (!boundaryDocument.toLowerCase().includes(marker.toLowerCase())) throw new Error(`product boundary missing marker: ${marker}`);
}
console.log("product boundary source checks passed");

#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const requiredSource = [
  "apps/web/package.json",
  "apps/server/server.mjs",
  "reference/PRODUCT_BOUNDARY.md",
  "SECURITY.md",
];
for (const file of requiredSource) await access(path.join(root, file), constants.R_OK);

const release = process.argv[2] && process.argv[3] === "--release" ? root : null;
if (release) {
  const forbidden = ["apps/desktop-tauri", "apps/cli", "apps/engine", "crates/transport"];
  const entries = [];
  const walk = async (dir, prefix = "") => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative);
      else entries.push(relative);
    }
  };
  await walk(release);
  const leaked = entries.filter((file) => forbidden.some((prefix) => file === prefix || file.startsWith(`${prefix}${path.sep}`)));
  if (leaked.length) throw new Error(`legacy product files leaked into release: ${leaked.join(", ")}`);
  for (const file of ["apps/web/dist/index.html", "apps/server/server.mjs", "reference/PRODUCT_BOUNDARY.md", "SECURITY.md"]) {
    await access(path.join(release, file), constants.R_OK);
  }
  console.log(`product boundary passed: ${entries.length} release files, no legacy surface`);
  process.exit(0);
}

const boundary = await readFile(path.join(root, "reference/PRODUCT_BOUNDARY.md"), "utf8");
for (const marker of ["verified browser UI bundle", "user-owned API-only relay", "high-risk route remains disabled"]) {
  if (!boundary.includes(marker)) throw new Error(`product boundary missing marker: ${marker}`);
}
console.log("product boundary source checks passed");

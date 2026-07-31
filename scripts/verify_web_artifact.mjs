#!/usr/bin/env node
import { access, readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function verifyWebArtifact(root) {
  const indexPath = path.join(root, "index.html");
  const index = await readFile(indexPath, "utf8");
  if (index.includes("/src/") || index.includes("http://") || index.includes("https://") || /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(index)) {
    throw new Error("production UI contains a source path, inline script, or external URL");
  }
  if (/<script\b(?![^>]*\bintegrity=)[^>]*src=/.test(index) || /<link\b(?![^>]*\bintegrity=)[^>]*href="\/assets\//.test(index)) {
    throw new Error("production UI asset is missing SRI integrity");
  }
  const integrityPath = path.join(root, "asset-integrity.json");
  const integrity = JSON.parse(await readFile(integrityPath, "utf8"));
  if (integrity.format !== "another-dimension-asset-integrity" || integrity.version !== 1 || !integrity.assets) throw new Error("invalid asset integrity manifest");
  async function findSourceMap(directory) {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, file.name);
      if (file.isDirectory() && file.name !== "node_modules") {
        const nested = await findSourceMap(filePath);
        if (nested) return nested;
      }
      if (file.isFile() && file.name.endsWith(".map")) return filePath;
    }
    return null;
  }
  const sourceMap = await findSourceMap(root);
  if (sourceMap) {
    throw new Error(`source map is present in production UI: ${path.relative(root, sourceMap)}`);
  }
  for (const [assetPath, expected] of Object.entries(integrity.assets)) {
    if (!assetPath.startsWith("/") || assetPath.includes("..")) throw new Error(`invalid asset path in integrity manifest: ${assetPath}`);
    const file = path.join(root, assetPath.slice(1));
    const bytes = await readFile(file);
    const digest = createHash("sha256").update(bytes).digest("base64");
    if (bytes.byteLength !== expected.bytes || digest !== expected.sha256) throw new Error(`asset integrity mismatch: ${assetPath}`);
  }
  const references = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  const sriReferences = [...index.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/assets\/[^"]+)"[^>]*integrity="sha256-([^"]+)"/g)];
  if (sriReferences.length !== references.length) throw new Error("every production asset reference must have sha256 SRI");
  for (const reference of references) {
    const file = path.join(root, reference.slice(1));
    await access(file, constants.R_OK);
    if (!integrity.assets[reference]) throw new Error(`UI asset is not in integrity manifest: ${reference}`);
    const fileInfo = await stat(file);
    if (fileInfo.size !== integrity.assets[reference].bytes) throw new Error(`UI asset size mismatch: ${reference}`);
    const sri = sriReferences.find(([, asset]) => asset === reference)?.[2];
    if (sri !== integrity.assets[reference].sha256) throw new Error(`UI asset SRI mismatch: ${reference}`);
  }
  return { assetCount: Object.keys(integrity.assets).length, references: references.length };
}

const launchedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (launchedDirectly) {
  const root = process.argv[2];
  if (!root) throw new Error("Usage: verify_web_artifact.mjs DIST_ROOT");
  const result = await verifyWebArtifact(path.resolve(root));
  console.log(`web artifact passed: ${result.assetCount} integrity entries, ${result.references} HTML references`);
}

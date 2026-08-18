#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { verifyManifest } from "./release_manifest.mjs";
import { isForbiddenReleasePath, loadProductBoundary } from "./product_boundary.mjs";
import { verifyWebArtifact } from "./verify_web_artifact.mjs";
import { authorizeReleaseKey, verifyTrustManifest } from "./verify_release_trust.mjs";

const [root, ...args] = process.argv.slice(2);
if (!root) throw new Error("Usage: verify_private_release_gate.mjs RELEASE_ROOT --public-key PEM_FILE --trust-manifest JSON --trust-manifest-key PEM_FILE [--min-version VERSION] [--revoked-key-id ID]");
let publicKey;
let minVersion;
let trustManifest;
let trustManifestKey;
const revokedKeyIds = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--public-key") publicKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--min-version") minVersion = args[++index];
  else if (args[index] === "--trust-manifest") trustManifest = JSON.parse(await readFile(args[++index], "utf8"));
  else if (args[index] === "--trust-manifest-key") trustManifestKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--revoked-key-id") revokedKeyIds.push(args[++index]);
  else throw new Error(`unknown argument: ${args[index]}`);
}
if (!publicKey) throw new Error("A trusted public key is required for the private release gate.");
if (!trustManifest || !trustManifestKey) throw new Error("A signed trust manifest and its bootstrap public key are required for the private release gate.");
const boundary = await loadProductBoundary(root);
for (const file of boundary.requiredReleaseFiles) await access(path.join(root, file), constants.R_OK);
await access(path.join(root, "runtime/node"), constants.X_OK);
await access(path.join(root, "bin/another-dimension-daemon"), constants.X_OK);
await verifyWebArtifact(path.join(root, "apps/web/dist"));
const releaseEntries = [];
const walk = async (dir, prefix = "") => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative);
    else releaseEntries.push(relative);
  }
};
await walk(root);
const leaked = releaseEntries.filter((file) => isForbiddenReleasePath(file, boundary.forbiddenReleasePaths));
if (leaked.length) throw new Error(`legacy product surface is present in private release: ${leaked.join(", ")}`);
const result = await verifyManifest(root, { publicKey, requireSignature: true, minVersion, revokedKeyIds });
verifyTrustManifest(trustManifest, trustManifestKey);
authorizeReleaseKey(trustManifest, result.releaseVersion, publicKey);
const provenance = JSON.parse(await readFile(path.join(root, "RELEASE-PROVENANCE.json"), "utf8"));
const sourceCommit = String(provenance.sourceCommit || "").toLowerCase();
if (!/^[0-9a-f]{40,64}$/.test(sourceCommit)) throw new Error("private release provenance requires a full 40-64 character Git revision");
console.log(`private release gate passed: signed ${result.releaseVersion}, ${result.fileCount} files, key ${result.keyId}, trust manifest authorized`);

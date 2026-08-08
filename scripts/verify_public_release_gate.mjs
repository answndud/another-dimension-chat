#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { verifyManifest } from "./release_manifest.mjs";
import { isForbiddenReleasePath, loadProductBoundary } from "./product_boundary.mjs";
import { verifyWebArtifact } from "./verify_web_artifact.mjs";
import { authorizeReleaseKey, verifyTrustManifest } from "./verify_release_trust.mjs";
import { verifySignoff } from "./verify_security_review_signoff.mjs";

const [root, ...args] = process.argv.slice(2);
if (!root) throw new Error("Usage: verify_public_release_gate.mjs RELEASE_ROOT --public-key PEM_FILE --review-signoff JSON_FILE --reviewer-public-key PEM_FILE [--min-version VERSION]");
let publicKey;
let minVersion;
let trustManifest;
let trustManifestKey;
let reviewSignoff;
let reviewerPublicKey;
const revokedKeyIds = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--public-key") publicKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--min-version") minVersion = args[++index];
  else if (args[index] === "--trust-manifest") trustManifest = JSON.parse(await readFile(args[++index], "utf8"));
  else if (args[index] === "--trust-manifest-key") trustManifestKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--review-signoff") reviewSignoff = JSON.parse(await readFile(args[++index], "utf8"));
  else if (args[index] === "--reviewer-public-key") reviewerPublicKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--revoked-key-id") revokedKeyIds.push(args[++index]);
  else throw new Error(`unknown argument: ${args[index]}`);
}
if (!publicKey) throw new Error("A trusted public key is required for the public release gate.");
if (!reviewSignoff || !reviewerPublicKey) throw new Error("A signed independent security review and reviewer public key are required for the public release gate.");
const boundary = await loadProductBoundary(root);
const required = boundary.requiredReleaseFiles;
for (const file of required) await access(path.join(root, file), constants.R_OK);
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
if (leaked.length) throw new Error(`legacy product surface is present in public release: ${leaked.join(", ")}`);
const result = await verifyManifest(root, { publicKey, requireSignature: true, minVersion, revokedKeyIds });
if (trustManifest || trustManifestKey) {
  if (!trustManifest || !trustManifestKey) throw new Error("trust manifest and bootstrap key must be supplied together");
  verifyTrustManifest(trustManifest, trustManifestKey);
  authorizeReleaseKey(trustManifest, result.releaseVersion, publicKey);
}
const review = verifySignoff(reviewSignoff, reviewerPublicKey);
console.log(`public release gate passed: signed ${result.releaseVersion}, ${result.fileCount} files, key ${result.keyId}, review=${review.decision}`);

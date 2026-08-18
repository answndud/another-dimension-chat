#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { verifyManifest } from "./release_manifest.mjs";
import { verifyWebArtifact } from "./verify_web_artifact.mjs";
import { authorizeReleaseKey, verifyTrustManifest } from "./verify_release_trust.mjs";

const [root, ...args] = process.argv.slice(2);
if (!root) throw new Error("Usage: verify_client_release_gate.mjs ROOT --public-key PEM --trust-manifest JSON --trust-manifest-key PEM");
const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] || "" : ""; };
const publicKeyPath = value("--public-key");
const trustManifestPath = value("--trust-manifest");
const trustManifestKeyPath = value("--trust-manifest-key");
const publicKey = await readFile(publicKeyPath, "utf8");
const trustManifest = JSON.parse(await readFile(trustManifestPath, "utf8"));
const trustManifestKey = await readFile(trustManifestKeyPath, "utf8");
for (const file of ["release-manifest.json", "RELEASE-PROVENANCE.json", "bin/another-dimension-daemon"]) await access(join(root, file), constants.R_OK);
await verifyWebArtifact(join(root, "apps/web/dist"));
const result = await verifyManifest(root, { publicKey, requireSignature: true });
verifyTrustManifest(trustManifest, trustManifestKey);
authorizeReleaseKey(trustManifest, result.releaseVersion, publicKey);
const provenance = JSON.parse(await readFile(join(root, "RELEASE-PROVENANCE.json"), "utf8"));
if (!/^[0-9a-f]{40,64}$/i.test(String(provenance.sourceCommit || ""))) throw new Error("client provenance is invalid");
console.log(`client release gate passed: signed ${result.releaseVersion}, ${result.fileCount} files, key ${result.keyId}`);

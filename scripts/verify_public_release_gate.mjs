#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { verifyManifest } from "./release_manifest.mjs";

const [root, ...args] = process.argv.slice(2);
if (!root) throw new Error("Usage: verify_public_release_gate.mjs RELEASE_ROOT --public-key PEM_FILE [--min-version VERSION]");
let publicKey;
let minVersion;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--public-key") publicKey = await readFile(args[++index], "utf8");
  else if (args[index] === "--min-version") minVersion = args[++index];
  else throw new Error(`unknown argument: ${args[index]}`);
}
if (!publicKey) throw new Error("A trusted public key is required for the public release gate.");
const required = ["README.md", "README.ko.md", "SECURITY.md", "SBOM.cyclonedx.json", "release-manifest.json"];
for (const file of required) await access(path.join(root, file), constants.R_OK);
const result = await verifyManifest(root, { publicKey, requireSignature: true, minVersion });
console.log(`public release gate passed: signed ${result.releaseVersion}, ${result.fileCount} files, key ${result.keyId}`);

#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { verifyManifest } from './release_manifest.mjs';

const [root, ...args] = process.argv.slice(2);
if (!root) { console.error('Usage: verify_release_manifest.mjs RELEASE_ROOT [--require-signature] [--public-key PEM_FILE]'); process.exit(2); }
let requireSignature = false;
let publicKey;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--require-signature') requireSignature = true;
  else if (args[index] === '--public-key') publicKey = await readFile(args[++index], 'utf8');
  else throw new Error(`unknown argument: ${args[index]}`);
}
const result = await verifyManifest(root, { requireSignature, publicKey });
console.log(`verified ${result.signed ? 'signed' : 'unsigned-development'} release ${result.releaseVersion}: ${result.fileCount} files${result.keyId ? ` (key ${result.keyId})` : ''}`);

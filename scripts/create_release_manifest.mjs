#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { writeManifest } from './release_manifest.mjs';

const [root, ...args] = process.argv.slice(2);
if (!root) { console.error('Usage: create_release_manifest.mjs RELEASE_ROOT [--version VERSION] [--private-key PEM_FILE]'); process.exit(2); }
let version = '0.0.0';
let privateKey;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--version') version = args[++index];
  else if (args[index] === '--private-key') privateKey = await readFile(args[++index], 'utf8');
  else throw new Error(`unknown argument: ${args[index]}`);
}
const manifest = await writeManifest(root, { version, privateKey });
console.log(`${manifest.signature ? 'signed' : 'unsigned-development'} release manifest: ${manifest.files.length} files`);

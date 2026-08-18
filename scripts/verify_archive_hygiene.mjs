#!/usr/bin/env node
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";

const [root] = process.argv.slice(2);
if (!root) throw new Error("Usage: verify_archive_hygiene.mjs RELEASE_ROOT");

const SECRET_HEADER = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;
const SECRET_BASENAMES = new Set([
  "daemon.lock",
  "profile.keychain",
  "profile.id",
  "relay.pid",
  "relay-receipt-signing-key.pem",
  "release-signing-key.pem",
  "release-trust.json",
  "bootstrap-private.pem",
]);
const SECRET_EXTENSIONS = new Set([".log", ".sqlite", ".adrecovery", ".passphrase", ".key"]);
const FORBIDDEN_SEGMENTS = new Set(["target", ".build-cache", ".git", ".cargo", ".local"]);
const ALLOWED_MODE = 0o022; // no group/other write on any file or directory

const failures = [];
async function scan(current) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (FORBIDDEN_SEGMENTS.has(entry.name)) failures.push(`forbidden directory in release: ${path.relative(root, absolute)}`);
      else await scan(absolute);
      continue;
    }
    const relative = path.relative(root, absolute);
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink()) {
      failures.push(`unsupported release entry: ${relative}`);
      continue;
    }
    if ((info.mode & ALLOWED_MODE) !== 0) failures.push(`over-broad permissions (${(info.mode & 0o777).toString(8)}): ${relative}`);
    const basename = entry.name.toLowerCase();
    if (SECRET_BASENAMES.has(entry.name) || SECRET_EXTENSIONS.has(path.extname(basename))) {
      failures.push(`secret/data/log file in release: ${relative}`);
      continue;
    }
    const contents = await readFile(absolute);
    if (SECRET_HEADER.test(contents)) failures.push(`private key material in release: ${relative}`);
  }
}

const rootInfo = await lstat(root).catch(() => null);
if (!rootInfo?.isDirectory()) throw new Error("release root is not a directory");
if ((rootInfo.mode & ALLOWED_MODE) !== 0) failures.push("release root permissions are over-broad");
await scan(root);
if (failures.length) throw new Error(`archive hygiene failed:\n${failures.join("\n")}`);
console.log(`archive hygiene passed: no private keys, no over-broad permissions, no data/log/temp files`);

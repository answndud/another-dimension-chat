#!/usr/bin/env node
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import { chmod, lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
const Database = createRequire(import.meta.url)("../apps/server/node_modules/better-sqlite3");

const MAGIC = "ADRELAYBACKUP1";
const VERSION = 1;
const MAX_BACKUP_BYTES = 192 * 1024 * 1024;
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const SCRYPT_OPTIONS = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

function usage() {
  console.error("Usage: node scripts/relay_backup.mjs backup|restore --data-dir DIR --file PATH");
  process.exitCode = 2;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function passphrase() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const value = Buffer.concat(chunks).toString("utf8");
  const normalized = value.endsWith("\n") ? value.slice(0, -1) : value;
  if (!normalized || normalized.includes("\0") || normalized.includes("\n")) throw new Error("backup passphrase must be one non-empty line");
  return normalized;
}

async function regularFile(path) {
  const info = await lstat(path).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (!info) return false;
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`backup path is not a regular file: ${path}`);
  return true;
}

async function collectFiles(dataDir) {
  const root = resolve(dataDir);
  const names = ["relay.sqlite", "inbox-capability", "local-access-capability", "local-ui-url", "relay-receipt-signing-key.pem"];
  const files = [];
  for (const name of names) {
    const path = join(root, name);
    if (await regularFile(path)) files.push(path);
  }
  if (!files.some((path) => path.endsWith("/relay.sqlite"))) throw new Error("relay.sqlite is missing; start the relay once before backing it up");
  const blobs = join(root, "blobs");
  const blobInfo = await lstat(blobs).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (blobInfo) {
    if (!blobInfo.isDirectory() || blobInfo.isSymbolicLink()) throw new Error("relay blob directory must be a real directory");
    for (const name of await readdir(blobs)) {
      if (!/^[A-Za-z0-9_-]{32,128}\.(?:blob|meta\.json)$/.test(name)) throw new Error(`unexpected blob file: ${name}`);
      const path = join(blobs, name);
      if (await regularFile(path)) files.push(path);
    }
  }
  let total = 0;
  const entries = [];
  for (const path of files) {
    const info = await stat(path);
    if (info.size > MAX_FILE_BYTES || (total += info.size) > MAX_BACKUP_BYTES) throw new Error("relay backup exceeds the size limit");
    const data = await readFile(path);
    const relativePath = relative(root, path).split("\\").join("/");
    entries.push({ path: relativePath, mode: info.mode & 0o777, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), data: data.toString("base64") });
  }
  return entries;
}

function encrypt(payload, secret) {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = scryptSync(secret, salt, 32, SCRYPT_OPTIONS);
  const header = { format: MAGIC, version: VERSION, kdf: "scrypt", salt: salt.toString("base64url"), nonce: nonce.toString("base64url") };
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const aad = Buffer.from(JSON.stringify(header));
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${MAGIC}\n${JSON.stringify({ ...header, tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64") })}\n`;
}

function decrypt(raw, secret) {
  const [magic, encoded] = raw.trimEnd().split("\n");
  if (magic !== MAGIC) throw new Error("unsupported relay backup format");
  let envelope;
  try { envelope = JSON.parse(encoded); } catch { throw new Error("relay backup header is corrupt"); }
  if (envelope.format !== MAGIC || envelope.version !== VERSION || envelope.kdf !== "scrypt") throw new Error("unsupported relay backup version");
  const salt = Buffer.from(String(envelope.salt || ""), "base64url");
  const nonce = Buffer.from(String(envelope.nonce || ""), "base64url");
  const tag = Buffer.from(String(envelope.tag || ""), "base64url");
  const ciphertext = Buffer.from(String(envelope.ciphertext || ""), "base64");
  if (salt.length !== 16 || nonce.length !== 12 || tag.length !== 16 || ciphertext.length > MAX_BACKUP_BYTES) throw new Error("relay backup envelope is invalid");
  const key = scryptSync(secret, salt, 32, SCRYPT_OPTIONS);
  const header = { format: MAGIC, version: VERSION, kdf: "scrypt", salt: envelope.salt, nonce: envelope.nonce };
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(Buffer.from(JSON.stringify(header)));
  decipher.setAuthTag(tag);
  let payload;
  try { payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")); } catch { throw new Error("relay backup passphrase or authentication is invalid"); }
  if (!payload || payload.format !== MAGIC || payload.version !== VERSION || !Array.isArray(payload.files)) throw new Error("relay backup payload is invalid");
  return payload.files;
}

function validatePath(value) {
  return typeof value === "string" && value !== "" && !value.startsWith("/") && !value.includes("..") && (value === "relay.sqlite" || ["inbox-capability", "local-access-capability", "local-ui-url", "relay-receipt-signing-key.pem"].includes(value) || /^blobs\/[A-Za-z0-9_-]{32,128}\.(?:blob|meta\.json)$/.test(value));
}

async function validateEntries(files) {
  const seen = new Set();
  let total = 0;
  for (const entry of files) {
    if (!entry || !validatePath(entry.path) || seen.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > MAX_FILE_BYTES || typeof entry.data !== "string") throw new Error("relay backup file manifest is invalid");
    seen.add(entry.path);
    const data = Buffer.from(entry.data, "base64");
    if (data.length !== entry.bytes || (total += data.length) > MAX_BACKUP_BYTES || createHash("sha256").update(data).digest("hex") !== entry.sha256) throw new Error("relay backup file integrity check failed");
  }
  if (!seen.has("relay.sqlite")) throw new Error("relay backup has no SQLite database");
}

async function atomicWrite(path, data) {
  const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, data, { mode: 0o600 });
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function backup(dataDir, output) {
  const files = await collectFiles(dataDir);
  await atomicWrite(resolve(output), encrypt({ format: MAGIC, version: VERSION, createdAt: Date.now(), files }, await passphrase()));
  console.log(`encrypted relay backup created: ${resolve(output)} (${files.length} files)`);
}

async function restore(dataDir, input) {
  const root = resolve(dataDir);
  const info = await lstat(root).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error("restore data directory must be a real directory");
  if (info && (await readdir(root)).length > 0) throw new Error("restore requires an empty data directory");
  const files = decrypt(await readFile(resolve(input), "utf8"), await passphrase());
  await validateEntries(files);
  const parent = dirname(root);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const stage = await mkdtemp(join(parent, ".another-dimension-relay-restore-"));
  try {
    await mkdir(join(stage, "blobs"), { recursive: true, mode: 0o700 });
    for (const entry of files) {
      const path = join(stage, entry.path);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      // Relay backups contain capabilities, signing keys, and encrypted
      // mailbox data. Never restore caller-controlled archive mode bits as
      // broader permissions; every restored file remains private.
      await writeFile(path, Buffer.from(entry.data, "base64"), { mode: 0o600 });
      await chmod(path, 0o600);
    }
    const db = new Database(join(stage, "relay.sqlite"), { readonly: true });
    if (db.pragma("integrity_check", { simple: true }) !== "ok") { db.close(); throw new Error("restored relay SQLite integrity check failed"); }
    db.close();
    await chmod(stage, 0o700);
    if (info) {
      const displaced = `${root}.before-restore-${randomBytes(8).toString("hex")}`;
      await rename(root, displaced);
      try { await rename(stage, root); await rm(displaced, { recursive: true, force: true }); }
      catch (error) { await rename(displaced, root).catch(() => {}); throw error; }
    } else await rename(stage, root);
    console.log(`relay backup restored: ${root} (${files.length} files)`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

const [command, ...args] = process.argv.slice(2);
const dataDir = option(args, "--data-dir");
const file = option(args, "--file");
if (!command || !dataDir || !file || !["backup", "restore"].includes(command) || args.includes("--help")) usage();
else {
  try { await (command === "backup" ? backup(dataDir, file) : restore(dataDir, file)); }
  catch (error) { console.error(`relay ${command} failed: ${error.message}`); process.exitCode = 1; }
}

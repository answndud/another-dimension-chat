#!/usr/bin/env node
// Generate an operator-owned relay receipt key without printing private material.
import { createHash, createPublicKey, generateKeyPairSync } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
};
const outputDir = value("--output-dir");
if (!outputDir || args.includes("--help")) {
  console.error("Usage: node scripts/relay_receipt_keygen.mjs --output-dir /secure/relay-key");
  process.exitCode = outputDir ? 0 : 2;
} else {
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const privatePath = resolve(directory, "relay-receipt-signing-key.pem");
  const publicPath = resolve(directory, "relay-receipt-public-key.pem");
  const pair = generateKeyPairSync("ed25519");
  const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  const publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
  await writeFile(privatePath, privatePem, { mode: 0o600, flag: "wx" });
  try {
    await writeFile(publicPath, publicPem, { mode: 0o644, flag: "wx" });
  } catch (error) {
    await import("node:fs/promises").then(({ rm }) => rm(privatePath, { force: true }));
    throw error;
  }
  const raw = createPublicKey(publicPem).export({ type: "spki", format: "der" }).subarray(-32);
  const fingerprint = createHash("sha256").update(raw).digest("hex");
  console.log(`relay receipt private key: ${privatePath}`);
  console.log(`relay receipt public key: ${publicPath}`);
  console.log(`relay receipt fingerprint: ${fingerprint}`);
  console.log("private key material was not printed; deliver only the public key and fingerprint");
}

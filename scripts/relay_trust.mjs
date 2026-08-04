#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, createPublicKey, sign, verify } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const hex = (value) => Buffer.from(value).toString("hex");
const asPublic = (key) => key?.type === "public" ? key : createPublicKey(key);
const rawPublic = (key) => asPublic(key).export({ type: "spki", format: "der" }).subarray(-32);
const keyId = (raw) => createHash("sha256").update(raw).digest("hex");
const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index === -1 ? "" : args[index + 1] || ""; };

export function createRelayTrust({ bootstrapPrivateKey, relayPublicKey, revokedKeyIds = [] }) {
  const bootstrapRaw = rawPublic(bootstrapPrivateKey);
  const relayRaw = rawPublic(relayPublicKey);
  const payload = `bootstrap=${hex(bootstrapRaw)}\nkey=${keyId(relayRaw)},${hex(relayRaw)}\n${revokedKeyIds.map((id) => `revoked=${id}\n`).join("")}payload-end\n`;
  return `ADRELAYTRUST1\n${payload}signature=${sign(null, Buffer.from(payload), bootstrapPrivateKey).toString("hex")}\n`;
}

export function verifyRelayTrust(text, bootstrapPublicKey, relayPublicKey) {
  const lines = String(text).split("\n");
  assert.equal(lines.shift(), "ADRELAYTRUST1");
  const bootstrap = rawPublic(bootstrapPublicKey);
  assert.equal(lines.shift(), `bootstrap=${hex(bootstrap)}`);
  const payloadLines = [`bootstrap=${hex(bootstrap)}`];
  let keyLine = "";
  while (lines.length) {
    const line = lines.shift();
    if (line === "payload-end") { payloadLines.push("payload-end"); break; }
    if (!line.startsWith("key=") && !line.startsWith("revoked=")) throw new Error("invalid relay trust field");
    payloadLines.push(line);
    if (line.startsWith("key=")) keyLine = line;
  }
  const signatureLine = lines.shift();
  assert.match(signatureLine, /^signature=[0-9a-f]{128}$/);
  if (lines.length === 1 && lines[0] === "") lines.shift();
  assert.equal(lines.length, 0);
  const payload = `${payloadLines.join("\n")}\n`;
  assert.equal(verify(null, Buffer.from(payload), asPublic(bootstrapPublicKey), Buffer.from(signatureLine.slice(10), "hex")), true);
  const relayRaw = rawPublic(relayPublicKey);
  assert.equal(keyLine, `key=${keyId(relayRaw)},${hex(relayRaw)}`);
  return keyId(relayRaw);
}

async function main() {
  const privatePath = value("--bootstrap-private-key");
  const relayPath = value("--relay-public-key");
  const output = value("--output");
  if (!privatePath || !relayPath || !output) throw new Error("Usage: relay_trust.mjs --bootstrap-private-key PEM --relay-public-key PEM --output FILE");
  const manifest = createRelayTrust({ bootstrapPrivateKey: await readFile(privatePath), relayPublicKey: await readFile(relayPath) });
  await writeFile(output, manifest, { mode: 0o600 });
  console.log(`relay trust manifest written: ${output}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();

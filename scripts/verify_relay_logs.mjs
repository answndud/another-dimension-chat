#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const source = await readFile("apps/server/server.mjs", "utf8");
const forbiddenInLogLines = [
  "inboxCapability",
  "localAccessCapability",
  "inboxUrl",
  "envelope",
  "invite",
  "token",
  "peer",
];
const failures = [];
for (const [index, line] of source.split("\n").entries()) {
  if (!/console\.(log|warn|error)\s*\(/.test(line)) continue;
  for (const marker of forbiddenInLogLines) if (line.includes(marker)) failures.push(`apps/server/server.mjs:${index + 1} log contains ${marker}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("relay log scan passed: startup and failure logs contain no capability, invite, envelope, token, peer, or endpoint variable");

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "");
if (!root) throw new Error("Usage: verify_security_review_bundle.mjs BUNDLE_DIRECTORY");
const projectIndex = process.argv.indexOf("--project-dir");
const projectDir = projectIndex >= 0 && process.argv[projectIndex + 1] ? path.resolve(process.argv[projectIndex + 1]) : null;
const forbidden = [
  { name: "private-key-pem", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/i },
  { name: "bearer-fragment", pattern: /#(?:relay|local)=(?!\.\.\.)[^\s)"'<>]+/i },
  { name: "invite-or-envelope-value", pattern: /(?:ADINVITE|ADENVWEB)\.[A-Za-z0-9+/_=-]{16,}/ },
  { name: "ipv4-address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
];
const required = ["REVIEW-MANIFEST.json", "source", "review", "evidence/STATUS.json"];
for (const relative of required) await access(path.join(root, relative), constants.R_OK);
const manifest = JSON.parse(await readFile(path.join(root, "REVIEW-MANIFEST.json"), "utf8"));
if (manifest.format !== "another-dimension-security-review-bundle" || manifest.version !== 1) throw new Error("unsupported review bundle format");
if (manifest.claims?.independentReview !== "not-provided" || manifest.claims?.productionReady !== false || manifest.claims?.highRiskAllowed !== false) {
  throw new Error("review bundle claims an unearned security status");
}
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else result.push(file);
  }
  return result;
}
for (const file of await walk(root)) {
  const value = await readFile(file, "utf8").catch(() => null);
  if (value === null) continue;
  for (const rule of forbidden) if (rule.pattern.test(value)) throw new Error(`${rule.name} found in ${path.relative(root, file)}`);
}
for (const entry of manifest.contents.sourceFiles || []) {
  if (path.isAbsolute(entry.path) || entry.path.includes("..") || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isInteger(entry.bytes) || entry.bytes < 0) {
    throw new Error(`invalid source hash entry: ${entry.path}`);
  }
  if (projectDir) {
    const file = path.join(projectDir, entry.path);
    const bytes = await readFile(file);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) throw new Error(`source hash mismatch: ${entry.path}`);
  }
}
console.log(`security review bundle verified: ${manifest.sourceRevision}, ${manifest.contents.sourceFiles.length} source hashes, redaction passed${projectDir ? ", source hash comparison passed" : ""}`);

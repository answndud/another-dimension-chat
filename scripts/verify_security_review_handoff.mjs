#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifySignoff } from "./verify_security_review_signoff.mjs";

const FORMAT = "another-dimension-security-review-bundle";
const VERSION = 1;

export function verifyHandoff(manifest, signoff, reviewerPublicKey) {
  if (manifest?.format !== FORMAT || manifest.version !== VERSION) throw new Error("unsupported review bundle format");
  if (!manifest.sourceRevision || !/^[0-9a-f]{7,64}$/.test(manifest.sourceRevision)) throw new Error("review bundle source revision is missing");
  if (manifest.claims?.independentReview !== "not-provided" || manifest.claims?.productionReady !== false || manifest.claims?.highRiskAllowed !== false) {
    throw new Error("review bundle claims an unearned security status");
  }
  const result = verifySignoff(signoff, reviewerPublicKey);
  if (result.sourceRevision !== manifest.sourceRevision) throw new Error("sign-off source revision does not match review bundle");
  return result;
}

async function verifyFiles(bundleDir, signoffPath, publicKeyPath) {
  const manifest = JSON.parse(await readFile(path.join(bundleDir, "REVIEW-MANIFEST.json"), "utf8"));
  const signoff = JSON.parse(await readFile(signoffPath, "utf8"));
  const reviewerPublicKey = await readFile(publicKeyPath, "utf8");
  return verifyHandoff(manifest, signoff, reviewerPublicKey);
}

async function fixture() {
  const keys = generateKeyPairSync("ed25519");
  const sourceRevision = "0123456789abcdef";
  const base = {
    format: "another-dimension-independent-review-signoff", version: 1, status: "signed", independentReviewer: true,
    sourceRevision, reviewedAt: "2026-08-03T00:00:00Z",
    reviewer: { organization: "fixture-review-organization", identityCheck: "external-record-fixture" },
    scopeCovered: ["protocol", "browser", "storage", "relay", "release", "transport"],
    scopeExcluded: ["compromised-device protection"], decision: "experimental-only",
    findings: [], residualRisk: ["fixture only"], signature: null,
  };
  const publicKey = keys.publicKey;
  const keyId = createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex").slice(0, 32);
  const signoff = {
    ...base,
    signature: { algorithm: "Ed25519", keyId, value: sign(null, Buffer.from(JSON.stringify({ ...base, signature: null })), keys.privateKey).toString("base64") },
  };
  const manifest = { format: FORMAT, version: VERSION, sourceRevision, claims: { independentReview: "not-provided", productionReady: false, highRiskAllowed: false } };
  assert.equal(verifyHandoff(manifest, signoff, publicKey).sourceRevision, sourceRevision);
  assert.throws(() => verifyHandoff({ ...manifest, sourceRevision: "fedcba9876543210" }, signoff, publicKey), /does not match/);
  console.log("security review handoff fixture passed: bundle/sign-off revision binding -> mismatch rejection");
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args[0] === "--fixture") await fixture();
  else {
    if (args.length !== 3) throw new Error("Usage: verify_security_review_handoff.mjs BUNDLE_DIRECTORY SIGNOFF_JSON REVIEWER_PUBLIC_KEY");
    const result = await verifyFiles(path.resolve(args[0]), path.resolve(args[1]), path.resolve(args[2]));
    console.log(`security review handoff verified: ${result.sourceRevision}, decision=${result.decision}, reviewerKey=${result.reviewerKeyId}`);
  }
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FORMAT = "another-dimension-independent-review-signoff";
const VERSION = 1;
const decisions = new Set(["reject", "experimental-only", "low-risk-release"]);
function canonical(value) { return JSON.stringify({ ...value, signature: null }); }
function asPublicKey(value) { return value?.type === "public" ? value : createPublicKey(value); }
function keyId(publicKey) { return createHash("sha256").update(asPublicKey(publicKey).export({ type: "spki", format: "der" })).digest("hex").slice(0, 32); }
export function verifySignoff(signoff, reviewerPublicKey) {
  if (signoff?.format !== FORMAT || signoff.version !== VERSION) throw new Error("unsupported independent review sign-off");
  if (signoff.status !== "signed" || signoff.independentReviewer !== true) throw new Error("independent reviewer sign-off is not asserted");
  if (!signoff.sourceRevision || !/^[0-9a-f]{7,64}$/.test(signoff.sourceRevision)) throw new Error("sign-off source revision is missing");
  if (!signoff.reviewedAt || !signoff.reviewer?.organization || !signoff.reviewer?.identityCheck) throw new Error("reviewer identity and review date are required");
  if (!Array.isArray(signoff.scopeCovered) || !Array.isArray(signoff.scopeExcluded) || signoff.scopeCovered.length === 0) throw new Error("review scope is incomplete");
  if (!decisions.has(signoff.decision)) throw new Error("unsupported review decision");
  if (!signoff.signature || signoff.signature.algorithm !== "Ed25519" || typeof signoff.signature.keyId !== "string" || typeof signoff.signature.value !== "string") throw new Error("review signature is missing or invalid");
  const publicKey = asPublicKey(reviewerPublicKey);
  if (keyId(publicKey) !== signoff.signature.keyId) throw new Error("reviewer public key fingerprint mismatch");
  if (!verify(null, Buffer.from(canonical(signoff)), publicKey, Buffer.from(signoff.signature.value, "base64"))) throw new Error("invalid independent review signature");
  return { sourceRevision: signoff.sourceRevision, decision: signoff.decision, reviewerKeyId: signoff.signature.keyId };
}

async function fixture() {
  const keys = generateKeyPairSync("ed25519");
  const base = {
    format: FORMAT, version: VERSION, status: "signed", independentReviewer: true,
    sourceRevision: "0123456789abcdef", reviewedAt: "2026-08-03T00:00:00Z",
    reviewer: { organization: "fixture-review-organization", identityCheck: "external-record-fixture" },
    scopeCovered: ["protocol", "browser", "storage", "relay", "release", "transport"],
    scopeExcluded: ["compromised-device protection"], decision: "experimental-only",
    findings: [], residualRisk: ["fixture only"], signature: null,
  };
  const signed = { ...base, signature: { algorithm: "Ed25519", keyId: keyId(keys.publicKey), value: sign(null, Buffer.from(canonical(base)), keys.privateKey).toString("base64") } };
  assert.equal(verifySignoff(signed, keys.publicKey).decision, "experimental-only");
  assert.throws(() => verifySignoff({ ...base, status: "unsigned" }, keys.publicKey), /not asserted/);
  const tampered = structuredClone(signed); tampered.sourceRevision = "fffffffffffffff";
  assert.throws(() => verifySignoff(tampered, keys.publicKey), /invalid independent review signature/);
  assert.throws(() => verifySignoff(signed, generateKeyPairSync("ed25519").publicKey), /fingerprint mismatch/);
  console.log("security review sign-off fixture passed: signed revision -> unsigned rejection -> tamper rejection -> wrong reviewer key rejection");
}

const launchedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (launchedDirectly && process.argv[2] === "--fixture") await fixture();
else if (launchedDirectly) {
  const [signoffPath, publicKeyPath] = process.argv.slice(2);
  if (!signoffPath || !publicKeyPath) throw new Error("Usage: verify_security_review_signoff.mjs --fixture | SIGNOFF_JSON REVIEWER_PUBLIC_KEY");
  const signoff = JSON.parse(await readFile(signoffPath, "utf8"));
  const publicKey = await readFile(publicKeyPath, "utf8");
  const result = verifySignoff(signoff, publicKey);
  console.log(`independent review sign-off verified: ${result.sourceRevision}, decision=${result.decision}, reviewerKey=${result.reviewerKeyId}`);
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const TRUST_FORMAT = "another-dimension-release-trust";
export const TRUST_VERSION = 1;

function canonicalJson(value) { return JSON.stringify(value); }
function asPublicKey(value) { return value?.type === "public" ? value : createPublicKey(value); }
function versionParts(value) {
  const parts = String(value).split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isSafeInteger(part) || part < 0)) throw new Error("trust versions must use MAJOR.MINOR.PATCH");
  return parts;
}
export function compareVersions(left, right) {
  const a = versionParts(left); const b = versionParts(right);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
export function keyIdFor(publicKey) {
  return createHash("sha256").update(asPublicKey(publicKey).export({ type: "spki", format: "der" })).digest("hex").slice(0, 32);
}
function unsignedTrustManifest(manifest) { return { ...manifest, signature: null }; }

export function createTrustManifest({ rootPrivateKey, releaseKeys, minimumReleaseVersion = "0.0.0", revokedKeyIds = [] }) {
  const keys = releaseKeys.map(({ publicKey, validFromVersion = "0.0.0", validUntilVersion = null }) => {
    const key = asPublicKey(publicKey);
    const keyId = keyIdFor(key);
    return { keyId, publicKey: key.export({ type: "spki", format: "pem" }), validFromVersion, validUntilVersion };
  });
  const manifest = {
    format: TRUST_FORMAT,
    trustVersion: TRUST_VERSION,
    policy: { minimumReleaseVersion },
    keys,
    revokedKeyIds: [...new Set(revokedKeyIds)].sort(),
    signature: null,
  };
  const rootPublicKey = asPublicKey(rootPrivateKey);
  manifest.signature = {
    algorithm: "Ed25519",
    keyId: keyIdFor(rootPublicKey),
    value: sign(null, Buffer.from(canonicalJson(unsignedTrustManifest(manifest))), rootPrivateKey).toString("base64"),
  };
  return manifest;
}

export function verifyTrustManifest(manifest, bootstrapPublicKey) {
  if (!manifest || manifest.format !== TRUST_FORMAT || manifest.trustVersion !== TRUST_VERSION) throw new Error("unsupported release trust manifest");
  if (!manifest.policy || typeof manifest.policy.minimumReleaseVersion !== "string") throw new Error("trust manifest minimum version is missing");
  versionParts(manifest.policy.minimumReleaseVersion);
  if (!Array.isArray(manifest.keys) || manifest.keys.length === 0) throw new Error("trust manifest has no release keys");
  if (!Array.isArray(manifest.revokedKeyIds) || manifest.revokedKeyIds.some((id) => typeof id !== "string")) throw new Error("invalid trust manifest revocation list");
  const signature = manifest.signature;
  if (signature?.algorithm !== "Ed25519" || typeof signature.keyId !== "string" || typeof signature.value !== "string") throw new Error("trust manifest signature is missing or invalid");
  const rootKey = asPublicKey(bootstrapPublicKey);
  if (keyIdFor(rootKey) !== signature.keyId) throw new Error("trust manifest bootstrap fingerprint mismatch");
  if (!verify(null, Buffer.from(canonicalJson(unsignedTrustManifest(manifest))), rootKey, Buffer.from(signature.value, "base64"))) throw new Error("invalid trust manifest signature");
  const ids = new Set();
  for (const entry of manifest.keys) {
    if (!entry || typeof entry.keyId !== "string" || typeof entry.publicKey !== "string" || typeof entry.validFromVersion !== "string") throw new Error("invalid trust manifest key entry");
    versionParts(entry.validFromVersion);
    if (entry.validUntilVersion !== null) { if (typeof entry.validUntilVersion !== "string" || compareVersions(entry.validFromVersion, entry.validUntilVersion) > 0) throw new Error(`invalid trust key validity: ${entry.keyId}`); }
    if (keyIdFor(entry.publicKey) !== entry.keyId || ids.has(entry.keyId)) throw new Error(`trust key fingerprint mismatch or duplicate: ${entry.keyId}`);
    ids.add(entry.keyId);
  }
  for (const revoked of manifest.revokedKeyIds) if (!ids.has(revoked)) throw new Error(`trust manifest revokes unknown key: ${revoked}`);
  return { manifest, bootstrapKeyId: signature.keyId };
}

export function authorizeReleaseKey(manifest, releaseVersion, releasePublicKey) {
  if (compareVersions(releaseVersion, manifest.policy.minimumReleaseVersion) < 0) throw new Error(`release ${releaseVersion} is older than the trust manifest minimum ${manifest.policy.minimumReleaseVersion}`);
  const releaseKeyId = keyIdFor(releasePublicKey);
  if (manifest.revokedKeyIds.includes(releaseKeyId)) throw new Error(`release signing key is revoked by trust manifest: ${releaseKeyId}`);
  const entry = manifest.keys.find((candidate) => candidate.keyId === releaseKeyId);
  if (!entry) throw new Error(`release signing key is not trusted by manifest: ${releaseKeyId}`);
  if (compareVersions(releaseVersion, entry.validFromVersion) < 0) throw new Error(`release ${releaseVersion} predates signing key validity: ${releaseKeyId}`);
  if (entry.validUntilVersion !== null && compareVersions(releaseVersion, entry.validUntilVersion) > 0) throw new Error(`release ${releaseVersion} is outside signing key validity: ${releaseKeyId}`);
  return { keyId: releaseKeyId, entry };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "another-dimension-trust-"));
  try {
    const bootstrap = generateKeyPairSync("ed25519");
    const releaseA = generateKeyPairSync("ed25519");
    const releaseB = generateKeyPairSync("ed25519");
    const trust = createTrustManifest({ rootPrivateKey: bootstrap.privateKey, releaseKeys: [{ publicKey: releaseA.publicKey, validFromVersion: "1.0.0" }, { publicKey: releaseB.publicKey, validFromVersion: "2.0.0" }], minimumReleaseVersion: "1.0.0" });
    verifyTrustManifest(trust, bootstrap.publicKey);
    assert.equal(authorizeReleaseKey(trust, "1.2.0", releaseA.publicKey).keyId, keyIdFor(releaseA.publicKey));
    assert.throws(() => authorizeReleaseKey(trust, "0.9.0", releaseA.publicKey), /minimum/);
    assert.throws(() => authorizeReleaseKey(trust, "1.2.0", releaseB.publicKey), /predates/);
    assert.throws(() => authorizeReleaseKey(trust, "1.2.0", generateKeyPairSync("ed25519").publicKey), /not trusted/);
    const revoked = createTrustManifest({ rootPrivateKey: bootstrap.privateKey, releaseKeys: [{ publicKey: releaseA.publicKey }], revokedKeyIds: [keyIdFor(releaseA.publicKey)] });
    assert.throws(() => authorizeReleaseKey(revoked, "1.0.0", releaseA.publicKey), /revoked/);
    const tampered = structuredClone(trust); tampered.policy.minimumReleaseVersion = "9.0.0";
    assert.throws(() => verifyTrustManifest(tampered, bootstrap.publicKey), /invalid trust manifest signature/);
    console.log("release trust fixture passed: bootstrap signature -> key validity -> minimum version -> unknown/revoked key -> tamper rejection");
  } finally { await rm(root, { recursive: true, force: true }); }
}

const launchedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (launchedDirectly && process.argv[2] === "--fixture") await fixture();
else if (launchedDirectly) {
  const [manifestPath, bootstrapPath, releaseVersion, releasePublicKeyPath] = process.argv.slice(2);
  if (!manifestPath || !bootstrapPath || !releaseVersion || !releasePublicKeyPath) throw new Error("Usage: verify_release_trust.mjs --fixture | MANIFEST BOOTSTRAP_PUBLIC_KEY RELEASE_VERSION RELEASE_PUBLIC_KEY");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bootstrap = await readFile(bootstrapPath, "utf8");
  const releaseKey = await readFile(releasePublicKeyPath, "utf8");
  verifyTrustManifest(manifest, bootstrap);
  const result = authorizeReleaseKey(manifest, releaseVersion, releaseKey);
  console.log(`release trust passed: version ${releaseVersion}, key ${result.keyId}`);
}

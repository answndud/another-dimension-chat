#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MANIFEST_DIR = path.join(process.cwd(), "docs", "macos-signed-update-manifests");

const REQUIRED_ENVELOPE_FIELDS = Object.freeze([
  "schema_version",
  "manifest_id",
  "signed_payload_base64",
  "signed_payload_sha256",
  "signature_algorithm",
  "signature_base64",
  "public_key_spki_der_base64",
  "public_key_spki_sha256",
]);

const REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  "schema_version",
  "manifest_id",
  "repository",
  "release_channel",
  "release_tag",
  "app_version",
  "minimum_allowed_version",
  "platform",
  "artifact_name",
  "artifact_sha256",
  "artifact_size_bytes",
  "provenance_sha256",
  "release_notes_sha256",
  "created_at_utc",
  "source_commit",
  "update_mode",
  "rollback_policy",
  "release_upload_authorized",
  "dmg_rebuild_authorized",
  "public_non_claims",
]);

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key-pem"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "email-address"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop|Documents)\//, "macos-local-path"],
  [/[A-Z]:\\Users\\/i, "windows-local-path"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\.onion\b/i, "onion-endpoint"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\bpassphrase\b/i, "passphrase"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
]);

function collectManifestFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_MANIFEST_DIR];
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      files.push(target);
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.json$/i.test(entry.name)) continue;
      files.push(path.join(target, entry.name));
    }
  }
  return files.sort();
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}

function compareSemver(left, right) {
  const parse = (value) => value.split(/[+-]/)[0].split(".").map((part) => Number.parseInt(part, 10));
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function isBase64(value) {
  return typeof value === "string" && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function sameStringSet(actual, expected) {
  return actual.size === expected.length && expected.every((item) => actual.has(item));
}

function validateManifest(file) {
  const text = fs.readFileSync(file, "utf8");
  const issues = [];
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return { file, valid: false, issues: ["invalid-json"] };
  }
  if (!isObject(envelope)) {
    return { file, valid: false, issues: ["invalid-envelope"] };
  }

  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    if (!(field in envelope)) issues.push(`missing-envelope-field:${field}`);
  }
  for (const field of Object.keys(envelope)) {
    if (!REQUIRED_ENVELOPE_FIELDS.includes(field)) issues.push(`unknown-envelope-field:${field}`);
  }

  if (envelope.schema_version !== "macos-signed-update-manifest-envelope-v1") {
    issues.push("invalid-envelope-schema-version");
  }
  if (!/^MACOS-UPDATE-[0-9]{4}$/.test(envelope.manifest_id ?? "")) {
    issues.push("invalid-manifest-id");
  }
  if (envelope.signature_algorithm !== "ed25519") {
    issues.push("invalid-signature-algorithm");
  }
  if (!isBase64(envelope.signed_payload_base64)) issues.push("invalid-signed-payload-base64");
  if (!isBase64(envelope.signature_base64)) issues.push("invalid-signature-base64");
  if (!isBase64(envelope.public_key_spki_der_base64)) issues.push("invalid-public-key-base64");
  if (!isSha256(envelope.signed_payload_sha256 ?? "")) issues.push("invalid-signed-payload-sha256");
  if (!isSha256(envelope.public_key_spki_sha256 ?? "")) issues.push("invalid-public-key-sha256");

  let payloadBytes = Buffer.alloc(0);
  let payload = null;
  let publicKey = null;
  if (issues.length === 0) {
    payloadBytes = Buffer.from(envelope.signed_payload_base64, "base64");
    if (sha256Hex(payloadBytes) !== envelope.signed_payload_sha256) {
      issues.push("signed-payload-sha256-mismatch");
    }
    const publicKeyDer = Buffer.from(envelope.public_key_spki_der_base64, "base64");
    if (sha256Hex(publicKeyDer) !== envelope.public_key_spki_sha256) {
      issues.push("public-key-sha256-mismatch");
    }
    try {
      publicKey = crypto.createPublicKey({ key: publicKeyDer, format: "der", type: "spki" });
    } catch {
      issues.push("invalid-public-key");
    }
    try {
      payload = JSON.parse(payloadBytes.toString("utf8"));
    } catch {
      issues.push("invalid-signed-payload-json");
    }
  }

  if (isObject(payload)) {
    for (const field of REQUIRED_PAYLOAD_FIELDS) {
      if (!(field in payload)) issues.push(`missing-payload-field:${field}`);
    }
    for (const field of Object.keys(payload)) {
      if (!REQUIRED_PAYLOAD_FIELDS.includes(field)) issues.push(`unknown-payload-field:${field}`);
    }
    if (payload.schema_version !== "macos-signed-update-manifest-payload-v1") {
      issues.push("invalid-payload-schema-version");
    }
    if (payload.manifest_id !== envelope.manifest_id) issues.push("manifest-id-mismatch");
    if (payload.repository !== "answndud/another-dimension-chat") issues.push("invalid-repository");
    if (!["signed-public-beta-or-rc", "stable"].includes(payload.release_channel)) {
      issues.push("invalid-release-channel");
    }
    if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(payload.release_tag ?? "")) {
      issues.push("invalid-release-tag");
    }
    if (!isSemver(payload.app_version ?? "")) issues.push("invalid-app-version");
    if (!isSemver(payload.minimum_allowed_version ?? "")) issues.push("invalid-minimum-version");
    if (
      isSemver(payload.app_version ?? "") &&
      isSemver(payload.minimum_allowed_version ?? "") &&
      compareSemver(payload.minimum_allowed_version, payload.app_version) > 0
    ) {
      issues.push("minimum-version-newer-than-app-version");
    }
    if (!["macos-aarch64", "macos-universal"].includes(payload.platform)) {
      issues.push("invalid-platform");
    }
    if (!/\.dmg$/i.test(payload.artifact_name ?? "")) issues.push("artifact-name-not-dmg");
    for (const field of ["artifact_sha256", "provenance_sha256", "release_notes_sha256"]) {
      if (!isSha256(payload[field] ?? "")) issues.push(`invalid-sha256:${field}`);
    }
    if (!Number.isSafeInteger(payload.artifact_size_bytes) || payload.artifact_size_bytes <= 0) {
      issues.push("invalid-artifact-size");
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(payload.created_at_utc ?? "")) {
      issues.push("invalid-created-at");
    }
    if (!/^[0-9a-f]{7,40}$/i.test(payload.source_commit ?? "")) issues.push("invalid-source-commit");
    if (payload.update_mode !== "manual-github-release-download") issues.push("invalid-update-mode");
    if (!["warn-and-recover-only", "monotonic-manifest-enforced"].includes(payload.rollback_policy)) {
      issues.push("invalid-rollback-policy");
    }
    if (payload.release_upload_authorized !== false) issues.push("release-upload-must-remain-false");
    if (payload.dmg_rebuild_authorized !== false) issues.push("dmg-rebuild-must-remain-false");
    if (!Array.isArray(payload.public_non_claims)) {
      issues.push("invalid-public-non-claims");
    } else if (!sameStringSet(new Set(payload.public_non_claims), REQUIRED_NON_CLAIMS)) {
      issues.push("public-non-claims-mismatch");
    }
  } else if (payload !== null) {
    issues.push("invalid-payload");
  }

  if (publicKey && issues.length === 0) {
    const signature = Buffer.from(envelope.signature_base64, "base64");
    if (!crypto.verify(null, payloadBytes, publicKey, signature)) {
      issues.push("signature-verification-failed");
    }
  }

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text) || pattern.test(payloadBytes.toString("utf8"))) {
      issues.push(`forbidden-content:${label}`);
    }
  }

  return { file, issues, valid: issues.length === 0 };
}

const files = collectManifestFiles(process.argv.slice(2));
console.log(`signed_update_manifest_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_signed_update_manifests=0");
  console.log("signed_update_manifest_candidate=false");
  console.log("signed_update_manifest_ready=false");
  console.log("update_signature_ready=false");
  console.log("status=waiting-for-macos-signed-update-manifest");
  process.exit(0);
}

const validated = files.map(validateManifest);
let failures = 0;
for (const result of validated) {
  const name = path.basename(result.file);
  if (result.valid) {
    console.log(`ok ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} ${result.issues.join(",")}`);
  }
}

if (failures > 0) {
  console.log("status=invalid-macos-signed-update-manifest");
  process.exit(1);
}

console.log(`accepted_signed_update_manifests=${validated.length}`);
console.log("signed_update_manifest_candidate=true");
console.log("signed_update_manifest_ready=false");
console.log("update_signature_ready=false");
console.log("auto_update_channel_ready=false");
console.log("release_upload_authorized=false");
console.log("dmg_rebuild_authorized=false");
console.log("status=macos-signed-update-manifest-candidate-requires-release-gate");

#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MANIFEST_DIR = path.join(process.cwd(), "docs", "macos-signed-update-manifests");
const DISTRIBUTION_MANIFEST_VALIDATOR = path.join(
  process.cwd(),
  "scripts",
  "validate_macos_release_distribution_manifest.mjs",
);

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
  "distribution_manifest_sha256",
  "release_distribution_manifest_verified",
  "same_release_asset_authority_required",
  "release_notes_sha256",
  "macos_release_distribution_dmg_contained_app_evidence_verified",
  "macos_dmg_contained_app_verifier_available",
  "dmg_mounted_app_found",
  "dmg_contained_app_codesign_verify_passed",
  "dmg_contained_app_gatekeeper_assess_passed",
  "dmg_contained_app_matches_signed_source_app",
  "created_at_utc",
  "source_commit",
  "update_mode",
  "rollback_policy",
  "release_upload_authorized",
  "dmg_rebuild_authorized",
  "hold_flags",
  "public_non_claims",
]);

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
]);

const REQUIRED_TRUE_PAYLOAD_FIELDS = Object.freeze([
  "release_distribution_manifest_verified",
  "same_release_asset_authority_required",
  "macos_release_distribution_dmg_contained_app_evidence_verified",
  "macos_dmg_contained_app_verifier_available",
  "dmg_mounted_app_found",
  "dmg_contained_app_codesign_verify_passed",
  "dmg_contained_app_gatekeeper_assess_passed",
  "dmg_contained_app_matches_signed_source_app",
]);

const REQUIRED_FALSE_HOLD_FLAGS = Object.freeze([
  "signed_update_manifest_ready",
  "update_signature_ready",
  "auto_update_channel_ready",
  "rollback_prevention_claimed",
  "release_upload_authorized",
  "dmg_rebuild_authorized",
  "stable_release_allowed",
  "production_distribution_ready",
  "security_ready_claimed",
  "production_ready_claim_allowed",
  "audited_claim_allowed",
  "sensitive_communication_allowed",
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

function parseArgs(rawArgs) {
  const signedManifestInputs = [];
  const distributionManifestInputs = [];
  let previousManifest = process.env.AD_PREVIOUS_SIGNED_UPDATE_MANIFEST || "";
  let requireCurrentHead = process.env.AD_REQUIRE_CURRENT_HEAD === "1";

  const envDistribution = process.env.AD_MACOS_RELEASE_DISTRIBUTION_MANIFEST;
  if (envDistribution) distributionManifestInputs.push(envDistribution);

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--require-current-head") {
      requireCurrentHead = true;
    } else if (arg === "--distribution-manifest" || arg === "--distribution-dir") {
      i += 1;
      if (!rawArgs[i]) throw new Error(`missing value for ${arg}`);
      distributionManifestInputs.push(rawArgs[i]);
    } else if (arg === "--previous-manifest") {
      i += 1;
      if (!rawArgs[i]) throw new Error("missing value for --previous-manifest");
      previousManifest = rawArgs[i];
    } else {
      signedManifestInputs.push(arg);
    }
  }

  return {
    signedManifestInputs,
    distributionManifestInputs,
    previousManifest,
    requireCurrentHead,
  };
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
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

function parseSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function comparePrereleaseIdentifier(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const a = Number.parseInt(left, 10);
    const b = Number.parseInt(right, 10);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return 0;
  for (const field of ["major", "minor", "patch"]) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    const compared = comparePrereleaseIdentifier(a.prerelease[i], b.prerelease[i]);
    if (compared !== 0) return compared;
  }
  return 0;
}

function releaseTagVersion(value) {
  if (typeof value !== "string") return "";
  return value.startsWith("v") ? value.slice(1) : value;
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

function sha256File(file) {
  return sha256Hex(fs.readFileSync(file));
}

function relativeSibling(baseFile, siblingName) {
  if (!siblingName || typeof siblingName !== "string") return "";
  if (siblingName !== path.basename(siblingName)) return "";
  return path.join(path.dirname(baseFile), siblingName);
}

function decodeSignedPayload(file) {
  try {
    const envelope = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!isObject(envelope) || !isBase64(envelope.signed_payload_base64)) return null;
    const payloadBytes = Buffer.from(envelope.signed_payload_base64, "base64");
    const payload = JSON.parse(payloadBytes.toString("utf8"));
    return isObject(payload) ? payload : null;
  } catch {
    return null;
  }
}

function validateHoldFlags(payload, issues) {
  if (!isObject(payload.hold_flags)) {
    issues.push("invalid-hold-flags");
    return;
  }
  for (const field of REQUIRED_FALSE_HOLD_FLAGS) {
    if (!(field in payload.hold_flags)) issues.push(`missing-hold-flag:${field}`);
    if (payload.hold_flags[field] !== false) issues.push(`hold-flag-must-be-false:${field}`);
  }
  for (const field of Object.keys(payload.hold_flags)) {
    if (!REQUIRED_FALSE_HOLD_FLAGS.includes(field)) issues.push(`unknown-hold-flag:${field}`);
  }
}

function readDistributionEvidence(files, { requireCurrentHead }) {
  if (files.length === 0) {
    return { issues: ["missing-distribution-manifest-input"], manifestsBySha: new Map() };
  }

  try {
    execFileSync(
      process.execPath,
      [
        DISTRIBUTION_MANIFEST_VALIDATOR,
        ...(requireCurrentHead ? ["--require-current-head"] : []),
        ...files,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    return {
      issues: [
        "distribution-manifest-validator-failed",
        ...output
          .split(/\r?\n/)
          .filter(Boolean)
          .slice(0, 6)
          .map((line) => `distribution-validator:${line}`),
      ],
      manifestsBySha: new Map(),
    };
  }

  const manifestsBySha = new Map();
  const issues = [];
  for (const file of files) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      issues.push(`distribution-manifest-unreadable:${path.basename(file)}`);
      continue;
    }
    const manifestSha = sha256File(file);
    const artifactsByName = new Map();
    for (const artifact of manifest.artifacts ?? []) {
      const provenanceFile = relativeSibling(file, artifact.provenance_file);
      artifactsByName.set(artifact.filename, {
        ...artifact,
        provenance_sha256: provenanceFile && fs.existsSync(provenanceFile) ? sha256File(provenanceFile) : "",
      });
    }
    manifestsBySha.set(manifestSha, { file, manifest, artifactsByName });
  }

  return { issues, manifestsBySha };
}

function validateDistributionBinding(payload, distributionEvidence, issues) {
  if (distributionEvidence.issues.length > 0) {
    issues.push(...distributionEvidence.issues);
    return;
  }
  const entry = distributionEvidence.manifestsBySha.get(payload.distribution_manifest_sha256);
  if (!entry) {
    issues.push("distribution-manifest-sha-not-found");
    return;
  }
  const { manifest, artifactsByName } = entry;
  const artifact = artifactsByName.get(payload.artifact_name);
  if (!artifact) {
    issues.push("distribution-artifact-not-found");
    return;
  }

  if (manifest.repository !== payload.repository) issues.push("distribution-repository-mismatch");
  if (manifest.source_commit !== payload.source_commit) issues.push("distribution-source-commit-mismatch");
  if (manifest.version !== payload.app_version) issues.push("distribution-version-mismatch");
  if (payload.release_channel === "stable" && manifest.release_class !== "stable") {
    issues.push("stable-update-requires-stable-distribution");
  }
  if (payload.release_channel === "signed-public-beta-or-rc" && manifest.release_class !== "signed-notarized-rc") {
    issues.push("signed-beta-update-requires-signed-notarized-rc-distribution");
  }
  if (artifact.sha256 !== payload.artifact_sha256) issues.push("distribution-artifact-sha-mismatch");
  if (artifact.size_bytes !== payload.artifact_size_bytes) issues.push("distribution-artifact-size-mismatch");
  if (artifact.provenance_sha256 !== payload.provenance_sha256) issues.push("distribution-provenance-sha-mismatch");
  if (artifact.signing_status !== "signed") issues.push("distribution-artifact-must-be-signed");
  if (artifact.notarization_status !== "notarized") issues.push("distribution-artifact-must-be-notarized");
  if (artifact.stapled !== true) issues.push("distribution-artifact-must-be-stapled");
  for (const field of [
    "macos_dmg_contained_app_verifier_available",
    "dmg_mounted_app_found",
    "dmg_contained_app_codesign_verify_passed",
    "dmg_contained_app_gatekeeper_assess_passed",
    "dmg_contained_app_matches_signed_source_app",
  ]) {
    if (artifact[field] !== payload[field]) issues.push(`distribution-${field}-mismatch`);
    if (artifact[field] !== true) issues.push(`distribution-${field}-must-be-true`);
  }
}

function validatePreviousManifestMonotonicity(payload, previousPayload, issues) {
  if (!previousPayload) return;
  if (!isSemver(previousPayload.app_version ?? "")) {
    issues.push("previous-manifest-invalid-app-version");
    return;
  }
  const previousTagVersion = releaseTagVersion(previousPayload.release_tag);
  const currentTagVersion = releaseTagVersion(payload.release_tag);
  if (isSemver(currentTagVersion) && isSemver(previousTagVersion)) {
    if (compareSemver(currentTagVersion, previousTagVersion) <= 0) {
      issues.push("release-tag-not-newer-than-previous-manifest");
    }
  }
  if (compareSemver(payload.app_version, previousPayload.app_version) <= 0) {
    issues.push("app-version-not-newer-than-previous-manifest");
  }
  if (
    isSemver(previousPayload.minimum_allowed_version ?? "") &&
    compareSemver(payload.minimum_allowed_version, previousPayload.minimum_allowed_version) < 0
  ) {
    issues.push("minimum-version-older-than-previous-manifest");
  }
}

function validateManifest(file, { requireCurrentHead, head, distributionEvidence, previousPayload }) {
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
    for (const field of [
      "artifact_sha256",
      "provenance_sha256",
      "distribution_manifest_sha256",
      "release_notes_sha256",
    ]) {
      if (!isSha256(payload[field] ?? "")) issues.push(`invalid-sha256:${field}`);
    }
    for (const field of REQUIRED_TRUE_PAYLOAD_FIELDS) {
      if (payload[field] !== true) issues.push(`${field}-must-be-true`);
    }
    if (!Number.isSafeInteger(payload.artifact_size_bytes) || payload.artifact_size_bytes <= 0) {
      issues.push("invalid-artifact-size");
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(payload.created_at_utc ?? "")) {
      issues.push("invalid-created-at");
    }
    if (!/^[0-9a-f]{7,40}$/i.test(payload.source_commit ?? "")) issues.push("invalid-source-commit");
    if (requireCurrentHead && payload.source_commit !== head) issues.push("source-commit-not-current-head");
    if (payload.update_mode !== "manual-github-release-download") issues.push("invalid-update-mode");
    if (!["warn-and-recover-only", "monotonic-manifest-enforced"].includes(payload.rollback_policy)) {
      issues.push("invalid-rollback-policy");
    }
    if (payload.release_upload_authorized !== false) issues.push("release-upload-must-remain-false");
    if (payload.dmg_rebuild_authorized !== false) issues.push("dmg-rebuild-must-remain-false");
    validateHoldFlags(payload, issues);
    if (!Array.isArray(payload.public_non_claims)) {
      issues.push("invalid-public-non-claims");
    } else if (!sameStringSet(new Set(payload.public_non_claims), REQUIRED_NON_CLAIMS)) {
      issues.push("public-non-claims-mismatch");
    }
    validateDistributionBinding(payload, distributionEvidence, issues);
    validatePreviousManifestMonotonicity(payload, previousPayload, issues);
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

let parsedArgs;
try {
  parsedArgs = parseArgs(process.argv.slice(2));
} catch (error) {
  console.log(`error=${error.message}`);
  console.log("status=invalid-macos-signed-update-manifest-arguments");
  process.exit(1);
}
const { signedManifestInputs, distributionManifestInputs, previousManifest, requireCurrentHead } = parsedArgs;
const files = collectManifestFiles(signedManifestInputs);
console.log(`macos_signed_update_manifest_current_head_required=${requireCurrentHead}`);
console.log(`signed_update_manifest_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_signed_update_manifests=0");
  console.log("signed_update_manifest_candidate=false");
  console.log("signed_update_manifest_ready=false");
  console.log("update_signature_ready=false");
  console.log("status=waiting-for-macos-signed-update-manifest");
  process.exit(0);
}

const head = requireCurrentHead ? currentHead() : "";
const distributionFiles = collectManifestFiles(distributionManifestInputs);
console.log(`macos_signed_update_distribution_manifest_files_found=${distributionFiles.length}`);
const distributionEvidence = readDistributionEvidence(distributionFiles, { requireCurrentHead });
const previousPayload = previousManifest ? decodeSignedPayload(previousManifest) : null;
if (previousManifest && !previousPayload) {
  console.log(`FAIL ${path.basename(previousManifest)} invalid-previous-signed-update-manifest`);
  console.log("status=invalid-macos-signed-update-manifest");
  process.exit(1);
}

const validated = files.map((file) =>
  validateManifest(file, { requireCurrentHead, head, distributionEvidence, previousPayload }),
);
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

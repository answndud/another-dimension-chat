#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = path.join(process.cwd(), "apps", "mobile", "android", "public-release");
const REQUIRED_NON_CLAIMS = Object.freeze([
  "sensitive communication prohibited",
  "not audited",
  "not production-ready",
  "no Android public artifact",
]);
const ALLOWED_ARTIFACT_KINDS = new Set(["apk", "aab"]);
const ALLOWED_DISTRIBUTION_PATHS = new Set(["sideload-hold", "play-internal-hold", "play-store-hold"]);
const ALLOWED_SIGNING = new Set(["unsigned-debug-hold", "release-signed", "play-app-signing-hold"]);
const FORBIDDEN_PATTERNS = Object.freeze([
  [/android_public_artifact_ready"\s*:\s*true/i, "android-public-ready"],
  [/android_public_artifact_upload_allowed"\s*:\s*true/i, "android-upload-allowed"],
  [/android_generated_artifact_commit_allowed"\s*:\s*true/i, "android-generated-commit"],
  [/sensitive communication allowed/i, "sensitive-communication-allowed"],
  [/secure messenger/i, "secure-messenger-claim"],
  [/\bFirebase\b/i, "firebase"],
  [/\bFCM\b/i, "fcm"],
  [/\bContactsContract\b/i, "contacts"],
  [/\bTelephony\b/i, "telephony"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
]);

function collectFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_DIR];
  const files = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      files.push(target);
    } else if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (entry.isFile() && /\.json$/i.test(entry.name)) files.push(path.join(target, entry.name));
      }
    }
  }
  return files.sort();
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
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

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function listZipEntries(file) {
  const bytes = fs.readFileSync(file);
  const entries = [];
  for (let offset = 0; offset <= bytes.length - 30; offset += 1) {
    if (bytes.readUInt32LE(offset) !== 0x04034b50) continue;
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) continue;
    const name = bytes.toString("utf8", nameStart, nameEnd);
    if (name && !name.includes("\u0000")) entries.push(name);
    offset = nameEnd + extraLength - 1;
  }
  return entries;
}

function validatePackageStructure(file, artifactKind) {
  const entries = listZipEntries(file);
  const issues = [];
  if (entries.length === 0) return ["artifact-not-zip-package"];
  if (artifactKind === "apk") {
    if (!entries.includes("AndroidManifest.xml")) issues.push("apk-missing-android-manifest");
    if (!entries.some((entry) => /^classes(?:\d*)?\.dex$/.test(entry))) {
      issues.push("apk-missing-dex");
    }
  } else if (artifactKind === "aab") {
    if (!entries.includes("base/manifest/AndroidManifest.xml")) {
      issues.push("aab-missing-base-manifest");
    }
    if (!entries.includes("BundleConfig.pb")) issues.push("aab-missing-bundle-config");
  }
  return issues;
}

function sibling(base, name) {
  if (!name || name !== path.basename(name)) return "";
  return path.join(path.dirname(base), name);
}

function hasRequiredNonClaims(value) {
  return Array.isArray(value) && REQUIRED_NON_CLAIMS.every((claim) => value.includes(claim));
}

function validateManifest(file, { requireCurrentHead, head }) {
  const text = fs.readFileSync(file, "utf8");
  const issues = [];
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) issues.push(`forbidden-content:${label}`);
  }
  const manifest = readJson(file);
  if (!manifest) return { file, valid: false, issues: ["invalid-json"] };
  if (manifest.schema_version !== "android-public-artifact-manifest-v1") issues.push("invalid-schema-version");
  if (manifest.platform !== "android") issues.push("invalid-platform");
  if (!/^[0-9a-f]{7,40}$/i.test(manifest.source_commit ?? "")) issues.push("invalid-source-commit");
  if (requireCurrentHead && manifest.source_commit !== head) issues.push("source-commit-not-current-head");
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) issues.push("invalid-version");
  if (!ALLOWED_ARTIFACT_KINDS.has(manifest.artifact_kind)) issues.push("invalid-artifact-kind");
  if (!ALLOWED_DISTRIBUTION_PATHS.has(manifest.distribution_path)) issues.push("invalid-distribution-path");
  if (!ALLOWED_SIGNING.has(manifest.signing_status)) issues.push("invalid-signing-status");
  if (manifest.same_release_asset_authority_required !== true) issues.push("same-release-authority-required");
  if (manifest.real_device_smoke_passed !== true) issues.push("real-device-smoke-required");
  if (manifest.backup_exclusion_verified !== true) issues.push("backup-exclusion-required");
  if (manifest.forbidden_dependency_scan_passed !== true) issues.push("forbidden-dependency-scan-required");
  if (manifest.android_public_artifact_ready !== false) issues.push("android-public-ready-must-stay-false");
  if (manifest.android_public_artifact_upload_allowed !== false) issues.push("android-upload-must-stay-false");
  if (manifest.android_generated_artifact_commit_allowed !== false) issues.push("android-generated-commit-must-stay-false");
  if (!hasRequiredNonClaims(manifest.public_non_claims)) issues.push("public-non-claims-mismatch");
  if (!manifest.artifact || typeof manifest.artifact !== "object") {
    issues.push("missing-artifact");
    return { file, valid: issues.length === 0, issues };
  }
  const artifact = manifest.artifact;
  const artifactFile = sibling(file, artifact.filename);
  if (!artifactFile || !fs.existsSync(artifactFile)) {
    issues.push("missing-artifact-file");
    return { file, valid: false, issues };
  }
  const actualSha = sha256File(artifactFile);
  const actualSize = fs.statSync(artifactFile).size;
  if (artifact.sha256 !== actualSha) issues.push("artifact-sha-mismatch");
  if (artifact.size_bytes !== actualSize) issues.push("artifact-size-mismatch");
  if (!new Set([".apk", ".aab"]).has(path.extname(artifact.filename).toLowerCase())) {
    issues.push("invalid-artifact-extension");
  }
  issues.push(...validatePackageStructure(artifactFile, manifest.artifact_kind));
  const checksumFile = sibling(file, artifact.checksum_file);
  if (!checksumFile || !fs.existsSync(checksumFile)) {
    issues.push("missing-checksum-file");
  } else if (fs.readFileSync(checksumFile, "utf8").trim() !== `${actualSha}  ${artifact.filename}`) {
    issues.push("checksum-file-mismatch");
  }
  const provenanceFile = sibling(file, artifact.provenance_file);
  const provenance = provenanceFile ? readJson(provenanceFile) : null;
  if (!provenance) {
    issues.push("missing-or-invalid-provenance");
  } else {
    if (provenance.schema_version !== "android-public-artifact-provenance-v1") issues.push("invalid-provenance-schema");
    if (provenance.artifact_sha256 !== actualSha) issues.push("provenance-sha-mismatch");
    if (provenance.source_commit !== manifest.source_commit) issues.push("provenance-source-commit-mismatch");
    if (provenance.artifact_kind !== manifest.artifact_kind) issues.push("provenance-artifact-kind-mismatch");
    if (provenance.distribution_path !== manifest.distribution_path) {
      issues.push("provenance-distribution-path-mismatch");
    }
    if (provenance.signing_status !== manifest.signing_status) {
      issues.push("provenance-signing-status-mismatch");
    }
    if (provenance.real_device_smoke_passed !== manifest.real_device_smoke_passed) {
      issues.push("provenance-real-device-smoke-mismatch");
    }
    if (provenance.android_public_artifact_ready !== false) issues.push("provenance-public-ready-must-stay-false");
  }
  return { file, valid: issues.length === 0, issues };
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const inputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const files = collectFiles(inputs);
console.log(`android_public_artifact_manifest_current_head_required=${requireCurrentHead}`);
console.log(`android_public_artifact_manifest_files_found=${files.length}`);
if (files.length === 0) {
  console.log("accepted_android_public_artifact_manifests=0");
  console.log("android_public_artifact_ready=false");
  console.log("status=waiting-for-android-public-artifact-manifest");
  process.exit(0);
}

let failures = 0;
const head = requireCurrentHead ? currentHead() : "";
for (const result of files.map((file) => validateManifest(file, { requireCurrentHead, head }))) {
  if (result.valid) {
    console.log(`ok ${path.basename(result.file)}`);
  } else {
    failures += 1;
    console.log(`FAIL ${path.basename(result.file)} ${result.issues.join(",")}`);
  }
}
if (failures > 0) {
  console.log("status=invalid-android-public-artifact-manifest");
  process.exit(1);
}

console.log(`accepted_android_public_artifact_manifests=${files.length}`);
console.log("android_artifact_package_structure_verified=true");
console.log("android_public_artifact_ready=false");
console.log("android_public_artifact_upload_allowed=false");
console.log("status=android-public-artifact-candidate-requires-release-gate");

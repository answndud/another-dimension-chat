#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REQUIRED_NON_CLAIMS = Object.freeze([
  "sensitive communication prohibited",
  "not audited",
  "not production-ready",
]);

const ALLOWED_RELEASE_CLASSES = new Set([
  "unsigned-public-beta",
  "signed-notarized-rc",
  "stable",
]);

const ALLOWED_ARCHITECTURES = new Set([
  "macos-aarch64",
  "macos-x86_64",
  "macos-universal",
]);

const ALLOWED_SIGNING_STATUS = new Set(["unsigned", "signed"]);
const ALLOWED_NOTARIZATION_STATUS = new Set(["not-notarized", "notarized"]);
const FORBIDDEN_PATTERNS = Object.freeze([
  [/release_upload_authorized"\s*:\s*true/i, "release-upload-authorized"],
  [/release_body_edit_authorized"\s*:\s*true/i, "release-body-edit-authorized"],
  [/generated_release_artifacts_commit_allowed"\s*:\s*true/i, "generated-artifact-commit-allowed"],
  [/sensitive communication allowed/i, "sensitive-communication-allowed"],
  [/(?<!not )production-ready/i, "production-ready-claim"],
  [/(?<!not )\baudited\b/i, "audited-claim"],
  [/secure messenger/i, "secure-messenger-claim"],
  [/Briar\/Cwtch-equivalent/i, "briar-cwtch-equivalent-claim"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key-pem"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bpassphrase\b/i, "passphrase"],
  [/[A-Za-z0-9+/]{100,}={0,2}/, "long-secret-like-token"],
]);

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

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    if (!fs.existsSync(input)) continue;
    const stat = fs.statSync(input);
    if (stat.isFile()) {
      files.push(input);
    } else if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
        if (entry.isFile() && /\.json$/i.test(entry.name)) {
          files.push(path.join(input, entry.name));
        }
      }
    }
  }
  return files.sort();
}

function hasAllNonClaims(value) {
  return Array.isArray(value) && REQUIRED_NON_CLAIMS.every((claim) => value.includes(claim));
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function relativeSibling(baseFile, siblingName) {
  if (!siblingName || typeof siblingName !== "string") return "";
  if (siblingName !== path.basename(siblingName)) return "";
  return path.join(path.dirname(baseFile), siblingName);
}

function validateChecksumFile(file, artifact, artifactFile, actualSha) {
  const checksumFile = relativeSibling(file, artifact.checksum_file);
  const issues = [];
  if (!checksumFile || !fs.existsSync(checksumFile)) {
    return [`artifact:${artifact.filename}:missing-checksum-file`];
  }
  const checksumText = fs.readFileSync(checksumFile, "utf8").trim();
  const expectedLine = `${actualSha}  ${path.basename(artifactFile)}`;
  if (checksumText !== expectedLine) {
    issues.push(`artifact:${artifact.filename}:checksum-file-mismatch`);
  }
  return issues;
}

function validateProvenanceFile(file, manifest, artifact, actualSha) {
  const provenanceFile = relativeSibling(file, artifact.provenance_file);
  if (!provenanceFile || !fs.existsSync(provenanceFile)) {
    return [`artifact:${artifact.filename}:missing-provenance-file`];
  }
  const provenance = readJson(provenanceFile);
  if (!provenance || typeof provenance !== "object") {
    return [`artifact:${artifact.filename}:invalid-provenance-json`];
  }
  const issues = [];
  if (provenance.schema_version !== "macos-release-distribution-provenance-v1") {
    issues.push(`artifact:${artifact.filename}:invalid-provenance-schema`);
  }
  if (provenance.repository !== manifest.repository) {
    issues.push(`artifact:${artifact.filename}:provenance-repository-mismatch`);
  }
  if (provenance.artifact_sha256 !== actualSha) {
    issues.push(`artifact:${artifact.filename}:provenance-sha-mismatch`);
  }
  if (provenance.artifact_filename !== artifact.filename) {
    issues.push(`artifact:${artifact.filename}:provenance-filename-mismatch`);
  }
  if (provenance.source_commit !== manifest.source_commit) {
    issues.push(`artifact:${artifact.filename}:provenance-source-commit-mismatch`);
  }
  if (provenance.release_class !== manifest.release_class) {
    issues.push(`artifact:${artifact.filename}:provenance-release-class-mismatch`);
  }
  if (provenance.architecture !== artifact.architecture) {
    issues.push(`artifact:${artifact.filename}:provenance-architecture-mismatch`);
  }
  if (provenance.signing_status !== artifact.signing_status) {
    issues.push(`artifact:${artifact.filename}:provenance-signing-mismatch`);
  }
  if (provenance.notarization_status !== artifact.notarization_status) {
    issues.push(`artifact:${artifact.filename}:provenance-notarization-mismatch`);
  }
  if (provenance.stapled !== artifact.stapled) {
    issues.push(`artifact:${artifact.filename}:provenance-stapled-mismatch`);
  }
  if (provenance.release_upload_authorized !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-upload-must-stay-false`);
  }
  if (provenance.macos_release_distribution_artifact_ready !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-public-ready-must-stay-false`);
  }
  if (provenance.generated_release_artifacts_commit_allowed !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-commit-must-stay-false`);
  }
  return issues;
}

function validateArtifact(file, manifest, artifact, index) {
  const issues = [];
  const prefix = `artifact[${index}]`;
  if (!artifact || typeof artifact !== "object") return [`${prefix}:not-object`];
  if (!artifact.filename || typeof artifact.filename !== "string") issues.push(`${prefix}:missing-filename`);
  if (!/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? "")) issues.push(`${prefix}:invalid-sha256`);
  if (!Number.isInteger(artifact.size_bytes) || artifact.size_bytes <= 0) issues.push(`${prefix}:invalid-size`);
  if (artifact.platform !== "macos") issues.push(`${prefix}:invalid-platform`);
  if (!ALLOWED_ARCHITECTURES.has(artifact.architecture)) issues.push(`${prefix}:invalid-architecture`);
  if (!ALLOWED_SIGNING_STATUS.has(artifact.signing_status)) issues.push(`${prefix}:invalid-signing-status`);
  if (!ALLOWED_NOTARIZATION_STATUS.has(artifact.notarization_status)) issues.push(`${prefix}:invalid-notarization-status`);
  if (typeof artifact.stapled !== "boolean") issues.push(`${prefix}:invalid-stapled`);
  if (!artifact.checksum_file || typeof artifact.checksum_file !== "string") issues.push(`${prefix}:missing-checksum-file`);
  if (!artifact.provenance_file || typeof artifact.provenance_file !== "string") issues.push(`${prefix}:missing-provenance-file`);
  if (manifest.release_class === "stable") {
    if (artifact.signing_status !== "signed") issues.push(`${prefix}:stable-must-be-signed`);
    if (artifact.notarization_status !== "notarized") issues.push(`${prefix}:stable-must-be-notarized`);
    if (artifact.stapled !== true) issues.push(`${prefix}:stable-must-be-stapled`);
  }

  const artifactFile = relativeSibling(file, artifact.filename);
  if (!artifactFile || !fs.existsSync(artifactFile)) {
    issues.push(`${prefix}:missing-artifact-file`);
    return issues;
  }
  const actualSha = sha256File(artifactFile);
  const actualSize = fs.statSync(artifactFile).size;
  if (artifact.sha256 !== actualSha) issues.push(`${prefix}:artifact-sha-mismatch`);
  if (artifact.size_bytes !== actualSize) issues.push(`${prefix}:artifact-size-mismatch`);
  issues.push(...validateChecksumFile(file, artifact, artifactFile, actualSha));
  issues.push(...validateProvenanceFile(file, manifest, artifact, actualSha));
  return issues;
}

function validateManifest(file, { requireCurrentHead, head }) {
  const text = fs.readFileSync(file, "utf8");
  const issues = [];
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) issues.push(`forbidden-content:${label}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    return { file, valid: false, issues: ["invalid-json"] };
  }
  if (manifest.schema_version !== "macos-release-distribution-manifest-v1") issues.push("invalid-schema-version");
  if (manifest.repository !== "answndud/another-dimension-chat") issues.push("invalid-repository");
  if (!/^[0-9a-f]{7,40}$/i.test(manifest.source_commit ?? "")) issues.push("invalid-source-commit");
  if (requireCurrentHead && manifest.source_commit !== head) issues.push("source-commit-not-current-head");
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) issues.push("invalid-version");
  if (!ALLOWED_RELEASE_CLASSES.has(manifest.release_class)) issues.push("invalid-release-class");
  if (manifest.release_upload_authorized !== false) issues.push("release-upload-must-stay-false");
  if (manifest.release_body_edit_authorized !== false) issues.push("release-body-edit-must-stay-false");
  if (manifest.generated_release_artifacts_commit_allowed !== false) issues.push("generated-artifact-commit-must-stay-false");
  if (manifest.same_release_asset_authority_required !== true) issues.push("same-release-authority-required");
  if (!hasAllNonClaims(manifest.public_non_claims)) issues.push("public-non-claims-mismatch");
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    issues.push("missing-artifacts");
  } else {
    manifest.artifacts.forEach((artifact, index) => {
      issues.push(...validateArtifact(file, manifest, artifact, index));
    });
  }
  return { file, valid: issues.length === 0, issues };
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const inputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const files = collectFiles(inputs);
console.log(`macos_release_distribution_manifest_current_head_required=${requireCurrentHead}`);
console.log(`macos_release_distribution_manifest_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_macos_release_distribution_manifests=0");
  console.log("macos_release_distribution_artifact_ready=false");
  console.log("status=waiting-for-macos-release-distribution-manifest");
  process.exit(0);
}

const head = requireCurrentHead ? currentHead() : "";
let failures = 0;
for (const result of files.map((file) => validateManifest(file, { requireCurrentHead, head }))) {
  if (result.valid) {
    console.log(`ok ${path.basename(result.file)}`);
  } else {
    failures += 1;
    console.log(`FAIL ${path.basename(result.file)} ${result.issues.join(",")}`);
  }
}
if (failures > 0) {
  console.log("status=invalid-macos-release-distribution-manifest");
  process.exit(1);
}

console.log(`accepted_macos_release_distribution_manifests=${files.length}`);
console.log("macos_release_distribution_checksum_bytes_verified=true");
console.log("macos_release_distribution_provenance_consistency_verified=true");
console.log("macos_release_distribution_artifact_ready=false");
console.log("release_upload_authorized=false");
console.log("status=macos-release-distribution-manifest-candidate-requires-artifact-gate");

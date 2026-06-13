#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MANIFEST_DIR = path.join(
  process.cwd(),
  "apps",
  "desktop-tauri",
  "public-release",
  "windows-artifact-metadata",
);

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned experimental public beta",
  "sensitive communication prohibited",
  "not audited",
  "not production-ready",
  "no public Windows artifact",
  "no Windows installer",
  "no public artifact upload",
]);

const ALLOWED_RELEASE_CLASSES = new Set([
  "unsigned-windows-beta",
  "signed-windows-rc",
  "stable",
]);
const ALLOWED_ARCHITECTURES = new Set(["windows-x64", "windows-arm64"]);
const ALLOWED_BUNDLE_TARGETS = new Set(["msi", "nsis", "portable-archive", "msix"]);
const ALLOWED_SIGNING_STATUS = new Set(["unsigned-hold", "signtool-signed", "store-signed"]);
const ALLOWED_EXTENSIONS = new Set([".msi", ".exe", ".zip", ".msix"]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/windows_public_artifact_ready"\s*:\s*true/i, "windows-public-artifact-ready"],
  [/windows_installer_ready"\s*:\s*true/i, "windows-installer-ready"],
  [/windows_public_artifact_upload_allowed"\s*:\s*true/i, "windows-public-upload-allowed"],
  [/generated_release_artifacts_commit_allowed"\s*:\s*true/i, "generated-artifact-commit-allowed"],
  [/smartscreen_reputation_claim"\s*:\s*true/i, "smartscreen-reputation-claim"],
  [/signing_trust_boundary"\s*:\s*true/i, "signing-trust-boundary"],
  [/sensitive communication allowed/i, "sensitive-communication-allowed"],
  [/secure messenger/i, "secure-messenger-claim"],
  [/Briar\/Cwtch-equivalent/i, "briar-cwtch-equivalent-claim"],
  [/[A-Z]:\\Users\\/i, "windows-local-path"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
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
      if (entry.isFile() && /\.json$/i.test(entry.name)) {
        files.push(path.join(target, entry.name));
      }
    }
  }
  return files.sort();
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

function hasAllNonClaims(value) {
  return Array.isArray(value) && REQUIRED_NON_CLAIMS.every((claim) => value.includes(claim));
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
  if (provenance.schema_version !== "windows-public-artifact-provenance-v1") {
    issues.push(`artifact:${artifact.filename}:invalid-provenance-schema`);
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
  if (provenance.release_upload_authorized !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-upload-must-stay-false`);
  }
  if (provenance.windows_public_artifact_ready !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-public-ready-must-stay-false`);
  }
  if (provenance.generated_release_artifacts_commit_allowed !== false) {
    issues.push(`artifact:${artifact.filename}:provenance-commit-must-stay-false`);
  }
  return issues;
}

function validateArtifact(file, manifest, artifact, index) {
  const prefix = `artifact[${index}]`;
  const issues = [];
  if (!artifact || typeof artifact !== "object") return [`${prefix}:not-object`];
  if (!artifact.filename || typeof artifact.filename !== "string") issues.push(`${prefix}:missing-filename`);
  if (!ALLOWED_EXTENSIONS.has(path.extname(artifact.filename).toLowerCase())) {
    issues.push(`${prefix}:unsupported-artifact-extension`);
  }
  if (!/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? "")) issues.push(`${prefix}:invalid-sha256`);
  if (!Number.isInteger(artifact.size_bytes) || artifact.size_bytes <= 0) issues.push(`${prefix}:invalid-size`);
  if (artifact.platform !== "windows") issues.push(`${prefix}:invalid-platform`);
  if (!ALLOWED_ARCHITECTURES.has(artifact.architecture)) issues.push(`${prefix}:invalid-architecture`);
  if (!ALLOWED_BUNDLE_TARGETS.has(artifact.bundle_target)) issues.push(`${prefix}:invalid-bundle-target`);
  if (!ALLOWED_SIGNING_STATUS.has(artifact.signing_status)) issues.push(`${prefix}:invalid-signing-status`);
  if (artifact.webview2_runtime_required !== true) issues.push(`${prefix}:webview2-required`);
  if (artifact.smartscreen_reputation_claim !== false) issues.push(`${prefix}:smartscreen-must-stay-false`);
  if (artifact.signing_trust_boundary !== false) issues.push(`${prefix}:signing-boundary-must-stay-false`);
  if (!artifact.checksum_file || typeof artifact.checksum_file !== "string") issues.push(`${prefix}:missing-checksum-file`);
  if (!artifact.provenance_file || typeof artifact.provenance_file !== "string") issues.push(`${prefix}:missing-provenance-file`);
  if (manifest.release_class === "stable" && artifact.signing_status === "unsigned-hold") {
    issues.push(`${prefix}:stable-must-not-be-unsigned-hold`);
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
  const manifest = readJson(file);
  if (!manifest || typeof manifest !== "object") {
    return { file, valid: false, issues: ["invalid-json"] };
  }
  if (manifest.schema_version !== "windows-public-artifact-manifest-v1") issues.push("invalid-schema-version");
  if (manifest.repository !== "answndud/another-dimension-chat") issues.push("invalid-repository");
  if (!/^[0-9a-f]{7,40}$/i.test(manifest.source_commit ?? "")) issues.push("invalid-source-commit");
  if (requireCurrentHead && manifest.source_commit !== head) issues.push("source-commit-not-current-head");
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) issues.push("invalid-version");
  if (!ALLOWED_RELEASE_CLASSES.has(manifest.release_class)) issues.push("invalid-release-class");
  if (manifest.same_release_asset_authority_required !== true) issues.push("same-release-authority-required");
  if (manifest.release_upload_authorized !== false) issues.push("release-upload-must-stay-false");
  if (manifest.release_body_edit_authorized !== false) issues.push("release-body-edit-must-stay-false");
  if (manifest.windows_public_artifact_ready !== false) issues.push("windows-public-artifact-ready-must-stay-false");
  if (manifest.windows_installer_ready !== false) issues.push("windows-installer-ready-must-stay-false");
  if (manifest.generated_release_artifacts_commit_allowed !== false) {
    issues.push("generated-artifact-commit-must-stay-false");
  }
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
console.log(`windows_artifact_manifest_current_head_required=${requireCurrentHead}`);
console.log(`windows_artifact_manifest_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_windows_artifact_manifests=0");
  console.log("windows_public_artifact_ready=false");
  console.log("windows_installer_ready=false");
  console.log("windows_public_artifact_upload_allowed=false");
  console.log("status=waiting-for-windows-artifact-manifest");
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
  console.log("status=invalid-windows-artifact-manifest");
  process.exit(1);
}

console.log(`accepted_windows_artifact_manifests=${files.length}`);
console.log("windows_artifact_checksum_bytes_verified=true");
console.log("windows_artifact_provenance_consistency_verified=true");
console.log("windows_public_artifact_ready=false");
console.log("windows_installer_ready=false");
console.log("windows_public_artifact_upload_allowed=false");
console.log("windows_public_artifact_ready_reason=real-windows-result-and-release-gate-update-required");
console.log("status=windows-artifact-manifest-candidate-requires-release-gate");

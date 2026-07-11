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
const BUNDLE_TARGET_EXTENSIONS = Object.freeze({
  msi: ".msi",
  nsis: ".exe",
  "portable-archive": ".zip",
  msix: ".msix",
});
const DEFAULT_ARTIFACT_EXTENSION_BY_TARGET = BUNDLE_TARGET_EXTENSIONS;

const FORBIDDEN_PATTERNS = Object.freeze([
  [/windows_public_artifact_ready"\s*:\s*true/i, "windows-public-artifact-ready"],
  [/windows_installer_ready"\s*:\s*true/i, "windows-installer-ready"],
  [/windows_public_artifact_upload_allowed"\s*:\s*true/i, "windows-public-upload-allowed"],
  [/generated_release_artifacts_commit_allowed"\s*:\s*true/i, "generated-artifact-commit-allowed"],
  [/smartscreen_reputation_claim"\s*:\s*true/i, "smartscreen-reputation-claim"],
  [/signing_trust_boundary"\s*:\s*true/i, "signing-trust-boundary"],
  [/engine_sidecar_raw_path_returned"\s*:\s*true/i, "engine-sidecar-raw-path-returned"],
  [/engine_sidecar_stdout_returned"\s*:\s*true/i, "engine-sidecar-stdout-returned"],
  [/engine_sidecar_stderr_returned"\s*:\s*true/i, "engine-sidecar-stderr-returned"],
  [/engine_sidecar_local_runtime_promoted_to_delivery_proof"\s*:\s*true/i, "engine-sidecar-delivery-proof-claim"],
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
      if (entry.isFile() && /^WINDOWS_ARTIFACT_MANIFEST.*\.json$/i.test(entry.name)) {
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

function basenameOnlyIssues(prefix, field, value) {
  if (!value || typeof value !== "string") return [`${prefix}:missing-${field}`];
  if (path.isAbsolute(value)) return [`${prefix}:${field}-absolute-path`];
  if (value !== path.basename(value) || value.includes("..") || /[\\/]/.test(value)) {
    return [`${prefix}:${field}-must-be-basename`];
  }
  return [];
}

function validateArtifactStructure(prefix, artifactFile, extension) {
  const issues = [];
  const bytes = fs.readFileSync(artifactFile);
  if (extension === ".exe") {
    if (bytes.length < 0x40 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
      return [`${prefix}:invalid-pe-mz-header`];
    }
    const peOffset = bytes.readUInt32LE(0x3c);
    if (peOffset <= 0 || peOffset + 4 > bytes.length) {
      return [`${prefix}:invalid-pe-header-offset`];
    }
    if (
      bytes[peOffset] !== 0x50 ||
      bytes[peOffset + 1] !== 0x45 ||
      bytes[peOffset + 2] !== 0x00 ||
      bytes[peOffset + 3] !== 0x00
    ) {
      issues.push(`${prefix}:missing-pe-signature`);
    }
    return issues;
  }
  if (extension === ".msi") {
    const msiMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    if (bytes.length < msiMagic.length || !bytes.subarray(0, msiMagic.length).equals(msiMagic)) {
      issues.push(`${prefix}:invalid-msi-compound-file-header`);
    }
    return issues;
  }
  if (extension === ".zip" || extension === ".msix") {
    const validZipMagic =
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
        (bytes[2] === 0x05 && bytes[3] === 0x06) ||
        (bytes[2] === 0x07 && bytes[3] === 0x08));
    if (!validZipMagic) {
      issues.push(`${prefix}:invalid-zip-header`);
    }
  }
  return issues;
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
  if (provenance.repository !== manifest.repository) {
    issues.push(`artifact:${artifact.filename}:provenance-repository-mismatch`);
  }
  if (provenance.release_class !== manifest.release_class) {
    issues.push(`artifact:${artifact.filename}:provenance-release-class-mismatch`);
  }
  if (provenance.bundle_target !== artifact.bundle_target) {
    issues.push(`artifact:${artifact.filename}:provenance-bundle-target-mismatch`);
  }
  if (provenance.signing_status !== artifact.signing_status) {
    issues.push(`artifact:${artifact.filename}:provenance-signing-status-mismatch`);
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
  issues.push(...validateEngineSidecarContract(`artifact:${artifact.filename}:provenance`, provenance));
  return issues;
}

function validateEngineSidecarContract(prefix, value) {
  const issues = [];
  if (!value || typeof value !== "object") return [`${prefix}:engine-sidecar-contract-missing`];
  if (value.engine_sidecar_required !== true) issues.push(`${prefix}:engine-sidecar-required`);
  if (value.engine_sidecar_packaged !== true) issues.push(`${prefix}:engine-sidecar-packaged`);
  if (value.engine_sidecar_runtime_mode !== "manual-e2ee-engine-sidecar") {
    issues.push(`${prefix}:engine-sidecar-runtime-mode-mismatch`);
  }
  if (value.engine_sidecar_protocol !== "ad-engine-json-stdio-v1") {
    issues.push(`${prefix}:engine-sidecar-protocol-mismatch`);
  }
  if (value.engine_sidecar_contract_version !== 1) {
    issues.push(`${prefix}:engine-sidecar-contract-version-mismatch`);
  }
  if (value.engine_sidecar_status_command !== "status") {
    issues.push(`${prefix}:engine-sidecar-status-command-mismatch`);
  }
  if (value.engine_sidecar_manual_self_test_command !== "manual-self-test") {
    issues.push(`${prefix}:engine-sidecar-manual-self-test-command-mismatch`);
  }
  if (value.engine_sidecar_manual_self_test_required !== true) {
    issues.push(`${prefix}:engine-sidecar-manual-self-test-required`);
  }
  if (value.engine_sidecar_raw_path_returned !== false) {
    issues.push(`${prefix}:engine-sidecar-raw-path-must-stay-false`);
  }
  if (value.engine_sidecar_stdout_returned !== false) {
    issues.push(`${prefix}:engine-sidecar-stdout-must-stay-false`);
  }
  if (value.engine_sidecar_stderr_returned !== false) {
    issues.push(`${prefix}:engine-sidecar-stderr-must-stay-false`);
  }
  if (value.engine_sidecar_app_launch_network_allowed !== false) {
    issues.push(`${prefix}:engine-sidecar-app-launch-network-must-stay-false`);
  }
  if (value.engine_sidecar_room_open_network_allowed !== false) {
    issues.push(`${prefix}:engine-sidecar-room-open-network-must-stay-false`);
  }
  if (value.engine_sidecar_local_runtime_promoted_to_delivery_proof !== false) {
    issues.push(`${prefix}:engine-sidecar-delivery-proof-must-stay-false`);
  }
  return issues;
}

function validateArtifact(file, manifest, artifact, index) {
  const prefix = `artifact[${index}]`;
  const issues = [];
  if (!artifact || typeof artifact !== "object") return [`${prefix}:not-object`];
  issues.push(...basenameOnlyIssues(prefix, "filename", artifact.filename));
  issues.push(...basenameOnlyIssues(prefix, "checksum-file", artifact.checksum_file));
  issues.push(...basenameOnlyIssues(prefix, "provenance-file", artifact.provenance_file));
  if (artifact.artifact_basename !== artifact.filename) issues.push(`${prefix}:artifact-basename-mismatch`);
  if (artifact.checksum_sidecar !== undefined && artifact.checksum_sidecar !== artifact.checksum_file) {
    issues.push(`${prefix}:checksum-sidecar-mismatch`);
  }
  if (artifact.provenance_path !== undefined && artifact.provenance_path !== artifact.provenance_file) {
    issues.push(`${prefix}:provenance-path-mismatch`);
  }
  if (artifact.artifact_path_class !== "generated-release-directory-relative-basename") {
    issues.push(`${prefix}:artifact-path-class-mismatch`);
  }
  if (!ALLOWED_EXTENSIONS.has(path.extname(artifact.filename).toLowerCase())) {
    issues.push(`${prefix}:unsupported-artifact-extension`);
  }
  if (!/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? "")) issues.push(`${prefix}:invalid-sha256`);
  if (!Number.isInteger(artifact.size_bytes) || artifact.size_bytes <= 0) issues.push(`${prefix}:invalid-size`);
  if (artifact.platform !== "windows") issues.push(`${prefix}:invalid-platform`);
  if (!ALLOWED_ARCHITECTURES.has(artifact.architecture)) issues.push(`${prefix}:invalid-architecture`);
  if (!ALLOWED_BUNDLE_TARGETS.has(artifact.bundle_target)) issues.push(`${prefix}:invalid-bundle-target`);
  const expectedExtension = BUNDLE_TARGET_EXTENSIONS[artifact.bundle_target];
  if (expectedExtension && path.extname(artifact.filename).toLowerCase() !== expectedExtension) {
    issues.push(`${prefix}:bundle-target-extension-mismatch`);
  }
  if (!ALLOWED_SIGNING_STATUS.has(artifact.signing_status)) issues.push(`${prefix}:invalid-signing-status`);
  if (artifact.webview2_runtime_required !== true) issues.push(`${prefix}:webview2-required`);
  if (artifact.app_data_resolver !== "tauri-app-data") issues.push(`${prefix}:app-data-resolver-mismatch`);
  if (artifact.encrypted_store_required !== true) issues.push(`${prefix}:encrypted-store-required`);
  if (artifact.redacted_diagnostics_required !== true) issues.push(`${prefix}:redacted-diagnostics-required`);
  if (artifact.auto_update !== false) issues.push(`${prefix}:auto-update-must-stay-false`);
  if (artifact.smartscreen_reputation_claim !== false) issues.push(`${prefix}:smartscreen-must-stay-false`);
  if (artifact.signing_trust_boundary !== false) issues.push(`${prefix}:signing-boundary-must-stay-false`);
  issues.push(...validateEngineSidecarContract(prefix, artifact));
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
  issues.push(...validateArtifactStructure(prefix, artifactFile, path.extname(artifact.filename).toLowerCase()));
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
  issues.push(...basenameOnlyIssues("manifest", "manifest-file", manifest.manifest_file));
  issues.push(...basenameOnlyIssues("manifest", "manifest-sha256-file", manifest.manifest_sha256_file));
  if (manifest.manifest_file !== path.basename(file)) issues.push("manifest-file-name-mismatch");
  const manifestShaFile = relativeSibling(file, manifest.manifest_sha256_file);
  if (!manifestShaFile || !fs.existsSync(manifestShaFile)) {
    issues.push("manifest-sha256-file-missing");
  } else {
    const expectedLine = `${sha256File(file)}  ${path.basename(file)}`;
    if (fs.readFileSync(manifestShaFile, "utf8").trim() !== expectedLine) {
      issues.push("manifest-sha256-file-mismatch");
    }
  }
  if (!ALLOWED_BUNDLE_TARGETS.has(manifest.default_bundle_target)) {
    issues.push("invalid-default-bundle-target");
  }
  if (manifest.default_artifact_extension !== DEFAULT_ARTIFACT_EXTENSION_BY_TARGET[manifest.default_bundle_target]) {
    issues.push("default-artifact-extension-mismatch");
  }
  if (manifest.webview2_runtime_required !== true) issues.push("webview2-required");
  if (manifest.app_data_resolver !== "tauri-app-data") issues.push("app-data-resolver-mismatch");
  if (manifest.redacted_diagnostics_required !== true) issues.push("redacted-diagnostics-required");
  if (manifest.auto_update !== false) issues.push("auto-update-must-stay-false");
  issues.push(...validateEngineSidecarContract("manifest", manifest));
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
console.log("windows_artifact_package_structure_verified=true");
console.log("windows_artifact_engine_sidecar_packaged_verified=true");
console.log("windows_artifact_engine_sidecar_manual_self_test_required=true");
console.log("windows_artifact_provenance_consistency_verified=true");
console.log("windows_artifact_manifest_sha_sidecar_verified=true");
console.log("windows_artifact_basename_path_boundary_verified=true");
console.log("windows_public_artifact_ready=false");
console.log("windows_installer_ready=false");
console.log("windows_public_artifact_upload_allowed=false");
console.log("windows_public_artifact_ready_reason=real-windows-result-and-release-gate-update-required");
console.log("status=windows-artifact-manifest-candidate-requires-release-gate");

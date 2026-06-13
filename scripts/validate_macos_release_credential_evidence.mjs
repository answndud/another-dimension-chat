#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_EVIDENCE_DIR = path.join(process.cwd(), "docs", "macos-release-credential-evidence");

const REQUIRED_FIELDS = Object.freeze([
  "schema_version",
  "evidence_id",
  "evidence_subject",
  "collection_scope",
  "repository",
  "branch",
  "source_commit",
  "apple_team_id",
  "developer_id_common_name",
  "developer_id_team_id",
  "developer_id_sha1",
  "developer_id_not_after",
  "developer_id_days_remaining",
  "codesigning_identity_observed",
  "certificate_expiry_inspected",
  "xcode_path_redacted",
  "notarytool_version",
  "notary_credential_mode",
  "notary_credential_label_redacted",
  "notary_history_check",
  "notary_history_checked_at_utc",
  "release_mutation_authorized",
  "dmg_rebuild_authorized",
  "secret_material_included",
  "public_non_claims_confirmed",
]);

const ALLOWED_VALUES = new Map([
  ["schema_version", new Set(["macos-release-credential-evidence-v1"])],
  ["evidence_subject", new Set(["developer-id-and-notary-readiness"])],
  ["collection_scope", new Set(["release-machine", "ci-signing-service"])],
  ["repository", new Set(["answndud/another-dimension-chat"])],
  ["branch", new Set(["main"])],
  ["codesigning_identity_observed", new Set(["true"])],
  ["certificate_expiry_inspected", new Set(["true"])],
  ["xcode_path_redacted", new Set(["true"])],
  ["notary_credential_mode", new Set([
    "keychain-profile",
    "app-store-connect-api-key",
    "apple-id-app-specific-password",
  ])],
  ["notary_credential_label_redacted", new Set(["true"])],
  ["notary_history_check", new Set(["pass"])],
  ["release_mutation_authorized", new Set(["false"])],
  ["dmg_rebuild_authorized", new Set(["false"])],
  ["secret_material_included", new Set(["false"])],
]);

const REQUIRED_NON_CLAIMS = Object.freeze([
  "unsigned-experimental-public-beta",
  "sensitive-communication-prohibited",
  "not-audited",
  "not-production-ready",
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key-pem"],
  [/-----BEGIN [^-]+CERTIFICATE-----/i, "certificate-pem"],
  [/\bAD_RELEASE_NOTARY_(?:KEY|KEY_ID|ISSUER|APPLE_ID|PASSWORD)\b/i, "notary-env-secret"],
  [/\bNOTARYTOOL_PROFILE\s*=/i, "notary-profile-env-value"],
  [/\bAPPLE_ID\s*=/i, "apple-id-env-value"],
  [/\bPASSWORD\s*=/i, "password-env-value"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "email-address"],
  [/\.(?:p8|pem)\b/i, "private-key-file-reference"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop|Documents)\//, "macos-local-path"],
  [/[A-Z]:\\Users\\/i, "windows-local-path"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\.onion\b/i, "onion-endpoint"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\bpassphrase\b/i, "passphrase"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
  [/[A-Za-z0-9+/]{80,}={0,2}/, "long-secret-like-token"],
]);

function collectEvidenceFiles(inputs) {
  const targets = inputs.length > 0 ? inputs : [DEFAULT_EVIDENCE_DIR];
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
      if (!/\.(md|txt|properties)$/i.test(entry.name)) continue;
      files.push(path.join(target, entry.name));
    }
  }
  return files.sort();
}

function parseEvidence(text) {
  const fields = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([a-z][a-z0-9_]*)=(.*)$/);
    if (!match) continue;
    fields.set(match[1], match[2].trim());
  }
  return fields;
}

function isUnresolved(value) {
  return value === "" || value.includes("|") || /^tbd$/i.test(value) || /^todo$/i.test(value);
}

function sameSet(actual, expected) {
  return actual.size === expected.length && expected.every((item) => actual.has(item));
}

function isIsoUtc(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value);
}

function currentGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function validateEvidence(file, { requireCurrentHead = false, head = "" } = {}) {
  const text = fs.readFileSync(file, "utf8");
  const fields = parseEvidence(text);
  const issues = [];
  for (const field of REQUIRED_FIELDS) {
    const value = fields.get(field) ?? "";
    if (isUnresolved(value)) issues.push(`missing-or-template-value:${field}`);
  }
  for (const [field, value] of fields) {
    if (!REQUIRED_FIELDS.includes(field)) issues.push(`unknown-field:${field}`);
    const allowed = ALLOWED_VALUES.get(field);
    if (allowed && !allowed.has(value)) issues.push(`invalid-value:${field}`);
  }

  const evidenceId = fields.get("evidence_id") ?? "";
  if (!/^MACOS-CRED-[0-9]{4}$/.test(evidenceId)) issues.push("invalid-evidence-id");

  const sourceCommit = fields.get("source_commit") ?? "";
  if (!/^[0-9a-f]{7,40}$/i.test(sourceCommit)) issues.push("invalid-source-commit");
  if (requireCurrentHead && (!/^[0-9a-f]{40}$/i.test(head) || sourceCommit !== head)) {
    issues.push("source-commit-not-current-head");
  }

  const teamId = fields.get("apple_team_id") ?? "";
  const developerIdTeamId = fields.get("developer_id_team_id") ?? "";
  if (!/^[A-Z0-9]{10}$/.test(teamId)) issues.push("invalid-apple-team-id");
  if (developerIdTeamId !== teamId) issues.push("developer-id-team-id-mismatch");

  const commonName = fields.get("developer_id_common_name") ?? "";
  if (!new RegExp(`^Developer ID Application: .+ \\(${teamId || "[A-Z0-9]{10}"}\\)$`).test(commonName)) {
    issues.push("invalid-developer-id-common-name");
  }

  const sha1 = fields.get("developer_id_sha1") ?? "";
  if (!/^[a-f0-9]{40}$/i.test(sha1)) issues.push("invalid-developer-id-sha1");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.get("developer_id_not_after") ?? "")) {
    issues.push("invalid-developer-id-not-after");
  }

  const daysRemaining = Number.parseInt(fields.get("developer_id_days_remaining") ?? "", 10);
  if (!Number.isInteger(daysRemaining) || daysRemaining < 30) {
    issues.push("developer-id-expiry-too-soon");
  }

  if (!/^[0-9]+(?:\.[0-9]+)*(?: \([0-9]+\))?$/.test(fields.get("notarytool_version") ?? "")) {
    issues.push("invalid-notarytool-version");
  }

  if (!isIsoUtc(fields.get("notary_history_checked_at_utc") ?? "")) {
    issues.push("invalid-notary-history-checked-at");
  }

  const nonClaims = new Set((fields.get("public_non_claims_confirmed") ?? "").split("#").filter(Boolean));
  if (!sameSet(nonClaims, REQUIRED_NON_CLAIMS)) issues.push("non-claims-mismatch");

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) issues.push(`forbidden-content:${label}`);
  }

  return { file, fields, issues, valid: issues.length === 0 };
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const evidenceInputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const head = requireCurrentHead ? currentGitHead() : "";

const evidenceFiles = collectEvidenceFiles(evidenceInputs);
console.log(`credential_evidence_current_head_required=${requireCurrentHead}`);
console.log(`credential_evidence_files_found=${evidenceFiles.length}`);

if (evidenceFiles.length === 0) {
  console.log("accepted_macos_release_credential_evidence=0");
  console.log("m100_1_release_credential_evidence_candidate=false");
  console.log("m100_1_release_credentials_ready=false");
  console.log("status=waiting-for-macos-release-credential-evidence");
  process.exit(0);
}

const validated = evidenceFiles.map((file) => validateEvidence(file, { requireCurrentHead, head }));
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
  console.log("status=invalid-macos-release-credential-evidence");
  process.exit(1);
}

console.log(`accepted_macos_release_credential_evidence=${validated.length}`);
console.log("m100_1_release_credential_evidence_candidate=true");
console.log("m100_1_release_credentials_ready=false");
console.log("m100_1_release_credentials_ready_reason=live-release-machine-verifier-still-required");
console.log("release_upload_authorized=false");
console.log("dmg_rebuild_authorized=false");
console.log("status=macos-release-credential-evidence-candidate-requires-live-verifier");

#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT_DIR = path.join(process.cwd(), "docs", "external-review-signoff");
const REVIEW_TYPES = new Set(["independent-review", "security-audit", "limited-security-review"]);
const SAFE_INPUT_PREFIXES = Object.freeze(["reference/", "scripts/", "crates/", "apps/"]);
const FORBIDDEN_PATTERNS = Object.freeze([
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\.onion\b/i, "onion-endpoint"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/[A-Z]:\\Users\\/i, "windows-local-path"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
  [/external_review_completed"\s*:\s*true/i, "external-review-completed"],
  [/audit_completed"\s*:\s*true/i, "audit-completed"],
  [/reviewer_signoff_claimed"\s*:\s*true/i, "reviewer-signoff-claimed"],
  [/audited_claim_allowed"\s*:\s*true/i, "audited-claim-allowed"],
  [/security_ready_claimed"\s*:\s*true/i, "security-ready-claimed"],
  [/production_ready_claim_allowed"\s*:\s*true/i, "production-ready-claim"],
  [/sensitive_communication_allowed"\s*:\s*true/i, "sensitive-communication-allowed"],
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
  const targets = inputs.length > 0 ? inputs : [DEFAULT_INPUT_DIR];
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

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validReviewedInput(value) {
  if (value === "Cargo.toml" || value === "README.md" || value === "SECURITY.md") return true;
  return SAFE_INPUT_PREFIXES.some((prefix) => value.startsWith(prefix)) && !value.includes("..");
}

function validNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateSignoff(file, { requireCurrentHead, head }) {
  const text = fs.readFileSync(file, "utf8");
  const issues = [];
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) issues.push(`forbidden-content:${label}`);
  }

  const doc = readJson(file);
  if (!doc || typeof doc !== "object") {
    return { file, valid: false, issues: ["invalid-json"] };
  }

  if (doc.schema_version !== "external-review-signoff-v1") issues.push("invalid-schema-version");
  if (!/^XR-\d{4}-\d{4}$/.test(doc.review_id ?? "")) issues.push("invalid-review-id");
  if (!REVIEW_TYPES.has(doc.review_type)) issues.push("invalid-review-type");
  if (!/^[0-9a-f]{7,40}$/i.test(doc.reviewed_commit ?? "")) issues.push("invalid-reviewed-commit");
  if (requireCurrentHead && doc.reviewed_commit !== head) issues.push("reviewed-commit-not-current-head");
  if (!validDate(doc.completed_at)) issues.push("invalid-completed-at");
  if (!/^[a-f0-9]{64}$/i.test(doc.public_safe_report_sha256 ?? "")) {
    issues.push("invalid-public-safe-report-sha256");
  }

  const reviewer = doc.reviewer;
  if (!reviewer || typeof reviewer !== "object") {
    issues.push("missing-reviewer");
  } else {
    for (const field of ["name", "affiliation", "contact"]) {
      if (!reviewer[field] || typeof reviewer[field] !== "string") {
        issues.push(`missing-reviewer-${field}`);
      }
    }
    if (/\b(todo|tbd|unknown|anonymous|placeholder|sample)\b/i.test(reviewer.name ?? "")) {
      issues.push("placeholder-reviewer-name");
    }
  }

  if (!Array.isArray(doc.reviewed_inputs) || doc.reviewed_inputs.length === 0) {
    issues.push("missing-reviewed-inputs");
  } else {
    for (const input of doc.reviewed_inputs) {
      if (typeof input !== "string" || !validReviewedInput(input)) {
        issues.push(`invalid-reviewed-input:${input}`);
      }
    }
  }

  const counts = doc.finding_summary;
  if (!counts || typeof counts !== "object") {
    issues.push("missing-finding-summary");
  } else {
    for (const field of [
      "total_findings",
      "critical_open",
      "high_open",
      "medium_open",
      "low_open",
      "informational_open",
      "fixed",
      "held",
      "waived",
    ]) {
      if (!validNonNegativeInteger(counts[field])) issues.push(`invalid-finding-count:${field}`);
    }
    if (counts.all_findings_triaged !== true) issues.push("all-findings-must-be-triaged");
  }

  const signoff = doc.signoff;
  if (!signoff || typeof signoff !== "object") {
    issues.push("missing-signoff");
  } else {
    if (signoff.reviewer_signed_public_safe_summary !== true) {
      issues.push("missing-public-safe-summary-signature");
    }
    for (const field of [
      "reviewer_claims_sensitive_use_safety",
      "reviewer_claims_production_ready",
      "reviewer_claims_audited_product",
    ]) {
      if (signoff[field] !== false) issues.push(`forbidden-signoff-claim:${field}`);
    }
  }

  const boundary = doc.evidence_boundary;
  if (!boundary || typeof boundary !== "object") {
    issues.push("missing-evidence-boundary");
  } else {
    if (boundary.external_reviewer_submitted !== true) issues.push("not-external-reviewer-submitted");
    if (boundary.fabricated_or_local_only !== false) issues.push("fabricated-or-local-only");
    if (boundary.private_material_included !== false) issues.push("private-material-included");
    if (boundary.owner_claim_decision_required !== true) issues.push("owner-claim-decision-required");
  }

  return { file, valid: issues.length === 0, issues };
}

const rawArgs = process.argv.slice(2);
const requireCurrentHead =
  rawArgs.includes("--require-current-head") || process.env.AD_REQUIRE_CURRENT_HEAD === "1";
const inputs = rawArgs.filter((arg) => arg !== "--require-current-head");
const files = collectFiles(inputs);
console.log(`external_review_signoff_current_head_required=${requireCurrentHead}`);
console.log(`external_review_signoff_files_found=${files.length}`);

if (files.length === 0) {
  console.log("accepted_external_review_signoffs=0");
  console.log("external_review_signoff_waiting_for_real_input=true");
  console.log("external_review_completed=false");
  console.log("audit_completed=false");
  console.log("reviewer_signoff_claimed=false");
  console.log("audited_claim_allowed=false");
  console.log("status=waiting-for-external-review-signoff");
  process.exit(0);
}

const head = requireCurrentHead ? currentHead() : "";
let failures = 0;
for (const result of files.map((file) => validateSignoff(file, { requireCurrentHead, head }))) {
  if (result.valid) {
    console.log(`ok ${path.basename(result.file)}`);
  } else {
    failures += 1;
    console.log(`FAIL ${path.basename(result.file)} ${result.issues.join(",")}`);
  }
}

if (failures > 0) {
  console.log("status=invalid-external-review-signoff");
  process.exit(1);
}

console.log(`accepted_external_review_signoffs=${files.length}`);
console.log("external_review_signoff_candidate_requires_owner_claim_decision=true");
console.log("external_review_completed=false");
console.log("audit_completed=false");
console.log("reviewer_signoff_claimed=false");
console.log("audited_claim_allowed=false");
console.log("security_ready_claimed=false");
console.log("production_ready_claim_allowed=false");
console.log("sensitive_communication_allowed=false");
console.log("status=external-review-signoff-candidate-requires-owner-claim-decision");

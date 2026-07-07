#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const trackerPath = process.argv[2] ?? path.join(process.cwd(), "reference", "AUDIT_FINDING_TRACKER.md");

const FORBIDDEN_PATTERNS = Object.freeze([
  [/\.onion\b/i, "onion-endpoint"],
  [/\bADPAIR[0-9A-Z]*\b/i, "pairing-payload"],
  [/\bADENV[0-9A-Z]*\b/i, "envelope-payload"],
  [/\bADENDPOINT[A-Z0-9]*\b/i, "endpoint-payload"],
  [/\bpassphrase\b/i, "passphrase"],
  [/-----BEGIN [^-]+PRIVATE KEY-----/i, "private-key"],
  [/\/Users\/[^/\s]+\/(?:Library|project|Downloads|Desktop)\//, "local-path"],
  [/\bobfs4\s+[0-9a-f:.]+/i, "bridge-line"],
  [/\b(raw log|crash dump|private key|key material)\b/i, "private-debug-data"],
]);

const SEVERITIES = new Set(["critical", "high", "medium", "low", "informational", "none"]);
const DECISIONS = new Set(["fix", "hold", "waive", "none"]);
const STATUSES = new Set(["open", "fixed", "held", "waived", "no-audit-yet", "none"]);

function fail(message) {
  console.error(`error=${message}`);
  process.exit(1);
}

if (!fs.existsSync(trackerPath)) {
  fail(`missing audit finding tracker: ${trackerPath}`);
}

const text = fs.readFileSync(trackerPath, "utf8");

function countFlag(name) {
  const match = text.match(new RegExp(`^- ${name}=([0-9]+|false|true)$`, "m"));
  if (!match) fail(`missing-count-or-flag:${name}`);
  const value = match[1];
  if (value === "true") return true;
  if (value === "false") return false;
  return Number.parseInt(value, 10);
}

const tableMatch = text.match(/## Finding Table\s+([\s\S]*?)\n## Current Counts/);
if (!tableMatch) fail("missing-finding-table");

const rows = tableMatch[1]
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line) && !/^\|\s*ID\s*\|/.test(line));

if (rows.length === 0) fail("empty-finding-table");

const findings = [];
for (const row of rows) {
  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(row)) {
      fail(`forbidden-content:${label}`);
    }
  }
  const cells = row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  if (cells.length !== 7) fail(`invalid-column-count:${row}`);
  const [id, severity, area, summary, decision, status, impact] = cells;
  if (id === "none") {
    if (rows.length !== 1) fail("none-row-mixed-with-real-findings");
    if (severity !== "none" || area !== "none" || decision !== "hold" || status !== "no-audit-yet") {
      fail("invalid-none-row");
    }
  } else if (!/^AR-[0-9]{4}$/.test(id)) {
    fail(`invalid-id:${id}`);
  }
  if (!SEVERITIES.has(severity)) fail(`invalid-severity:${severity}`);
  if (!DECISIONS.has(decision)) fail(`invalid-decision:${decision}`);
  if (!STATUSES.has(status)) fail(`invalid-status:${status}`);
  if (!summary || /\b(todo|tbd|raw log|payload|private key)\b/i.test(summary)) {
    fail(`invalid-summary:${id}`);
  }
  if (!impact || !impact.includes("not audited")) {
    fail(`missing-nonclaim-impact:${id}`);
  }
  findings.push({ id, severity, decision, status });
}

const realFindings = findings.filter((finding) => finding.id !== "none");
const openBySeverity = {
  critical: realFindings.filter((finding) => finding.severity === "critical" && finding.status === "open").length,
  high: realFindings.filter((finding) => finding.severity === "high" && finding.status === "open").length,
  medium: realFindings.filter((finding) => finding.severity === "medium" && finding.status === "open").length,
  low: realFindings.filter((finding) => finding.severity === "low" && finding.status === "open").length,
  informational: realFindings.filter((finding) => finding.severity === "informational" && finding.status === "open").length,
};
const fixed = realFindings.filter((finding) => finding.status === "fixed" || finding.decision === "fix").length;
const held = realFindings.filter((finding) => finding.status === "held" || finding.decision === "hold").length;
const waived = realFindings.filter((finding) => finding.status === "waived" || finding.decision === "waive").length;

const expectedCounts = new Map([
  ["critical_findings_open", openBySeverity.critical],
  ["high_findings_open", openBySeverity.high],
  ["medium_findings_open", openBySeverity.medium],
  ["low_findings_open", openBySeverity.low],
  ["informational_findings_open", openBySeverity.informational],
  ["findings_fixed", fixed],
  ["findings_held", held],
  ["findings_waived", waived],
]);

for (const [name, expected] of expectedCounts) {
  const actual = countFlag(name);
  if (actual !== expected) {
    fail(`count-mismatch:${name}:expected-${expected}:actual-${actual}`);
  }
}

for (const flag of [
  "external_review_completed",
  "audit_completed",
  "audited_claim_allowed",
  "security_ready_claimed",
]) {
  if (countFlag(flag) !== false) {
    fail(`forbidden-true-flag:${flag}`);
  }
}

console.log(`audit_findings_recorded=${realFindings.length}`);
console.log(`critical_findings_open=${openBySeverity.critical}`);
console.log(`high_findings_open=${openBySeverity.high}`);
console.log("external_review_completed=false");
console.log("audit_completed=false");
console.log("audited_claim_allowed=false");
console.log("security_ready_claimed=false");
console.log("status=audit-finding-tracker-valid");

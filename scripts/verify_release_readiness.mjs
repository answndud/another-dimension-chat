#!/usr/bin/env node
// P8 private-trusted release readiness gate.
//
// Pins the evidence artifacts for every criterion of the PLAN.md P8 decision.
// Each criterion is backed by an existing verifier/acceptance script or a
// documented external-channel procedure; this gate only fails when a required
// artifact or marker is missing. The actual acceptance execution is performed
// by scripts/verify_full.sh and scripts/acceptance_representative_flow.mjs.
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fail = (message) => { throw new Error(`release readiness: ${message}`); };

const criteria = [
  {
    id: 1,
    name: "private release profile exists",
    evidence: ["scripts/acceptance_private_release.mjs"],
  },
  {
    id: 2,
    name: "development and private archives are separated",
    evidence: ["scripts/build_release.sh"],
  },
  {
    id: 3,
    name: "release signing, manifest, and SHA-256 verification work",
    evidence: ["scripts/verify_private_release_gate.mjs", "scripts/verify_release_manifest.mjs"],
  },
  {
    id: 4,
    name: "release public key fingerprint verifiable via a separate channel",
    evidence: ["reference/RELEASE_TRUST_OPERATIONS.md", "reference/RELEASE_READINESS.md"],
  },
  {
    id: 5,
    name: "installs and runs with bundled Node",
    evidence: ["scripts/install_local_server.sh", "scripts/acceptance_private_release.mjs"],
  },
  {
    id: 6,
    name: "production relay refuses to start without an operator relay key",
    evidence: ["scripts/acceptance_relay_operations.mjs"],
  },
  {
    id: 7,
    name: "HTTPS and relay trust are verified",
    evidence: ["scripts/verify_transport_boundary.mjs", "scripts/acceptance_daemon_repair.mjs"],
  },
  {
    id: 8,
    name: "two local profiles complete invite, safety number, and approval",
    evidence: ["scripts/acceptance_daemon_repair.mjs"],
  },
  {
    id: 9,
    name: "text, attachment, offline queue, restart, and re-sync work",
    evidence: ["scripts/acceptance_daemon_repair.mjs", "scripts/acceptance_delivery_consistency.mjs"],
  },
  {
    id: 10,
    name: "device revoke works",
    evidence: ["scripts/acceptance_daemon_repair.mjs"],
  },
  {
    id: 11,
    name: "recovery export/import works",
    evidence: ["scripts/acceptance_daemon_repair.mjs"],
  },
  {
    id: 12,
    name: "relay backup/restore works",
    evidence: ["scripts/acceptance_relay_operations.mjs"],
  },
  {
    id: 13,
    name: "update and rollback work",
    evidence: ["scripts/acceptance_private_release.mjs"],
  },
  {
    id: 14,
    name: "no secrets or plaintext in logs, DOM, or network",
    evidence: ["scripts/verify_web_exposure.mjs", "scripts/verify_relay_logs.mjs"],
  },
  {
    id: 15,
    name: "installer, relay operator, and incident documents match real commands",
    evidence: ["scripts/verify_docs_claims.mjs"],
  },
  {
    id: 16,
    name: "supported environment is macOS arm64 + Chromium only",
    evidence: ["scripts/acceptance_os_matrix.mjs", "scripts/verify_support_matrix.mjs", "scripts/verify_product_boundary.mjs"],
  },
  {
    id: 17,
    name: "high-risk features and claims remain disabled",
    evidence: ["scripts/verify_daemon_boundary.mjs", "scripts/verify_product_boundary.mjs"],
  },
];

// Static markers that the decision document and the daemon boundary require.
const docMarkers = [
  ["reference/RELEASE_READINESS.md", "## 판정 조건과 검증"],
  ["reference/RELEASE_READINESS.md", "비판정 항목"],
  ["apps/daemon/src/main.rs", "High-risk release remains disabled"],
];

for (const [file, marker] of docMarkers) {
  const contents = await readFile(resolve(root, file), "utf8");
  if (!contents.includes(marker)) fail(`missing readiness marker: ${file}: ${marker}`);
}

const results = [];
for (const criterion of criteria) {
  const missing = [];
  for (const evidence of criterion.evidence) {
    try {
      await access(resolve(root, evidence));
    } catch {
      missing.push(evidence);
    }
  }
  if (missing.length > 0) {
    results.push({ ...criterion, status: "missing" });
    fail(`criterion ${criterion.id} (${criterion.name}) is missing evidence: ${missing.join(", ")}`);
  }
  results.push({ ...criterion, status: "passed" });
}

for (const result of results) {
  console.log(`release readiness: [${result.id}] ${result.name} -> ${result.status} (${result.evidence.join(", ")})`);
}
console.log(`release readiness passed: ${results.length} criteria backed by evidence artifacts`);

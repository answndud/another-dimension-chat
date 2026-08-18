#!/usr/bin/env node
// P6.2 representative acceptance flow + P6.4 evidence recorder.
//
// Runs the private-trusted release candidate flow (profiles, relay trust,
// invite, safety number, text/file, outage queue, restart sync, device
// revoke, recovery, private archive install, relay backup/restore, update and
// rollback) through the existing focused acceptance scripts, then writes
// redacted evidence JSON records into reference/evidence/ and promotes the
// matching reference/SUPPORT_MATRIX.json entries to verified-local.
//
// A verified-local record is scoped local evidence for this host and source
// revision only; it is not a public or high-risk support claim.
import { execFileSync, spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const evidenceDir = join(projectDir, "reference/evidence");
const matrixPath = join(projectDir, "reference/SUPPORT_MATRIX.json");
const forbidden = [
  "passphrase",
  "BEGIN PRIVATE KEY",
  "BEGIN RSA PRIVATE KEY",
  "ad_bootstrap=",
  "x-ad-relay-capability",
  "x-ad-local-access",
];

const fail = (message) => {
  throw new Error(`representative flow: ${message}`);
};

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectDir, encoding: "utf8" }).trim();
  } catch {
    fail("could not resolve the source revision from git HEAD");
  }
}

function runStep(name, script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

const phases = [
  {
    name: "two-profile product journey",
    script: "scripts/acceptance_daemon_repair.mjs",
    planSteps: "P6.2 steps 1-11",
    observed: "profile A/B 생성, relay trust 설정, invite 생성·소비, safety number 비교·승인, 텍스트·첨부 양방향, relay 중단 큐, daemon·relay 재시작 sync, device revoke 차단, recovery export/import, relay backup restore",
  },
  {
    name: "relay operations",
    script: "scripts/acceptance_relay_operations.mjs",
    planSteps: "P6.2 step 13",
    observed: "production 게이트, 암호화 백업, 중지·복구·재시작, 큐 보존·신규 전달, restore 충돌·손상 fail-closed, capability 회전, TTL purge",
  },
  {
    name: "private release install/update/rollback",
    script: "scripts/acceptance_private_release.mjs",
    planSteps: "P6.2 steps 12, 14",
    observed: "signed private archive 설치, tamper·wrong-key·min-version·revoked 거부, private update, 실패 update 보존, rollback, uninstall 범위",
  },
  {
    name: "delivery state machine",
    script: "scripts/acceptance_delivery_consistency.mjs",
    planSteps: "P6.2 steps 9-10 보강",
    observed: "중복 없는 1회 수신, retry 백오프·동일 envelope 재사용, cancel 시맨틱, 첨부 경계, 차단 연락처 게이트",
  },
];

const results = [];
for (const phase of phases) {
  const { code, output } = await runStep(phase.name, phase.script);
  if (code !== 0) {
    fail(`${phase.name} failed (${code})\n${output}`);
  }
  results.push({ ...phase, code, output });
  console.log(`representative flow: ${phase.name} passed`);
}

// Redaction gate: no secret material may appear in any captured output.
for (const result of results) {
  const lower = result.output.toLowerCase();
  for (const token of forbidden) {
    if (lower.includes(token.toLowerCase())) fail(`${result.name} output leaked forbidden token: ${token}`);
  }
}

const archiveMatch = results
  .find((result) => result.name === "private release install/update/rollback")
  ?.output.match(/archive sha256: ([0-9a-f]{64})/);
if (!archiveMatch) fail("private release did not report the verified archive sha256");
const archiveSha256 = archiveMatch[1];

let platform;
let osVersion;
let browserVersion;
let nodeVersion;
if (process.platform !== "darwin" || process.arch !== "arm64") {
  fail(`representative flow evidence is scoped to macOS arm64 (found ${process.platform}/${process.arch})`);
}
platform = "macOS arm64";
try {
  osVersion = execFileSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).trim();
} catch {
  osVersion = "unknown";
}
try {
  browserVersion = execFileSync(
    "/usr/bin/defaults",
    ["read", "/Applications/Google Chrome.app/Contents/Info.plist", "CFBundleShortVersionString"],
    { encoding: "utf8" },
  ).trim();
} catch {
  fail("exact Chromium (Google Chrome) version could not be read from /Applications/Google Chrome.app");
}
nodeVersion = process.version;
const sourceRevision = gitHead();
if (!/^[0-9a-f]{40,64}$/.test(sourceRevision)) fail(`invalid source revision: ${sourceRevision}`);

const recordedAt = new Date().toISOString();
const commands = phases.map((phase) => `${process.execPath} ${phase.script}`);
const installedRuntimeSteps = [
  "signed private archive 생성과 서명·manifest·trust gate 통과",
  "Node 미설치 환경에서 no-Node 설치 contract 준수",
  "private archive 설치와 권한(0700/0600) 강제",
  "설치된 daemon·relay 부팅과 doctor 확인",
  "tamper·wrong-key·min-version·revoked 거부",
  "relay production 게이트와 암호화 백업·복구",
  "private update·실패 update 보존·rollback·uninstall 범위",
];
const browserUiSteps = [
  "daemon bootstrap(init + serve)와 loopback bridge 교환",
  "profile A/B 생성과 relay trust 설정",
  "invite 생성·소비와 일회성 검증",
  "safety number 비교·승인",
  "텍스트·첨부파일 양방향 전송",
  "relay 중단 큐와 daemon·relay 재시작 후 sync/retry",
  "device revoke 차단과 recovery export/import",
  "lock/wipe 후 bridge API 차단",
];
const baseEvidence = {
  format: "another-dimension-support-evidence",
  version: 1,
  status: "verified-local",
  sourceRevision,
  archiveSha256,
  recordedAt,
  host: { platform },
  runtime: "Rust daemon binary + bundled Node.js 20+ relay runtime",
  scope: null,
  observations: { initializationErrorShown: false },
  redaction: {
    passed: true,
    note: "captured acceptance output was scanned; generated init secrets, invite capabilities, relay bearer tokens, and private key material are not recorded",
  },
  flow: {
    commands,
    phases: results.map((result) => ({
      name: result.name,
      planSteps: result.planSteps,
      observed: result.observed,
      exitCode: result.code,
    })),
    host: {
      platform,
      osVersion,
      browserVersion,
      nodeVersion,
      browser: "Google Chrome (Chromium)",
    },
    hostname: "omitted (local evidence)",
  },
};

const evidenceFiles = [
  {
    id: "macos-arm64-node20-local-gate",
    surface: "installed-runtime",
    platform: "macOS arm64",
    scope: "scoped local evidence on this macOS arm64 host: signed private archive install, daemon/relay boot, tamper/wrong-key/min-version/revoked rejection, relay backup/restore, private update and rollback; not a public or high-risk support claim",
    steps: installedRuntimeSteps,
    file: "macos-arm64-node20-local-gate.json",
  },
  {
    id: "macos-arm64-chromium-production-ui",
    surface: "browser-ui",
    platform: "macOS arm64 Chromium",
    scope: "scoped local evidence on this macOS arm64 Chromium host: daemon bootstrap, profile, invite, safety verification, messaging, restart, recovery and lock journeys against the recorded release archive and exact Chromium version; not a public or high-risk support claim",
    steps: browserUiSteps,
    file: "macos-arm64-chromium-production-ui.json",
  },
];

await (await import("node:fs/promises")).mkdir(evidenceDir, { recursive: true });
for (const record of evidenceFiles) {
  const evidence = {
    ...baseEvidence,
    host: { ...baseEvidence.host, platform: record.platform, ...(record.surface === "browser-ui" ? { browserVersion } : {}) },
    scope: record.scope,
    observations: { ...baseEvidence.observations, steps: record.steps },
  };
  const serialized = JSON.stringify(evidence);
  for (const token of forbidden) {
    if (serialized.toLowerCase().includes(token.toLowerCase())) fail(`evidence for ${record.id} contains forbidden token: ${token}`);
  }
  await writeFile(join(evidenceDir, record.file), `${serialized}\n`, { mode: 0o600 });
  console.log(`representative flow: wrote reference/evidence/${record.file}`);
}

// Promote the matching matrix entries to verified-local.
const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
for (const record of evidenceFiles) {
  const entry = matrix.entries.find((candidate) => candidate.id === record.id);
  if (!entry) fail(`matrix entry not found: ${record.id}`);
  entry.status = "verified-local";
  entry.evidence = `reference/evidence/${record.file}`;
  entry.scope = record.scope;
}
await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, { mode: 0o600 });
console.log("representative flow: reference/SUPPORT_MATRIX.json promoted to verified-local");

// Self-check against the standalone matrix gate.
const gate = await runStep("support matrix self-check", "scripts/verify_support_matrix.mjs");
if (gate.code !== 0) fail(`support matrix self-check failed:\n${gate.output}`);
console.log("representative acceptance flow passed: P6.2 flow -> redacted P6.4 evidence -> verified-local support matrix");

#!/usr/bin/env node
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const binary = resolve(process.env.AD_DAEMON_BINARY || join(root, ".build-cache/cargo-target/debug/another-dimension-daemon"));
const limits = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(join(root, "reference/RESOURCE_LIMITS.json"), "utf8"))).acceptanceBudgets;
async function runInit(dataDir) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(binary, ["init", "--display-name", "Runtime", "--data-dir", dataDir], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code !== 0) return rejectRun(new Error(`init failed (${code}): ${stderr}`));
      const passphrase = stdout.match(/^passphrase: ([0-9a-f]{64})$/m)?.[1];
      if (!passphrase) return rejectRun(new Error(`init did not return a generated passphrase: ${stdout}`));
      resolveRun(passphrase);
    });
  });
}

function processSample(pid) {
  const result = spawnSync("ps", ["-o", "time=", "-o", "rss=", "-p", String(pid)], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const [time, rss] = result.stdout.trim().split(/\s+/);
  const parts = time?.split(":").map(Number) || [];
  const cpuSeconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  const residentKilobytes = Number(rss);
  return Number.isFinite(cpuSeconds) && Number.isFinite(residentKilobytes) ? { cpuSeconds, rssMegabytes: residentKilobytes / 1024 } : null;
}

async function sample(pid, count = 8) {
  const samples = [];
  let previous;
  let previousAt = performance.now();
  for (let index = 0; index < count; index += 1) {
    const current = processSample(pid);
    if (current) {
      const now = performance.now();
      if (previous) samples.push({ cpu: Math.max(0, ((current.cpuSeconds - previous.cpuSeconds) / ((now - previousAt) / 1000)) * 100), rssMegabytes: current.rssMegabytes });
      previous = current;
      previousAt = now;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 125));
  }
  assert.ok(samples.length > 0, "daemon process could not be sampled with ps");
  return {
    maxCpuPercent: Math.max(...samples.map((item) => item.cpu)),
    maxRssMegabytes: Math.max(...samples.map((item) => item.rssMegabytes)),
  };
}

const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-runtime-budget-"));
const port = 19300 + (process.pid % 200);
let daemon;
const startedAt = performance.now();
try {
  await access(binary, constants.X_OK);
  await access(join(root, "apps/web/dist/index.html"), constants.F_OK);
  const passphrase = await runInit(dataDir);
  daemon = spawn(binary, [
    "serve", "--data-dir", dataDir, "--port", String(port),
    "--relay-origin", `http://127.0.0.1:${port + 1000}`,
    "--inbox-url", `http://127.0.0.1:${port + 1000}/api/v1/inbox/runtime-capability`,
    "--ui-dir", join(root, "apps/web/dist"),
  ], { cwd: root, stdio: ["pipe", "ignore", "pipe"] });
  daemon.stdin.end(`${passphrase}\n`);
  let stderr = "";
  const ready = new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error(`daemon startup timeout: ${stderr}`)), 8000);
    daemon.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!/open once: http:\/\//.test(stderr)) return;
      clearTimeout(timer);
      resolveReady();
    });
    daemon.once("exit", (code, signal) => {
      if (code !== null || signal !== null) rejectReady(new Error(`daemon exited before ready: ${code}/${signal}\n${stderr}`));
    });
  });
  await ready;
  const startupSeconds = (performance.now() - startedAt) / 1000;
  const idle = await sample(daemon.pid);
  for (let index = 0; index < 12; index += 1) {
    await fetch(`http://127.0.0.1:${port}/`).catch(() => {});
  }
  const active = await sample(daemon.pid);
  const result = { startupSeconds, idle, active };
  assert.ok(startupSeconds <= limits.startupSeconds, `startup exceeded ${limits.startupSeconds}s: ${startupSeconds.toFixed(2)}s`);
  assert.ok(idle.maxCpuPercent <= limits.idleCpuPercent, `idle CPU exceeded ${limits.idleCpuPercent}%: ${idle.maxCpuPercent.toFixed(2)}%`);
  assert.ok(active.maxCpuPercent <= limits.activeCpuPercent, `active CPU exceeded ${limits.activeCpuPercent}%: ${active.maxCpuPercent.toFixed(2)}%`);
  assert.ok(Math.max(idle.maxRssMegabytes, active.maxRssMegabytes) <= limits.rssMegabytes, `RSS exceeded ${limits.rssMegabytes}MiB`);
  console.log(`runtime budget acceptance passed: startup=${startupSeconds.toFixed(2)}s idle_cpu<=${idle.maxCpuPercent.toFixed(2)}% active_cpu<=${active.maxCpuPercent.toFixed(2)}% rss<=${Math.max(idle.maxRssMegabytes, active.maxRssMegabytes).toFixed(1)}MiB`);
} finally {
  if (daemon?.exitCode === null) daemon.kill("SIGTERM");
  await rm(dataDir, { recursive: true, force: true });
}

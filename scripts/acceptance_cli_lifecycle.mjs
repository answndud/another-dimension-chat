#!/usr/bin/env node
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const binary = resolve(process.env.AD_DAEMON_BINARY || join(root, ".build-cache/cargo-target/debug/another-dimension-daemon"));

async function command(args, input = "") {
  return await new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(binary, args, { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", rejectCommand);
    child.once("exit", (code) => {
      const output = `${stdout}${stderr}`;
      if (code === 0) resolveCommand(output);
      else {
        const error = new Error(`command failed (${code}): ${output}`);
        error.stdout = stdout;
        error.stderr = stderr;
        rejectCommand(error);
      }
    });
    child.stdin.end(input);
  });
}

function startDaemon(dataDir, port, passphrase) {
  const child = spawn(binary, [
    "serve", "--data-dir", dataDir, "--port", String(port),
    "--relay-origin", `http://127.0.0.1:${port + 1000}`,
    "--inbox-url", `http://127.0.0.1:${port + 1000}/api/v1/inbox/acceptance-capability`,
    "--ui-dir", join(root, "apps/web/dist"),
  ], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(`${passphrase}\n`);
  let stderr = "";
  return new Promise((resolveStart, rejectStart) => {
    const timer = setTimeout(() => rejectStart(new Error(`daemon did not start: ${stderr}`)), 8000);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!/open once: http:\/\//.test(stderr)) return;
      clearTimeout(timer);
      resolveStart({ child, getStderr: () => stderr });
    });
    child.once("exit", (code, signal) => {
      if (code !== null || signal !== null) {
        clearTimeout(timer);
        rejectStart(new Error(`daemon exited before ready: code=${code} signal=${signal}\n${stderr}`));
      }
    });
  });
}

async function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolveExit) => child.once("exit", resolveExit));
}

const dataDir = await mkdtemp(join(tmpdir(), "another-dimension-cli-lifecycle-"));
let daemon;
let crashed;
try {
  await access(binary, constants.X_OK);
  await access(join(root, "apps/web/dist/index.html"), constants.F_OK);
  const initialized = await command(["init", "--display-name", "Lifecycle", "--data-dir", dataDir]);
  const passphrase = initialized.match(/^passphrase: ([0-9a-f]{64})$/m)?.[1];
  assert.match(passphrase || "", /^[0-9a-f]{64}$/);

  daemon = await startDaemon(dataDir, 19120, passphrase);
  const running = await command(["status", "--data-dir", dataDir]);
  assert.match(running, /daemon status: running/);

  const duplicate = await command(["serve", "--data-dir", dataDir, "--port", "19121", "--relay-origin", "http:\/\/127.0.0.1:20121", "--inbox-url", "http:\/\/127.0.0.1:20121\/api\/v1\/inbox\/duplicate", "--ui-dir", join(root, "apps/web/dist")], `${passphrase}\n`).catch((error) => `${error.stdout || ""}${error.stderr || ""}`);
  assert.match(duplicate, /already running with PID/);

  await command(["stop", "--data-dir", dataDir]);
  await waitForExit(daemon.child);
  daemon = undefined;
  const stopped = await command(["status", "--data-dir", dataDir]);
  assert.match(stopped, /daemon status: stopped/);

  crashed = await startDaemon(dataDir, 19122, passphrase);
  crashed.child.kill("SIGKILL");
  await waitForExit(crashed.child);
  crashed = undefined;
  const recovered = await startDaemon(dataDir, 19123, passphrase);
  await command(["stop", "--data-dir", dataDir]);
  await waitForExit(recovered.child);

  const foreignPid = process.pid;
  await writeFile(join(dataDir, "daemon.lock"), `pid=${foreignPid}\n`);
  const foreign = await command(["status", "--data-dir", dataDir]);
  assert.match(foreign, /daemon status: stale lock/);
  await rm(join(dataDir, "daemon.lock"));
  console.log("CLI lifecycle acceptance passed: duplicate start, graceful stop, crash stale-lock recovery, and foreign PID refusal");
} finally {
  if (daemon?.child.exitCode === null) daemon.child.kill("SIGTERM");
  if (crashed?.child.exitCode === null) crashed.child.kill("SIGTERM");
  await rm(dataDir, { recursive: true, force: true });
}

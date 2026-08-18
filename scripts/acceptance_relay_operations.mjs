#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createLocalServer } from "../apps/server/server.mjs";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const backupScript = join(projectRoot, "scripts/relay_backup.mjs");
const PASS = "relay-operations-acceptance-passphrase";

function call(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => {
        let parsed = {};
        try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.end(JSON.stringify(body)); else req.end();
  });
}

function runBackup(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [backupScript, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(`${PASS}\n`);
  });
}

const root = await mkdtemp(join(tmpdir(), "another-dimension-relay-ops-"));
const dataA = join(root, "relay-a");
const restoredDir = join(root, "relay-restored");
const keyDir = join(root, "keys");
const keyFile = join(keyDir, "receipt-key.pem");

try {
  // --- production mode gate -------------------------------------------------
  await assert.rejects(
    () => createLocalServer({ port: 0, dataDir: join(root, "prod-rejected"), production: true }),
    /Production relay requires a configured relay receipt signing key/,
    "production relay must refuse a generated-development receipt key",
  );
  assert.equal(existsSync(join(root, "prod-rejected", "relay-receipt-signing-key.pem")), false, "rejected production start must not leave a generated key behind");

  await mkdir(keyDir, { recursive: true, mode: 0o700 });
  await writeFile(keyFile, generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const productionRuntime = await createLocalServer({
    port: 0,
    dataDir: join(root, "prod-configured"),
    distDir: join(root, "missing-dist"),
    relayReceiptSigningKeyFile: keyFile,
    production: true,
  });
  assert.equal(productionRuntime.relayReceiptKeySource, "external-configured");
  await productionRuntime.server.close();

  // --- start a relay and queue an envelope -----------------------------------
  const relay = await createLocalServer({ port: 0, dataDir: dataA, distDir: join(root, "missing-a") });
  await new Promise((resolve) => relay.server.listen(0, "127.0.0.1", resolve));
  const port = relay.server.address().port;
  assert.equal(relay.relayReceiptKeySource, "generated-development", "unconfigured relay reports generated-development");
  const local = { "x-ad-local-access": relay.localAccessCapability };
  const inboxPath = `/api/v1/inbox/${relay.inboxCapability}`;
  const envelope = `ADENV1.${Buffer.from("opaque-relay-ops-envelope").toString("base64url")}`;

  const posted = await call(port, "POST", inboxPath, { envelope });
  assert.equal(posted.status, 202, JSON.stringify(posted.body));
  const itemId = posted.body.id;
  const readBack = await call(port, "GET", inboxPath, undefined, local);
  assert.equal(readBack.status, 200, JSON.stringify(readBack.body));
  assert.ok(readBack.body.items.some((item) => item.id === itemId && item.envelope === envelope), "queued envelope must survive read-back");

  // --- encrypted backup -------------------------------------------------------
  const backupFile = join(root, "relay-backup.adrelaybackup");
  const backedUp = await runBackup(["backup", "--data-dir", dataA, "--file", backupFile]);
  assert.equal(backedUp.code, 0, backedUp.stderr);
  const backupRaw = await readFile(backupFile, "utf8");
  assert.ok(backupRaw.startsWith("ADRELAYBACKUP1\n"), "backup must use the encrypted container format");
  assert.ok(!backupRaw.includes(envelope) && !backupRaw.includes(relay.inboxCapability), "backup must not contain plaintext envelopes or capabilities");

  // --- stop, restore into a fresh directory, restart --------------------------
  await new Promise((resolveClose) => relay.server.close(resolveClose));
  const restored = await runBackup(["restore", "--data-dir", restoredDir, "--file", backupFile]);
  assert.equal(restored.code, 0, restored.stderr);
  const restoredDataInfo = await stat(restoredDir);
  assert.equal(restoredDataInfo.mode & 0o777, 0o700, "restored data directory must be 0700");
  for (const name of ["relay.sqlite", "inbox-capability", "relay-receipt-signing-key.pem"]) {
    const info = await stat(join(restoredDir, name));
    assert.equal(info.mode & 0o777, 0o600, `restored ${name} must be 0600`);
  }
  const restoredBlobInfo = await stat(join(restoredDir, "blobs"));
  assert.equal(restoredBlobInfo.mode & 0o777, 0o700, "restored blob directory must be 0700");

  const relay2 = await createLocalServer({ port: 0, dataDir: restoredDir, distDir: join(root, "missing-a") });
  await new Promise((resolve) => relay2.server.listen(0, "127.0.0.1", resolve));
  const port2 = relay2.server.address().port;
  const restoredLocal = { "x-ad-local-access": relay2.localAccessCapability };
  const restoredRead = await call(port2, "GET", `/api/v1/inbox/${relay2.inboxCapability}`, undefined, restoredLocal);
  assert.equal(restoredRead.status, 200, JSON.stringify(restoredRead.body));
  assert.ok(restoredRead.body.items.some((item) => item.id === itemId && item.envelope === envelope), "restored relay must retain the queued envelope");
  const postedAfter = await call(port2, "POST", `/api/v1/inbox/${relay2.inboxCapability}`, { envelope: `ADENV1.${Buffer.from("after-restore").toString("base64url")}` });
  assert.equal(postedAfter.status, 202, "restored relay must accept new deliveries");

  // --- fail-closed restore conflicts ------------------------------------------
  const nonEmptyDir = join(root, "non-empty");
  await mkdir(nonEmptyDir, { recursive: true, mode: 0o700 });
  await writeFile(join(nonEmptyDir, "sentinel.txt"), "keep me");
  const conflict = await runBackup(["restore", "--data-dir", nonEmptyDir, "--file", backupFile]);
  assert.notEqual(conflict.code, 0, "restore into a non-empty directory must fail");
  assert.equal(await readFile(join(nonEmptyDir, "sentinel.txt"), "utf8"), "keep me", "failed restore must not touch the target");

  const corruptFile = join(root, "corrupt.adrelaybackup");
  await writeFile(corruptFile, backupRaw.slice(0, -4) + "AAAA");
  const corrupt = await runBackup(["restore", "--data-dir", join(root, "corrupt-target"), "--file", corruptFile]);
  assert.notEqual(corrupt.code, 0, "corrupt backup must fail to restore");
  assert.equal(existsSync(join(root, "corrupt-target")), false, "failed restore must leave no partial state");

  // --- capability rotation -----------------------------------------------------
  const rotated = await call(port2, "POST", "/api/v1/inbox/rotate", undefined, restoredLocal);
  assert.equal(rotated.status, 200, JSON.stringify(rotated.body));
  const oldPath = `/api/v1/inbox/${relay2.inboxCapability}`;
  const oldRead = await call(port2, "GET", oldPath, undefined, restoredLocal);
  assert.equal(oldRead.status, 410, "rotated-away inbox path must return 410");
  const newPath = new URL(rotated.body.inboxUrl).pathname;
  assert.notEqual(newPath, oldPath, "rotation must change the inbox path");
  const newPost = await call(port2, "POST", newPath, { envelope: `ADENV1.${Buffer.from("after-rotation").toString("base64url")}` });
  assert.equal(newPost.status, 202, "new capability path must accept deliveries");

  // --- TTL purge ----------------------------------------------------------------
  const shortTtlRelay = await createLocalServer({ port: 0, dataDir: join(root, "ttl-relay"), distDir: join(root, "missing-ttl"), ttlMs: 150 });
  await new Promise((resolve) => shortTtlRelay.server.listen(0, "127.0.0.1", resolve));
  const ttlPort = shortTtlRelay.server.address().port;
  const ttlLocal = { "x-ad-local-access": shortTtlRelay.localAccessCapability };
  await call(ttlPort, "POST", `/api/v1/inbox/${shortTtlRelay.inboxCapability}`, { envelope: "ADENV1.expiring" });
  await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  const ttlRead = await call(ttlPort, "GET", `/api/v1/inbox/${shortTtlRelay.inboxCapability}`, undefined, ttlLocal);
  assert.equal(ttlRead.status, 200);
  assert.equal(ttlRead.body.items.length, 0, "expired envelopes must be purged");
  await shortTtlRelay.server.close();
  await relay2.server.close();

  console.log("relay operations acceptance passed: production gate -> encrypted backup -> stop/restore/restart -> queue retention -> conflict and corrupt restore fail-closed -> capability rotation -> TTL purge");
} finally {
  await rm(root, { recursive: true, force: true });
}

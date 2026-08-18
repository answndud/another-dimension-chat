#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const relayModulePath = process.env.AD_RELAY_MODULE;
const { createLocalServer } = await import(relayModulePath
  ? pathToFileURL(resolve(relayModulePath)).href
  : "../apps/server/server.mjs");

const daemonBinary = process.env.AD_DAEMON_BINARY || join(projectRoot, ".build-cache/cargo-target/debug/another-dimension-daemon");

function httpCall(origin, method, path, body, headers = {}) {
  const url = new URL(path, origin);
  return new Promise((resolve, reject) => {
    const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requestImpl({
      hostname: url.hostname,
      port: url.port,
      method,
      path: `${url.pathname}${url.search}`,
      ...(url.protocol === "https:" ? { rejectUnauthorized: false } : {}),
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => {
        let parsed = {};
        try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on("error", (error) => reject(new Error(`${method} ${url.href}: ${error.message}`)));
    if (body) req.end(JSON.stringify(body)); else req.end();
  });
}

function waitForDaemon(process, port) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`daemon did not start on ${port}: ${output}`)), 10_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/open once: http:\/\/[^#]+#ad_bootstrap=([^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      process.stderr.off("data", onData);
      resolve(match[1]);
    };
    process.stderr.on("data", onData);
    process.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`daemon exited during startup (${code}): ${output}`));
    });
  });
}

async function initDaemon(dataDir, displayName) {
  const child = spawn(daemonBinary, ["init", "--display-name", displayName, "--data-dir", dataDir], { stdio: ["ignore", "pipe", "pipe"] });
  return await new Promise((resolve, reject) => {
    let output = "";
    let error = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.once("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`daemon init failed: ${error}`)));
  });
}

async function runDaemonCommand(args, input = "") {
  const child = spawn(daemonBinary, args, { stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(input);
  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

async function stopDaemon(daemon) {
  if (!daemon?.child || daemon.child.exitCode !== null) return;
  const exited = new Promise((resolve) => daemon.child.once("exit", resolve));
  daemon.child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error("daemon did not stop")), 5_000)),
  ]);
}

async function startDaemon(dataDir, port, relay, passphrase) {
  const origin = `http://127.0.0.1:${port}`;
  const inboxUrl = relay.inboxUrl.replace(":0", `:${relay.port}`);
  const child = spawn(daemonBinary, [
    "serve", "--data-dir", dataDir, "--port", String(port),
    "--relay-origin", relay.origin,
    "--inbox-url", inboxUrl,
    ...(relay.tlsPin ? ["--relay-tls-pin", relay.tlsPin] : []),
    "--relay-public-key", relay.relayReceiptPublicKey,
    "--relay-public-key-fingerprint", relay.relayReceiptPublicKeyFingerprint,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let daemonError = "";
  child.stderr.on("data", (chunk) => {
    daemonError = `${daemonError}${chunk}`.slice(-100000);
  });
  child.stdin.end(`${passphrase}\n`);
  const bootstrap = await waitForDaemon(child, port);
  let exchange;
  let exchangeError;
  for (let attempt = 0; attempt < 50 && !exchange; attempt += 1) {
    try {
      exchange = await httpCall(origin, "POST", "/local-session/exchange", { token: bootstrap, ui_version: "web-v1" }, { origin, host: `127.0.0.1:${port}`, "x-ad-ui-version": "web-v1" });
    } catch (error) {
      exchangeError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!exchange) throw exchangeError || new Error(`daemon session exchange unavailable on ${port}`);
  assert.equal(exchange.status, 200);
  const cookie = String(exchange.headers["set-cookie"]?.[0] || "").split(";", 1)[0];
  const csrf = exchange.body.csrf_token;
  const api = async (method, path, body) => {
    try {
      return await httpCall(origin, method, path, body, { origin, host: `127.0.0.1:${port}`, cookie, "x-ad-ui-version": "web-v1", ...(method === "POST" ? { "x-ad-csrf": csrf } : {}) });
    } catch (error) {
      throw new Error(`${error.message}\ndaemon stderr:\n${daemonError}`);
    }
  };
  return { child, origin, api, inboxUrl };
}

async function pairDaemons(alice, bob, relay) {
  const created = await alice.api("POST", "/local-api/invites");
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const code = created.body.invite_code;
  const conversationId = created.body.conversation_id;
  const staged = await bob.api("POST", "/local-api/invites/consume", { invite_code: code, relay_origin: relay.origin });
  assert.equal(staged.status, 200, JSON.stringify(staged.body));
  const aliceStaged = await alice.api("POST", "/local-api/pairing/auto-sync", { invite_code: code });
  assert.equal(aliceStaged.status, 200, JSON.stringify(aliceStaged.body));
  assert.equal(staged.body.safety_number, aliceStaged.body.safety_number);
  assert.equal((await bob.api("POST", "/local-api/pairing/verify-safety", { safety_number: staged.body.safety_number })).status, 200);
  assert.equal((await alice.api("POST", "/local-api/pairing/verify-safety", { safety_number: aliceStaged.body.safety_number })).status, 200);
  assert.equal((await bob.api("POST", "/local-api/pairing/approve")).status, 200);
  assert.equal((await alice.api("POST", "/local-api/pairing/approve")).status, 200);
  assert.equal((await bob.api("POST", "/local-api/pairing/complete-session", { invite_code: code })).status, 200);
  return conversationId;
}

const root = await mkdtemp(join(tmpdir(), "another-dimension-delivery-consistency-"));
let relay;
let alice;
let bob;
try {
  const relayPort = 17530;
  relay = await createLocalServer({ port: relayPort, dataDir: join(root, "relay"), distDir: join(root, "missing-relay") });
  await new Promise((resolve) => relay.server.listen(relayPort, "127.0.0.1", resolve));
  relay.origin = relay.publicOrigin;
  relay.tlsPin = undefined;

  const aliceDir = join(root, "alice");
  const bobDir = join(root, "bob");
  const aliceIdentity = await initDaemon(aliceDir, "Alice");
  const bobIdentity = await initDaemon(bobDir, "Bob");
  const alicePassphrase = aliceIdentity.match(/^passphrase: ([0-9a-f]{64})$/m)?.[1];
  const bobPassphrase = bobIdentity.match(/^passphrase: ([0-9a-f]{64})$/m)?.[1];
  assert.match(alicePassphrase || "", /^[0-9a-f]{64}$/);
  assert.match(bobPassphrase || "", /^[0-9a-f]{64}$/);
  alice = await startDaemon(aliceDir, 17520, relay, alicePassphrase);
  bob = await startDaemon(bobDir, 17521, relay, bobPassphrase);
  const conversationId = await pairDaemons(alice, bob, relay);

  const send = async (plaintext) => {
    const encrypted = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext });
    assert.equal(encrypted.status, 200, JSON.stringify(encrypted.body));
    const posted = await alice.api("POST", "/local-api/delivery/post", { inbox_url: bob.inboxUrl, ciphertext: encrypted.body.ciphertext, expires_at: Math.floor(Date.now() / 1000) + 3600 });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    return { ciphertext: encrypted.body.ciphertext, digest: posted.body.digest };
  };
  const syncMessages = async () => {
    const received = await bob.api("POST", "/local-api/delivery/sync", { conversation_id: conversationId, inbox_url: bob.inboxUrl });
    assert.equal(received.status, 200, JSON.stringify(received.body));
    return received.body.messages || [];
  };
  // Count how many times a plaintext was stored in the recipient ledger. A
  // fresh sync first drains any item still sitting in the relay inbox so the
  // count is independent of maintenance-tick timing.
  const countReceived = async (plaintext) => {
    await syncMessages();
    const history = await bob.api("POST", "/local-api/messages/list", { conversation_id: conversationId });
    assert.equal(history.status, 200, JSON.stringify(history.body));
    return history.body.messages.filter((message) => Buffer.from(message.plaintext, "hex").toString() === plaintext).length;
  };

  // --- P4.1 a received message is stored once and never re-delivered
  const first = await send("consistency-one");
  assert.equal(await countReceived("consistency-one"), 1, "message must be stored exactly once after the first sync");
  await syncMessages();
  assert.equal(await countReceived("consistency-one"), 1, "re-sync must not duplicate an already stored message");

  // --- P4.1 outage window: a retry reuses the same ledger envelope (no
  // duplicate), while a cancelled delivery stays cancelled and is not retryable.
  // Cancel is intentionally refused once the relay has accepted an envelope
  // (the recipient may have already fetched it), so both deliveries below are
  // left in the retryable state before the relay recovers.
  const duringOutage = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "consistency-retry" });
  const cancelSend = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "consistency-cancel-me" });
  assert.equal(duringOutage.status, 200, JSON.stringify(duringOutage.body));
  assert.equal(cancelSend.status, 200, JSON.stringify(cancelSend.body));
  await new Promise((resolveClose) => relay.server.close(resolveClose));
  const retryable = await alice.api("POST", "/local-api/delivery/post", { inbox_url: bob.inboxUrl, ciphertext: duringOutage.body.ciphertext, expires_at: Math.floor(Date.now() / 1000) + 3600 });
  assert.equal(retryable.status, 503, JSON.stringify(retryable.body));
  assert.equal(retryable.body.state, "retryable", JSON.stringify(retryable.body));
  const retryDigest = retryable.body.digest;
  const cancellable = await alice.api("POST", "/local-api/delivery/post", { inbox_url: bob.inboxUrl, ciphertext: cancelSend.body.ciphertext, expires_at: Math.floor(Date.now() / 1000) + 3600 });
  assert.equal(cancellable.status, 503, JSON.stringify(cancellable.body));
  assert.equal(cancellable.body.state, "retryable", JSON.stringify(cancellable.body));
  const cancelDigest = cancellable.body.digest;
  relay = await createLocalServer({ port: 17530, dataDir: join(root, "relay"), distDir: join(root, "missing-relay") });
  await new Promise((resolve) => relay.server.listen(17530, "127.0.0.1", resolve));
  relay.origin = relay.publicOrigin;
  relay.tlsPin = undefined;
  const cancelled = await alice.api("POST", "/local-api/delivery/cancel", { digest: cancelDigest });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(cancelled.body.cancelled, true, JSON.stringify(cancelled.body));
  const statusAfterCancel = await alice.api("POST", "/local-api/delivery/status", { digest: cancelDigest });
  assert.equal(statusAfterCancel.status, 200, JSON.stringify(statusAfterCancel.body));
  assert.equal(statusAfterCancel.body.state, "cancelled", JSON.stringify(statusAfterCancel.body));
  const retryAfterCancel = await alice.api("POST", "/local-api/delivery/retry", { inbox_url: bob.inboxUrl, digest: cancelDigest });
  assert.notEqual(retryAfterCancel.status, 202, "a cancelled delivery must not be accepted for retry");
  const tooSoon = await alice.api("POST", "/local-api/delivery/retry", { inbox_url: bob.inboxUrl, digest: retryDigest });
  assert.equal(tooSoon.status, 429, JSON.stringify(tooSoon.body));
  assert.equal(tooSoon.body.error, "delivery_retry_backoff", JSON.stringify(tooSoon.body));
  // First-attempt backoff is 5s; retry after it passes. The maintenance tick
  // runs every 15s, so a manual retry inside the window stays deterministic.
  await new Promise((resolveWait) => setTimeout(resolveWait, 6000));
  const retried = await alice.api("POST", "/local-api/delivery/retry", { inbox_url: bob.inboxUrl, digest: retryDigest });
  assert.equal(retried.status, 202, JSON.stringify(retried.body));
  assert.equal(await countReceived("consistency-retry"), 1, "retried delivery must be stored exactly once");

  // --- P4.2 attachment cancel and size limit
  const oversized = await alice.api("POST", "/local-api/attachment/start", { blob_id: "b".repeat(32), total: 33 * 1024 * 1024, file_name: "too-big.bin", media_type: "application/octet-stream" });
  assert.equal(oversized.status, 400, JSON.stringify(oversized.body));
  assert.equal(oversized.body.error, "invalid_attachment", JSON.stringify(oversized.body));
  const blobId = "c".repeat(32);
  const fullChunk = "00".repeat(64 * 1024); // 64KiB plaintext chunk (2 hex chars per byte)
  assert.equal((await alice.api("POST", "/local-api/attachment/start", { blob_id: blobId, total: 64 * 1024, file_name: "cancel.bin", media_type: "application/octet-stream" })).status, 201);
  assert.equal((await alice.api("POST", "/local-api/attachment/append", { blob_id: blobId, index: 0, plaintext: fullChunk })).status, 202);
  assert.equal((await alice.api("POST", "/local-api/attachment/cancel", { blob_id: blobId })).status, 200);
  const resumed = await alice.api("POST", "/local-api/attachment/start", { blob_id: blobId, total: 64 * 1024, file_name: "cancel.bin", media_type: "application/octet-stream" });
  assert.equal(resumed.status, 201, JSON.stringify(resumed.body));

  // --- P4.3 blocked contact stops send and sync
  const contacts = await alice.api("GET", "/local-api/contacts");
  assert.equal(contacts.status, 200);
  const peerAccountId = contacts.body.contacts[0].account_id;
  assert.equal((await alice.api("POST", "/local-api/contacts/block", { account_id: peerAccountId })).status, 200);
  const blockedSend = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "blocked-message" });
  assert.equal(blockedSend.status, 403, JSON.stringify(blockedSend.body));
  assert.equal(blockedSend.body.error, "contact_blocked", JSON.stringify(blockedSend.body));
  const blockedSync = await alice.api("POST", "/local-api/delivery/sync", { conversation_id: conversationId, inbox_url: alice.inboxUrl });
  assert.equal(blockedSync.status, 403, JSON.stringify(blockedSync.body));
  assert.equal(blockedSync.body.error, "contact_blocked", JSON.stringify(blockedSync.body));
  assert.equal((await alice.api("POST", "/local-api/contacts/unblock", { account_id: peerAccountId })).status, 200);
  assert.equal((await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "unblocked-again" })).status, 200, "send must work again after unblock");

  // --- P4.4 lock gates every subsequent bridge call
  assert.equal((await alice.api("POST", "/local-api/session/lock")).status, 200);
  const lockedStatus = await alice.api("GET", "/local-api/status");
  assert.equal(lockedStatus.status, 403, JSON.stringify(lockedStatus.body));
  const lockedSend = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "after-lock" });
  assert.notEqual(lockedSend.status, 200, "send after lock must be rejected");

  // --- P4.3 a revoked device cannot start identity-bearing operation
  await stopDaemon(alice);
  const aliceDevice = await runDaemonCommand(["device", "list", "--data-dir", aliceDir], `${alicePassphrase}\n`);
  assert.equal(aliceDevice.code, 0, aliceDevice.stderr);
  const deviceId = aliceDevice.stdout.match(/device_id: (\S+)/)?.[1];
  assert.ok(deviceId, aliceDevice.stdout);
  const revoked = await runDaemonCommand(["device", "revoke", "--id", deviceId, "--data-dir", aliceDir], `${alicePassphrase}\n`);
  assert.equal(revoked.code, 0, revoked.stderr);
  let restartRejected;
  try {
    alice = await startDaemon(aliceDir, 17520, relay, alicePassphrase);
  } catch (error) {
    restartRejected = error;
  }
  assert.ok(restartRejected, "serve must refuse to start with a revoked current device");
  assert.match(String(restartRejected), /device is revoked/, String(restartRejected));

  console.log("delivery consistency acceptance passed: duplicate dedup -> cancel not retryable -> attachment cancel and size limit -> blocked contact -> lock gating -> revoked device invite gate");
} finally {
  for (const daemon of [alice, bob]) await stopDaemon(daemon).catch(() => {});
  if (relay?.server) await new Promise((resolve) => relay.server.close(() => resolve())).catch(() => {});
  await rm(root, { recursive: true, force: true });
}

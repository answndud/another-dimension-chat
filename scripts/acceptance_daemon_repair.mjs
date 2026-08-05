#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalServer } from "../apps/server/server.mjs";

const daemonBinary = process.env.AD_DAEMON_BINARY || "target/debug/another-dimension-daemon";
const passphrase = "acceptance-only-passphrase";

function httpCall(origin, method, path, body, headers = {}) {
  const url = new URL(path, origin);
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: url.hostname,
      port: url.port,
      method,
      path: `${url.pathname}${url.search}`,
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
    req.on("error", reject);
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
  const child = spawn(daemonBinary, ["init", "--display-name", displayName, "--data-dir", dataDir], { stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(`${passphrase}\n`);
  return await new Promise((resolve, reject) => {
    let output = "";
    let error = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.once("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`daemon init failed: ${error}`)));
  });
}

async function startDaemon(dataDir, port, relay) {
  const origin = `http://127.0.0.1:${port}`;
  const inboxUrl = relay.inboxUrl.replace(":0", `:${relay.port}`);
  const child = spawn(daemonBinary, [
    "serve", "--data-dir", dataDir, "--port", String(port),
    "--relay-origin", relay.origin,
    "--inbox-url", inboxUrl,
    "--relay-public-key", relay.relayReceiptPublicKey,
    "--relay-public-key-fingerprint", relay.relayReceiptPublicKeyFingerprint,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  child.stdin.end(`${passphrase}\n`);
  const bootstrap = await waitForDaemon(child, port);
  const exchange = await httpCall(origin, "POST", "/local-session/exchange", { token: bootstrap, ui_version: "web-v1" }, { origin, host: `127.0.0.1:${port}`, "x-ad-ui-version": "web-v1" });
  assert.equal(exchange.status, 200);
  const cookie = String(exchange.headers["set-cookie"]?.[0] || "").split(";", 1)[0];
  const csrf = exchange.body.csrf_token;
  const api = async (method, path, body) => httpCall(origin, method, path, body, { origin, host: `127.0.0.1:${port}`, cookie, "x-ad-ui-version": "web-v1", ...(method === "POST" ? { "x-ad-csrf": csrf } : {}) });
  return { child, origin, api, inboxUrl };
}

async function relayApi(relay, method, path, body, headers = {}) {
  return httpCall(relay.origin, method, path, body, headers);
}

async function publicInvite(daemon, relay) {
  const local = await daemon.api("POST", "/local-api/invites");
  assert.equal(local.status, 200, JSON.stringify(local.body));
  const created = await relayApi(relay, "POST", "/api/v1/invite-codes/public", { invite: local.body.signed_invite });
  assert.equal(created.status, 201, `${JSON.stringify(created.body)} payload=${Buffer.from(local.body.signed_invite.split(".")[1], "hex").toString()}`);
  return { code: created.body.code, signedInvite: local.body.signed_invite, relay };
}

async function stageInvite(daemon, invitation) {
  const consumed = await relayApi(invitation.relay, "POST", "/api/v1/invite-codes/consume", { code: invitation.code });
  assert.equal(consumed.status, 200, JSON.stringify(consumed.body));
  const staged = await daemon.api("POST", "/local-api/invites/stage", {
    invite_code: invitation.code,
    signed_invite: consumed.body.invite,
    relay_receipt: consumed.body.receipt,
  });
  assert.equal(staged.status, 200, `${JSON.stringify(staged.body)} payload=${Buffer.from(consumed.body.invite.split(".")[1], "hex").toString()}`);
  return staged.body;
}

const root = await mkdtemp(join(tmpdir(), "another-dimension-daemon-repair-"));
let relayA;
let relayB;
let alice;
let bob;
async function closeRelay(relay) {
  if (!relay?.server) return;
  await new Promise((resolve) => relay.server.close(() => resolve()));
}
try {
  const relayAPort = 17430;
  const relayBPort = 17431;
  relayA = await createLocalServer({ port: relayAPort, dataDir: join(root, "relay-a"), distDir: join(root, "missing-a") });
  relayB = await createLocalServer({ port: relayBPort, dataDir: join(root, "relay-b"), distDir: join(root, "missing-b") });
  await Promise.all([
    new Promise((resolve) => relayA.server.listen(relayAPort, "127.0.0.1", resolve)),
    new Promise((resolve) => relayB.server.listen(relayBPort, "127.0.0.1", resolve)),
  ]);
  relayA.port = relayAPort;
  relayB.port = relayBPort;
  relayA.origin = `http://127.0.0.1:${relayA.port}`;
  relayB.origin = `http://127.0.0.1:${relayB.port}`;
  assert.equal((await relayApi(relayB, "GET", "/api/v1/info", undefined, { "x-ad-local-access": relayB.localAccessCapability })).status, 200);

  const aliceDir = join(root, "alice");
  const bobDir = join(root, "bob");
  const aliceIdentity = await initDaemon(aliceDir, "Alice");
  const bobIdentity = await initDaemon(bobDir, "Bob");
  assert.notEqual(aliceIdentity.match(/account_id: (\S+)/)?.[1], bobIdentity.match(/account_id: (\S+)/)?.[1]);
  alice = await startDaemon(aliceDir, 17420, relayA);
  // v0.1 has one configured relay trust anchor per daemon. Pair both devices
  // through the same relay; the independent relay above proves a second
  // user-owned relay can boot without becoming a central dependency.
  bob = await startDaemon(bobDir, 17421, relayA);

  const aliceInvite = await publicInvite(alice, relayA);
  const bobInvite = await publicInvite(bob, relayA);
  const bobStaged = await stageInvite(bob, aliceInvite);
  const aliceStaged = await stageInvite(alice, bobInvite);
  assert.equal(bobStaged.safety_number, aliceStaged.safety_number);
  assert.equal((await bob.api("POST", "/local-api/pairing/verify-safety", { safety_number: bobStaged.safety_number })).status, 200);
  assert.equal((await alice.api("POST", "/local-api/pairing/verify-safety", { safety_number: aliceStaged.safety_number })).status, 200);
  assert.equal((await bob.api("POST", "/local-api/pairing/approve")).status, 200);
  assert.equal((await alice.api("POST", "/local-api/pairing/approve")).status, 200);

  const conversationId = "acceptance-repair-conversation";
  assert.equal((await alice.api("POST", "/local-api/session/create", { conversation_id: conversationId })).status, 201);
  const bobPackage = await bob.api("POST", "/local-api/session/prepare", { conversation_id: conversationId });
  const welcome = await alice.api("POST", "/local-api/session/add-member", { conversation_id: conversationId, key_package: bobPackage.body.key_package });
  assert.equal((await bob.api("POST", "/local-api/session/join", { conversation_id: conversationId, welcome: welcome.body.welcome })).status, 200, JSON.stringify(welcome.body));
  const ciphertext = await alice.api("POST", "/local-api/session/send", { conversation_id: conversationId, plaintext: "repair-flow" });
  assert.equal(ciphertext.status, 200);
  const posted = await alice.api("POST", "/local-api/delivery/post", { inbox_url: bob.inboxUrl, ciphertext: ciphertext.body.ciphertext, expires_at: Math.floor(Date.now() / 1000) + 3600 });
  assert.equal(posted.status, 202, JSON.stringify(posted.body));
  const received = await bob.api("POST", "/local-api/delivery/sync", { conversation_id: conversationId, inbox_url: bob.inboxUrl });
  assert.equal(received.status, 200);
  assert.equal(Buffer.from(received.body.messages[0].plaintext, "hex").toString(), "repair-flow");

  const oldAliceInbox = alice.inboxUrl;
  const rotation = await relayApi(relayA, "POST", "/api/v1/inbox/rotate", undefined, { "x-ad-local-access": relayA.localAccessCapability });
  assert.equal(rotation.status, 200);
  const oldInboxPath = new URL(oldAliceInbox).pathname;
  const oldRelayRead = await httpCall(relayA.origin, "GET", oldInboxPath, undefined, { "x-ad-relay-capability": oldAliceInbox.split("/").at(-1) });
  assert.equal(oldRelayRead.status, 410, JSON.stringify(oldRelayRead.body));
  const failed = await bob.api("POST", "/local-api/delivery/sync", { conversation_id: conversationId, inbox_url: oldAliceInbox });
  assert.equal(failed.status, 409, JSON.stringify(failed.body));
  assert.equal(failed.body.raw, "relay_capability_expired", JSON.stringify(failed.body));
  const pairing = await bob.api("GET", "/local-api/pairing/status");
  assert.equal(pairing.body.state, "rejected");
  console.log("daemon repair acceptance passed: two daemons -> bidirectional pairing -> OpenMLS message -> relay rotation -> trust revocation");
} finally {
  for (const daemon of [alice, bob]) daemon?.child.kill("SIGTERM");
  for (const relay of [relayA, relayB]) await closeRelay(relay);
  await rm(root, { recursive: true, force: true });
}

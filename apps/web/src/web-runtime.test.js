import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const srcDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const runtime = readFileSync(resolve(srcDir, "web-runtime.js"), "utf8");
const ui = readFileSync(resolve(srcDir, "main.js"), "utf8");
const serviceWorker = readFileSync(resolve(srcDir, "../public/sw.js"), "utf8");
globalThis.__AD_NOISE_WASM_BYTES__ = readFileSync(resolve(srcDir, "generated/ad_crypto_bg.wasm"));

test("web runtime uses browser crypto and IndexedDB rather than preview storage", () => {
  assert.match(runtime, /indexedDB\.open/);
  assert.match(runtime, /crypto\.subtle\.generateKey/);
  assert.match(runtime, /PBKDF2/);
  assert.match(runtime, /AES-GCM/);
  assert.match(runtime, /noise_handshake_init/);
  assert.match(runtime, /noise_initiator_encrypt/);
  assert.match(runtime, /ADWEB2/);
  assert.match(runtime, /ADENVWEB2/);
  assert.match(runtime, /sendEnvelope/);
  assert.match(runtime, /syncInbox/);
  assert.match(runtime, /ECDSA/);
  assert.doesNotMatch(runtime, /deriveBits|HKDF/);
  assert.doesNotMatch(runtime, /localStorage/);
});

test("web UI exposes the complete manual pairing and sealed-envelope flow", () => {
  for (const text of [
    "Create local profile",
    "Unlock existing profile",
    "Share your invite",
    "Pair and verify",
    "Safety material",
    "Encrypt and export envelope",
    "Import and decrypt",
    "Conversation",
  ]) assert.match(ui, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), text === "Safety material" ? "i" : ""));
  assert.doesNotMatch(ui, /browser-preview-tauri/);
  assert.doesNotMatch(ui, /production_onion/);
  assert.match(ui, /Development HTTP endpoint/);
  assert.match(ui, /setInterval[\s\S]*5_000/);
  assert.match(ui, /visibilitychange/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.delete/);
});

class MemoryIndexedDb {
  constructor() { this.stores = new Map(); }
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        objectStoreNames: { contains: (name) => this.stores.has(name) },
        createObjectStore: (name, options = {}) => { this.stores.set(name, { keyPath: options.keyPath, values: new Map() }); },
        transaction: (name) => ({ objectStore: () => this.store(name) }),
        close() {},
      };
      if (!request.result.objectStoreNames.contains("profiles")) request.result.createObjectStore("profiles", { keyPath: "name" });
      if (!request.result.objectStoreNames.contains("messages")) request.result.createObjectStore("messages", { keyPath: "id" });
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }
  store(name) {
    const store = this.stores.get(name);
    return {
      get: (key) => this.result(store.values.get(key)),
      put: (value) => { store.values.set(value[store.keyPath], structuredClone(value)); return this.result(value[store.keyPath]); },
      getAll: () => this.result([...store.values.values()].map((value) => structuredClone(value))),
    };
  }
  result(value) {
    const request = {};
    queueMicrotask(() => { request.result = value; request.onsuccess?.(); });
    return request;
  }
}

function envelopeBody(value) {
  return JSON.parse(Buffer.from(value.slice("ADENVWEB2.".length), "base64url").toString());
}

async function completeManualHandshake(runtime, passphrases) {
  let pending = "";
  for (const name of Object.keys(passphrases)) {
    await runtime.unlockProfile(name, passphrases[name]);
    pending ||= runtime.getPendingEnvelope();
  }
  for (let step = 0; pending && step < 4; step += 1) {
    const recipient = envelopeBody(pending).to;
    await runtime.unlockProfile(recipient, passphrases[recipient]);
    await runtime.importEnvelope(pending);
    pending = runtime.getPendingEnvelope();
  }
  for (const name of Object.keys(passphrases)) {
    await runtime.unlockProfile(name, passphrases[name]);
    assert.equal(runtime.getSessionStatus(), "ready");
    if (runtime.getPendingEnvelope()) await runtime.confirmPendingEnvelopeDelivered();
  }
}

test("two local profiles establish Noise, persist it, and reject tamper and replay", async (context) => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  Object.defineProperty(globalThis, "location", { value: { hash: "#local=test-token" }, configurable: true });
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.location;
  });
  globalThis.fetch = async (url) => String(url) === "/api/v1/info"
    ? { ok: true, json: async () => ({ protocol: 1, inboxUrl: "https://peer.invalid/api/v1/inbox/write-only" }) }
    : { ok: false };
  const runtime = await import(`./web-runtime.js?integration=${Date.now()}`);
  await runtime.ready;

  const alice = await runtime.createProfile("alice", "alice-passphrase");
  const aliceInvite = await runtime.exportInvite();
  const bob = await runtime.createProfile("bob", "bob-passphrase");
  const bobInvite = await runtime.exportInvite();

  await runtime.unlockProfile("alice", "alice-passphrase");
  const alicePeer = await runtime.importInvite(bobInvite);
  assert.match(runtime.safetyPhrase(alice, alicePeer), /sha256-.+compare/);
  await runtime.unlockProfile("bob", "bob-passphrase");
  const bobPeer = await runtime.importInvite(aliceInvite);
  assert.match(runtime.safetyPhrase(bob, bobPeer), /sha256-.+compare/);
  await completeManualHandshake(runtime, { alice: "alice-passphrase", bob: "bob-passphrase" });

  await runtime.unlockProfile("alice", "alice-passphrase");
  const envelope = await runtime.exportEnvelope("hello from alice");
  const tamperedBody = envelopeBody(envelope);
  tamperedBody.payload.ciphertext = `${tamperedBody.payload.ciphertext.slice(0, -1)}A`;
  const tampered = `ADENVWEB2.${Buffer.from(JSON.stringify(tamperedBody)).toString("base64url")}`;

  await runtime.unlockProfile("bob", "bob-passphrase");
  await assert.rejects(() => runtime.importEnvelope(tampered), /signature is invalid/);
  assert.equal(await runtime.importEnvelope(envelope), "hello from alice");
  await assert.rejects(() => runtime.importEnvelope(envelope), /already imported/);
  let deliveryProfile;
  for (const [name, passphrase] of Object.entries({ alice: "alice-passphrase", bob: "bob-passphrase" })) {
    await runtime.unlockProfile(name, passphrase);
    if (!runtime.getPendingEnvelope()) {
      deliveryProfile = name;
      break;
    }
  }
  assert.ok(deliveryProfile, "one peer must have no pending handshake control envelope");
  let failedDelivery;
  try { await runtime.sendEnvelope("failed delivery"); } catch (error) { failedDelivery = error; }
  assert.match(failedDelivery.message, /could not accept/);
  assert.match(failedDelivery.envelope, /^ADENVWEB2\./);

  runtime.lockProfile();
  await runtime.unlockProfile("bob", "bob-passphrase");
  assert.equal(runtime.getSessionStatus(), "ready");
  assert.equal((await runtime.listMessages()).length, 1);
});

test("deep canonical signatures bind nested Noise and server material", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?invite=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("owner", "owner-passphrase");
  const invite = await runtime.exportInvite();
  const decoded = JSON.parse(Buffer.from(invite.slice("ADWEB2.".length), "base64url").toString());
  assert.equal(decoded.server, undefined);
  await runtime.createProfile("peer", "peer-passphrase");
  const forgedNoise = { ...decoded, noisePublic: Buffer.alloc(32, 7).toString("base64url") };
  await assert.rejects(() => runtime.importInvite(`ADWEB2.${Buffer.from(JSON.stringify(forgedNoise)).toString("base64url")}`), /signature/);
});

test("inbox sync drives Noise controls and protects read and ack headers", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  Object.defineProperty(globalThis, "location", { value: { hash: "#local=owner-token" }, configurable: true });
  const calls = [];
  let queue = [];
  let queueSequence = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url) === "/api/v1/info") {
      return { ok: true, json: async () => ({ protocol: 1, inboxUrl: "https://owner.invalid/api/v1/inbox/write-capability" }) };
    }
    if (options.method === "POST" && String(url).endsWith("/ack")) {
      const ids = new Set(JSON.parse(options.body).ids);
      queue = queue.filter((item) => !ids.has(item.id));
      return { ok: true, json: async () => ({ acknowledged: 1 }) };
    }
    if (options.method === "POST") {
      const envelope = JSON.parse(options.body).envelope;
      queue.push({ id: `queue-${queueSequence++}`, envelope });
      return { ok: true, json: async () => ({ accepted: true }) };
    }
    return { ok: true, json: async () => ({ items: [...queue] }) };
  };

  try {
    const runtime = await import(`./web-runtime.js?sync=${Date.now()}`);
    await runtime.ready;
    await runtime.createProfile("sync_alice", "alice-passphrase");
    const aliceInvite = await runtime.exportInvite();
    await runtime.createProfile("sync_bob", "bob-passphrase");
    const bobInvite = await runtime.exportInvite();
    await runtime.unlockProfile("sync_alice", "alice-passphrase");
    await runtime.importInvite(bobInvite);
    await runtime.unlockProfile("sync_bob", "bob-passphrase");
    await runtime.importInvite(aliceInvite);
    for (let step = 0; step < 4; step += 1) {
      const target = queue.length ? envelopeBody(queue[0].envelope).to : null;
      if (!target) break;
      await runtime.unlockProfile(target, target === "sync_alice" ? "alice-passphrase" : "bob-passphrase");
      await runtime.syncInbox();
    }
    await runtime.unlockProfile("sync_alice", "alice-passphrase");
    assert.equal(runtime.getSessionStatus(), "ready");
    const queuedEnvelope = await runtime.exportEnvelope("automatic receive");
    queue.push({ id: "message-id", envelope: queuedEnvelope });
    await runtime.unlockProfile("sync_bob", "bob-passphrase");
    assert.equal(await runtime.syncInbox(), 1);
    const inboxRead = calls.find((call) => call.url.includes("/inbox/") && !call.options.method);
    const inboxAck = calls.find((call) => call.url.endsWith("/ack"));
    assert.equal(inboxRead.options.headers["x-ad-local-access"], "owner-token");
    assert.equal(inboxAck.options.headers["x-ad-local-access"], "owner-token");
    assert.equal((await runtime.listMessages())[0].text, "automatic receive");
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.location;
  }
});

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

test("web runtime uses browser crypto and IndexedDB rather than preview storage", () => {
  assert.match(runtime, /indexedDB\.open/);
  assert.match(runtime, /crypto\.subtle\.generateKey/);
  assert.match(runtime, /PBKDF2/);
  assert.match(runtime, /ECDH/);
  assert.match(runtime, /AES-GCM/);
  assert.match(runtime, /ADWEB1/);
  assert.match(runtime, /ADENVWEB1/);
  assert.match(runtime, /sendEnvelope/);
  assert.match(runtime, /syncInbox/);
  assert.match(runtime, /ECDSA/);
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

test("two local profiles can exchange a real sealed envelope and reject a duplicate", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?integration=${Date.now()}`);
  await runtime.ready;

  const alice = await runtime.createProfile("alice", "alice-passphrase");
  const aliceInvite = await runtime.exportInvite();
  const bob = await runtime.createProfile("bob", "bob-passphrase");
  const bobInvite = await runtime.exportInvite();

  await runtime.unlockProfile("alice", "alice-passphrase");
  const alicePeer = await runtime.importInvite(bobInvite);
  assert.match(runtime.safetyPhrase(alice, alicePeer), /compare this phrase/);
  const envelope = await runtime.exportEnvelope("hello from alice");
  const envelopeBody = JSON.parse(Buffer.from(envelope.slice("ADENVWEB1.".length), "base64url").toString());
  envelopeBody.ciphertext = `${envelopeBody.ciphertext.slice(0, -1)}A`;
  const tampered = `ADENVWEB1.${Buffer.from(JSON.stringify(envelopeBody)).toString("base64url")}`;

  await runtime.unlockProfile("bob", "bob-passphrase");
  const bobPeer = await runtime.importInvite(aliceInvite);
  assert.match(runtime.safetyPhrase(bob, bobPeer), /compare this phrase/);
  await assert.rejects(() => runtime.importEnvelope(tampered), /signature is invalid/);
  assert.equal(await runtime.importEnvelope(envelope), "hello from alice");
  await assert.rejects(() => runtime.importEnvelope(envelope), /already imported/);
  bobPeer.server = { inboxUrl: "https://peer.invalid/api/v1/inbox/test" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });
  let failedDelivery;
  try { await runtime.sendEnvelope("failed delivery"); } catch (error) { failedDelivery = error; }
  assert.match(failedDelivery.message, /could not accept/);
  assert.match(failedDelivery.envelope, /^ADENVWEB1\./);
  globalThis.fetch = originalFetch;
  assert.equal((await runtime.listMessages()).filter((message) => message.direction === "sent").length, 0);

  runtime.lockProfile();
  await runtime.unlockProfile("bob", "bob-passphrase");
  assert.equal((await runtime.listMessages()).length, 1);
  await runtime.createProfile("charlie", "charlie-passphrase");
  await runtime.importInvite(aliceInvite);
  await assert.rejects(() => runtime.importEnvelope(envelope), /identity|replay window/);
});

test("signed invites preserve optional server capability and reject forged endpoints", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?invite=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("owner", "owner-passphrase");
  const invite = await runtime.exportInvite();
  const decoded = JSON.parse(Buffer.from(invite.slice("ADWEB1.".length), "base64url").toString());
  assert.equal(decoded.server, undefined);
  await runtime.createProfile("peer", "peer-passphrase");
  await assert.rejects(() => runtime.importInvite(`ADWEB1.${Buffer.from(JSON.stringify({ ...decoded, server: { inboxUrl: "javascript:alert(1)" } })).toString("base64url")}`), /Server endpoint|signature/);
});

test("inbox sync uses local access for read and ack", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  Object.defineProperty(globalThis, "location", { value: { hash: "#local=owner-token" }, configurable: true });
  const calls = [];
  let queuedEnvelope;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url) === "/api/v1/info") {
      return { ok: true, json: async () => ({ protocol: 1, inboxUrl: "https://owner.invalid/api/v1/inbox/write-capability" }) };
    }
    if (options.method === "POST" && String(url).endsWith("/ack")) {
      return { ok: true, json: async () => ({ acknowledged: 1 }) };
    }
    return { ok: true, json: async () => ({ items: [{ id: "queue-id", envelope: queuedEnvelope }] }) };
  };

  try {
    const runtime = await import(`./web-runtime.js?sync=${Date.now()}`);
    await runtime.ready;
    const alice = await runtime.createProfile("sync_alice", "alice-passphrase");
    const aliceInvite = await runtime.exportInvite();
    await runtime.createProfile("sync_bob", "bob-passphrase");
    const bobInvite = await runtime.exportInvite();
    await runtime.unlockProfile("sync_alice", "alice-passphrase");
    await runtime.importInvite(bobInvite);
    queuedEnvelope = await runtime.exportEnvelope("automatic receive");
    await runtime.unlockProfile("sync_bob", "bob-passphrase");
    await runtime.importInvite(aliceInvite);

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

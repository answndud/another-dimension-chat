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
globalThis.__AD_CRYPTO_WASM_BYTES__ = readFileSync(resolve(srcDir, "generated/ad_crypto_bg.wasm"));

test("web runtime uses browser crypto and IndexedDB rather than preview storage", () => {
  assert.match(runtime, /indexedDB\.open/);
  assert.match(runtime, /crypto\.subtle\.generateKey/);
  assert.match(runtime, /PBKDF2/);
  assert.match(runtime, /argon2id_profile_key/);
  assert.match(runtime, /argon2id-v1/);
  assert.match(runtime, /AES-GCM/);
  assert.match(runtime, /olm_outbound_start/);
  assert.match(runtime, /olm_account_replenish/);
  assert.match(runtime, /prekeys/);
  assert.match(runtime, /olm_session_encrypt/);
  assert.match(runtime, /ADWEB3/);
  assert.match(runtime, /ADENVWEB3/);
  assert.match(runtime, /sendEnvelope/);
  assert.match(runtime, /revokeInvite/);
  assert.match(runtime, /syncInbox/);
  assert.match(runtime, /ECDSA/);
  assert.doesNotMatch(runtime, /deriveBits|HKDF/);
  assert.doesNotMatch(runtime, /noise_handshake|noise_(?:initiator|responder)/);
  assert.doesNotMatch(runtime, /ADWEB2|ADENVWEB2/);
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
      delete: (key) => { store.values.delete(key); return this.result(undefined); },
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
  return JSON.parse(Buffer.from(value.slice("ADENVWEB3.".length), "base64url").toString());
}

function inviteBody(value) {
  return JSON.parse(Buffer.from(value.slice("ADWEB3.".length), "base64url").toString());
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64url");
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
    const profile = await runtime.unlockProfile(name, passphrases[name]);
    assert.equal(runtime.getSessionStatus(), "ready");
    await assert.rejects(() => runtime.exportEnvelope("blocked before safety verification"), /Compare the safety material/);
    await runtime.confirmSafetyVerification(runtime.safetyPhrase(profile.selfInviteBody, profile.peer));
    if (runtime.getPendingEnvelope()) await runtime.confirmPendingEnvelopeDelivered();
  }
  let consumedPrekeyProfile = null;
  for (const name of Object.keys(passphrases)) {
    const profile = await runtime.unlockProfile(name, passphrases[name]);
    if (profile.privateMaterial.prekeys.some((prekey) => prekey.state === "consumed")) consumedPrekeyProfile = profile;
  }
  assert.ok(consumedPrekeyProfile);
  assert.ok(consumedPrekeyProfile.privateMaterial.prekeys.filter((prekey) => prekey.state === "available").length >= 3);
}

test("two local profiles establish an Olm ratchet, persist it, and reject tamper and replay", async (context) => {
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
  const bobInviteBody = inviteBody(bobInvite);
  assert.match(bobInviteBody.inviteId, /^[-0-9a-f]{36}$/i);
  assert.equal(bobInviteBody.expiresAt - bobInviteBody.issuedAt, 24 * 60 * 60 * 1000);
  const expiredInviteBody = { ...bobInviteBody, issuedAt: Date.now() - (25 * 60 * 60 * 1000), expiresAt: Date.now() - 1 };
  const expiredSignature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, bob.ecdsaPrivate, new TextEncoder().encode(canonical(expiredInviteBody)));
  const expiredInvite = `ADWEB3.${Buffer.from(JSON.stringify({ ...expiredInviteBody, signature: bytesToBase64(expiredSignature) })).toString("base64url")}`;

  await runtime.unlockProfile("alice", "alice-passphrase");
  await assert.rejects(() => runtime.importInvite(expiredInvite), /Invite Olm setup material is invalid/);
  const alicePeer = await runtime.importInvite(bobInvite);
  assert.match(runtime.safetyPhrase(alice, alicePeer), /sha256-.+compare/);
  await runtime.unlockProfile("bob", "bob-passphrase");
  const bobPeer = await runtime.importInvite(aliceInvite);
  assert.match(runtime.safetyPhrase(bob, bobPeer), /sha256-.+compare/);
  await completeManualHandshake(runtime, { alice: "alice-passphrase", bob: "bob-passphrase" });

  await runtime.unlockProfile("alice", "alice-passphrase");
  await assert.rejects(() => runtime.importInvite(bobInvite), /already paired/);
  const envelope = await runtime.exportEnvelope("hello from alice");
  assert.doesNotMatch(envelopeBody(envelope).payload.body, /hello from alice/);
  const tamperedBody = envelopeBody(envelope);
  tamperedBody.payload.body = `A${tamperedBody.payload.body.slice(1)}`;
  const tampered = `ADENVWEB3.${Buffer.from(JSON.stringify(tamperedBody)).toString("base64url")}`;

  await runtime.unlockProfile("bob", "bob-passphrase");
  await assert.rejects(() => runtime.importEnvelope(tampered), /signature is invalid/);
  assert.equal(await runtime.importEnvelope(envelope), "hello from alice");
  await assert.rejects(() => runtime.importEnvelope(envelope), /already imported/);
  const replyOne = await runtime.exportEnvelope("ratchet reply one", { record: false });
  const replyTwo = await runtime.exportEnvelope("ratchet reply two", { record: false });
  await runtime.unlockProfile("alice", "alice-passphrase");
  assert.equal(await runtime.importEnvelope(replyTwo), "ratchet reply two");
  assert.equal(await runtime.importEnvelope(replyOne), "ratchet reply one");
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
  assert.match(failedDelivery.envelope, /^ADENVWEB3\./);

  runtime.lockProfile();
  await runtime.unlockProfile("bob", "bob-passphrase");
  assert.equal(runtime.getSessionStatus(), "ready");
  assert.equal((await runtime.listMessages()).length, 1);
});

test("deep canonical signatures bind nested Olm and server material", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?invite=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("owner", "owner-passphrase");
  const invite = await runtime.exportInvite();
  const decoded = JSON.parse(Buffer.from(invite.slice("ADWEB3.".length), "base64url").toString());
  assert.equal(decoded.server, undefined);
  await runtime.revokeInvite();
  const rotatedInvite = await runtime.exportInvite();
  assert.notEqual(inviteBody(rotatedInvite).inviteId, decoded.inviteId);
  await runtime.createProfile("peer", "peer-passphrase");
  const forgedOlm = { ...decoded, olmCurve25519Public: "A".repeat(43) };
  await assert.rejects(() => runtime.importInvite(`ADWEB3.${Buffer.from(JSON.stringify(forgedOlm)).toString("base64url")}`), /signature/);
});

test("profile wipe requires the passphrase and removes the local profile", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?wipe=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("wipe_me", "wipe-me-passphrase");
  await assert.rejects(() => runtime.deleteProfile("wipe_me", "wrong-passphrase"), /Wrong passphrase/);
  await runtime.deleteProfile("wipe_me", "wipe-me-passphrase");
  assert.equal(runtime.listProfiles().includes("wipe_me"), false);
});

test("inbox sync drives Olm controls and protects read and ack headers", async () => {
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
    const syncAlice = await runtime.unlockProfile("sync_alice", "alice-passphrase");
    assert.equal(runtime.getSessionStatus(), "ready");
    await runtime.confirmSafetyVerification(runtime.safetyPhrase(syncAlice.selfInviteBody, syncAlice.peer));
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

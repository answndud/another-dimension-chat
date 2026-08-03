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
  assert.match(runtime, /argon2-worker\.js/);
  assert.match(runtime, /new Worker/);
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
  assert.match(runtime, /peerIdentity/);
  assert.match(runtime, /syncInbox/);
  assert.match(runtime, /ECDSA/);
  assert.doesNotMatch(runtime, /deriveBits|HKDF/);
  assert.doesNotMatch(runtime, /noise_handshake|noise_(?:initiator|responder)/);
  assert.doesNotMatch(runtime, /ADWEB2|ADENVWEB2/);
  assert.doesNotMatch(runtime, /localStorage/);
  assert.match(runtime, /ADBACKUP1/);
  assert.match(runtime, /ADSESSION1/);
  assert.match(runtime, /ADTRANSCRIPT1/);
  assert.match(runtime, /backup\.version/);
  assert.match(runtime, /MAX_BACKUP_BYTES/);
  assert.match(runtime, /rollback/);
  assert.match(runtime, /Remote relay endpoints require HTTPS/);
  assert.match(runtime, /Onion\/Tor endpoints are not supported/);
  assert.match(runtime, /MIN_PASSPHRASE_LENGTH = 12/);
  assert.match(runtime, /BroadcastChannel/);
  assert.match(runtime, /Browser storage is unavailable/);
  assert.match(runtime, /replaceState/);
  assert.match(runtime, /activeSessionEpoch/);
  assert.match(runtime, /stopArgon2Worker/);
});

test("web UI exposes the complete manual pairing and sealed-envelope flow", () => {
  for (const text of [
    "로컬 프로필 만들기",
    "기존 프로필 잠금 해제",
    "초대 공유",
    "초대 확인 후 페어링",
    "안전 문구",
    "암호화 봉투 내보내기",
    "가져와 복호화",
    "대화",
  ]) assert.match(ui, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), text === "Safety material" ? "i" : ""));
  assert.doesNotMatch(ui, /browser-preview-tauri/);
  assert.doesNotMatch(ui, /production_onion/);
  assert.match(ui, /자동 전달을 사용할 수 없습니다/);
  assert.match(ui, /onboardingStep/);
  assert.match(ui, /안전한 시작 순서/);
  assert.match(ui, /원인:/);
  assert.match(ui, /보안 영향:/);
  assert.match(ui, /재시도:/);
  assert.match(ui, /wipe-confirm-form/);
  assert.match(ui, /프로필 삭제 실행/);
  assert.doesNotMatch(ui, /window\.prompt/);
  assert.match(ui, /setInterval[\s\S]*5_000/);
  assert.match(ui, /visibilitychange/);
  assert.match(ui, /Service Worker \$\{serviceWorkerStatus\}/);
  assert.match(ui, /serviceWorkerStatus = "활성"/);
  assert.match(ui, /serviceWorkerStatus = "등록 실패"/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.delete/);
  assert.match(serviceWorker, /another-dimension-web-v6-integrity/);
  assert.match(serviceWorker, /asset-integrity\.json/);
  assert.match(serviceWorker, /verifiedShellResponse/);
  assert.match(serviceWorker, /cache: "no-store"/);
  assert.match(serviceWorker, /fetch\(event\.request\)/);
  assert.doesNotMatch(serviceWorker, /skipWaiting/);
});

class MemoryIndexedDb {
  constructor() { this.stores = new Map(); }
  open() {
    const request = {};
    queueMicrotask(() => {
      if (this.failOpen) { request.error = new Error("Injected IndexedDB open failure."); request.onerror?.(); return; }
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
      put: (value) => {
        if (this.failWrite) {
          const request = {};
          queueMicrotask(() => { request.error = new DOMException("Injected quota exceeded.", "QuotaExceededError"); request.onerror?.(); });
          return request;
        }
        store.values.set(value[store.keyPath], structuredClone(value));
        return this.result(value[store.keyPath]);
      },
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

class MemoryBroadcastChannel {
  static channels = new Set();
  constructor() { this.onmessage = null; MemoryBroadcastChannel.channels.add(this); }
  postMessage(data) { for (const channel of MemoryBroadcastChannel.channels) queueMicrotask(() => channel.onmessage?.({ data })); }
  close() { MemoryBroadcastChannel.channels.delete(this); }
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

function seededPermutation(values, seed) {
  let state = seed >>> 0;
  const output = [...values];
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state;
  };
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swap = next() % (index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
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
    await runtime.confirmSafetyVerification(runtime.safetyPhrase(profile, profile.peer));
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
  const onionInviteBody = { ...bobInviteBody, server: { ...bobInviteBody.server, inboxUrl: "https://peerexample.onion/api/v1/inbox/capability" } };
  const onionSignature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, bob.ecdsaPrivate, new TextEncoder().encode(canonical(onionInviteBody)));
  const onionInvite = `ADWEB3.${Buffer.from(JSON.stringify({ ...onionInviteBody, signature: bytesToBase64(onionSignature) })).toString("base64url")}`;

  await runtime.unlockProfile("alice", "alice-passphrase");
  await assert.rejects(() => runtime.importInvite(expiredInvite), /Invite Olm setup material is invalid/);
  await assert.rejects(() => runtime.importInvite(onionInvite), /Onion\/Tor endpoints are not supported/);
  const alicePeer = await runtime.importInvite(bobInvite);
  assert.match(runtime.safetyPhrase(alice, alicePeer), /sha256-.+compare/);
  await runtime.unlockProfile("bob", "bob-passphrase");
  const bobPeer = await runtime.importInvite(aliceInvite);
  assert.match(runtime.safetyPhrase(bob, bobPeer), /sha256-.+compare/);
  const aliceStoredRecord = globalThis.indexedDB.stores.get("profiles").values.get("alice");
  assert.equal(Object.hasOwn(aliceStoredRecord, "peer"), false);
  assert.equal(Object.hasOwn(aliceStoredRecord, "selfInviteBody"), false);
  assert.doesNotMatch(JSON.stringify(aliceStoredRecord), /peer\.invalid/);
  await completeManualHandshake(runtime, { alice: "alice-passphrase", bob: "bob-passphrase" });

  await runtime.unlockProfile("alice", "alice-passphrase");
  const sessionBackup = await runtime.exportSessionBackup();
  assert.match(sessionBackup, /^ADSESSION1\./);
  await assert.rejects(() => runtime.importSessionBackup(`${sessionBackup}tampered`));

  await runtime.unlockProfile("alice", "alice-passphrase");
  assert.ok(runtime.getIdentityFingerprint().includes('"ecdsaPublic"'));
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
  globalThis.__AD_TEST_FAIL_NEXT_WRITE__ = true;
  await assert.rejects(() => runtime.exportEnvelope("storage failure rollback"), /Injected browser storage write failure/);
  assert.match(await runtime.exportEnvelope("after storage failure"), /^ADENVWEB3\./);
  let failedDelivery;
  try { await runtime.sendEnvelope("failed delivery"); } catch (error) { failedDelivery = error; }
  assert.match(failedDelivery.message, /could not accept/);
  assert.match(failedDelivery.envelope, /^ADENVWEB3\./);

  runtime.lockProfile();
  await runtime.unlockProfile("bob", "bob-passphrase");
  assert.equal(runtime.getSessionStatus(), "ready");
  assert.equal((await runtime.listMessages()).length, 1);
});

test("paired sessions fail closed when the peer endpoint or capability changes", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  const runtime = await import(`./web-runtime.js?endpoint-binding=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("endpoint_owner", "owner-passphrase");
  const ownerInvite = await runtime.exportInvite();
  await runtime.createProfile("endpoint_peer", "peer-passphrase");
  const peerInvite = await runtime.exportInvite();
  await runtime.unlockProfile("endpoint_owner", "owner-passphrase");
  await runtime.importInvite(peerInvite);
  await runtime.unlockProfile("endpoint_peer", "peer-passphrase");
  await runtime.importInvite(ownerInvite);
  for (let step = 0; step < 4; step += 1) {
    const current = runtime.getPendingEnvelope();
    if (!current) break;
    const target = envelopeBody(current).to;
    await runtime.unlockProfile(target, target === "endpoint_owner" ? "owner-passphrase" : "peer-passphrase");
    await runtime.importEnvelope(current);
  }
  await runtime.unlockProfile("endpoint_owner", "owner-passphrase");
  const profile = await runtime.unlockProfile("endpoint_owner", "owner-passphrase");
  profile.peer.server = { inboxUrl: "https://changed.invalid/api/v1/inbox/new-capability", protocol: 1 };
  await assert.rejects(() => runtime.exportEnvelope("must not send after endpoint change"), /endpoint or capability changed/);
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
  const backup = await runtime.exportProfileBackup();
  assert.match(backup, /^ADBACKUP1\./);
  await assert.rejects(() => runtime.importProfileBackup(`${backup.slice(0, -1)}x`));
  const decoded = JSON.parse(Buffer.from(backup.slice("ADBACKUP1.".length), "base64url").toString());
  const reIntegrity = async (value) => {
    const { integrity, ...payload } = value;
    value.integrity = { algorithm: "SHA-256", digest: bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(payload))))) };
    return `ADBACKUP1.${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
  };
  decoded.version = 99;
  const future = await reIntegrity(decoded);
  await assert.rejects(() => runtime.importProfileBackup(future), /integrity|invalid/);
  decoded.version = 1;
  decoded.kdf = { algorithm: "PBKDF2", hash: "SHA-1", iterations: 1, outputBytes: 32 };
  const weak = await reIntegrity(decoded);
  await assert.rejects(() => runtime.importProfileBackup(weak), /integrity|invalid/);
  globalThis.indexedDB.stores.get("messages").values.set("wipe_me:transcript", { id: "wipe_me:transcript", profile: "wipe_me", direction: "received", text: "local transcript", createdAt: Date.now() });
  const transcript = await runtime.exportTranscript();
  assert.match(transcript, /^ADTRANSCRIPT1\./);
  await assert.rejects(() => runtime.deleteProfile("wipe_me", "wrong-passphrase"), /Wrong passphrase/);
  await runtime.deleteProfile("wipe_me", "wipe-me-passphrase");
  assert.equal(runtime.listProfiles().includes("wipe_me"), false);
  assert.equal(await runtime.importProfileBackup(backup), "wipe_me");
  const restored = await runtime.unlockProfile("wipe_me", "wipe-me-passphrase");
  assert.equal(restored.name, "wipe_me");
  assert.equal(restored.privateMaterial.session, null);
  assert.equal((await runtime.importTranscript(transcript)).count, 1);
  assert.equal((await runtime.listMessages())[0].text, "local transcript");
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
    await runtime.confirmSafetyVerification(runtime.safetyPhrase(syncAlice, syncAlice.peer));
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

test("another tab lock discards the active session and storage failure fails closed", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  const database = new MemoryIndexedDb();
  globalThis.indexedDB = database;
  globalThis.BroadcastChannel = MemoryBroadcastChannel;
  Object.defineProperty(globalThis, "location", { value: { hash: "", pathname: "/", search: "" }, configurable: true });
  const first = await import(`./web-runtime.js?coordination-first=${Date.now()}`);
  const second = await import(`./web-runtime.js?coordination-second=${Date.now()}`);
  await Promise.all([first.ready, second.ready]);
  await first.createProfile("coordination", "coordination-passphrase");
  await second.unlockProfile("coordination", "coordination-passphrase");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(() => first.exportProfileBackup(), /Unlock a local profile first/);
  assert.equal(second.getSessionStatus(), "not-paired");
  await first.unlockProfile("coordination", "coordination-passphrase");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(() => second.exportProfileBackup(), /Unlock a local profile first/);
  database.failOpen = true;
  await assert.rejects(() => first.listMessages(), /Browser storage could not be opened/);
  assert.equal(first.getStorageStatus().available, false);
  await assert.rejects(() => first.exportProfileBackup(), /Unlock a local profile first/);
  database.failOpen = false;
  for (const channel of MemoryBroadcastChannel.channels) channel.close();
  delete globalThis.BroadcastChannel;
});

test("quota-style IndexedDB write failures lock the active session", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  const database = new MemoryIndexedDb();
  globalThis.indexedDB = database;
  const runtime = await import(`./web-runtime.js?quota-failure=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("quota", "quota-passphrase");
  await runtime.exportInvite();
  database.failWrite = true;
  await assert.rejects(() => runtime.revokeInvite(), /quota exceeded/i);
  assert.equal(runtime.getStorageStatus().available, false);
  await assert.rejects(() => runtime.exportProfileBackup(), /Unlock a local profile first/);
  database.failWrite = false;
});

test("fixed-seed protocol vectors preserve state-machine invariants", async () => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  globalThis.indexedDB = new MemoryIndexedDb();
  Object.defineProperty(globalThis, "location", { value: { hash: "", pathname: "/", search: "" }, configurable: true });
  const runtime = await import(`./web-runtime.js?property-vectors=${Date.now()}`);
  await runtime.ready;
  await runtime.createProfile("vector_alice", "alice-vector-passphrase");
  const aliceInvite = await runtime.exportInvite();
  await runtime.createProfile("vector_bob", "bob-vector-passphrase");
  const bobInvite = await runtime.exportInvite();
  await runtime.unlockProfile("vector_alice", "alice-vector-passphrase");
  await runtime.importInvite(bobInvite);
  await runtime.unlockProfile("vector_bob", "bob-vector-passphrase");
  await runtime.importInvite(aliceInvite);
  await completeManualHandshake(runtime, { vector_alice: "alice-vector-passphrase", vector_bob: "bob-vector-passphrase" });

  const vectors = [0x01_02_03_04, 0x11_22_33_44, 0x55_66_77_88, 0xdead_beef];
  for (const seed of vectors) {
    await runtime.unlockProfile("vector_alice", "alice-vector-passphrase");
    const envelopes = [];
    for (let index = 0; index < 5; index += 1) envelopes.push(await runtime.exportEnvelope(`vector-${seed}-${index}`, { record: false }));
    const tamperedBody = envelopeBody(envelopes[0]);
    tamperedBody.payload.body = `A${tamperedBody.payload.body.slice(1)}`;
    const tampered = `ADENVWEB3.${Buffer.from(JSON.stringify(tamperedBody)).toString("base64url")}`;
    await runtime.unlockProfile("vector_bob", "bob-vector-passphrase");
    const beforeTamper = await runtime.listMessages();
    await assert.rejects(() => runtime.importEnvelope(tampered), /signature is invalid/);
    assert.equal((await runtime.listMessages()).length, beforeTamper.length, `tamper mutated state for seed ${seed}`);
    const imported = new Set();
    for (const envelope of seededPermutation(envelopes, seed)) {
      assert.equal(await runtime.importEnvelope(envelope), `vector-${seed}-${envelope === envelopes[0] ? 0 : envelope === envelopes[1] ? 1 : envelope === envelopes[2] ? 2 : envelope === envelopes[3] ? 3 : 4}`);
      imported.add(envelope);
    }
    assert.equal(imported.size, envelopes.length);
    const afterImport = await runtime.listMessages();
    for (const envelope of envelopes) await assert.rejects(() => runtime.importEnvelope(envelope), /already imported/);
    assert.equal((await runtime.listMessages()).length, afterImport.length, `duplicate mutated state for seed ${seed}`);
  }

  await runtime.unlockProfile("vector_alice", "alice-vector-passphrase");
  const alice = await runtime.unlockProfile("vector_alice", "alice-vector-passphrase");
  alice.peer.server = { inboxUrl: "https://changed.invalid/api/v1/inbox/new-capability", protocol: 1 };
  await assert.rejects(() => runtime.exportEnvelope("endpoint mutation must stop"), /endpoint or capability changed/);
  assert.equal(runtime.getSessionStatus(), "ready");
  delete globalThis.location;
});

import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const srcDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const runtime = readFileSync(resolve(srcDir, "web-runtime.js"), "utf8");
const ui = readFileSync(resolve(srcDir, "main.js"), "utf8");

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

  await runtime.unlockProfile("bob", "bob-passphrase");
  const bobPeer = await runtime.importInvite(aliceInvite);
  assert.match(runtime.safetyPhrase(bob, bobPeer), /compare this phrase/);
  assert.equal(await runtime.importEnvelope(envelope), "hello from alice");
  await assert.rejects(() => runtime.importEnvelope(envelope), /already imported/);

  runtime.lockProfile();
  await runtime.unlockProfile("bob", "bob-passphrase");
  assert.equal((await runtime.listMessages()).length, 1);
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

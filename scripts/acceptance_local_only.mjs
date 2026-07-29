#!/usr/bin/env node
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createLocalServer } from "../apps/server/server.mjs";

class MemoryIndexedDb {
  constructor() { this.stores = new Map(); }
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        objectStoreNames: { contains: (name) => this.stores.has(name) },
        createObjectStore: (name, options = {}) => this.stores.set(name, { keyPath: options.keyPath, values: new Map() }),
        transaction: (name) => ({ objectStore: () => this.store(name) }),
        close() {},
      };
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

const root = await mkdtemp(join(tmpdir(), "another-dimension-local-acceptance-"));
const serverA = await createLocalServer({ port: 0, dataDir: join(root, "relay-a"), distDir: join(root, "missing-a") });
const serverB = await createLocalServer({ port: 0, dataDir: join(root, "relay-b"), distDir: join(root, "missing-b") });
await Promise.all([
  new Promise((resolve) => serverA.server.listen(0, "127.0.0.1", resolve)),
  new Promise((resolve) => serverB.server.listen(0, "127.0.0.1", resolve)),
]);

const origin = (runtime) => `http://127.0.0.1:${runtime.server.address().port}`;
const inboxOrigins = new Map([
  [new URL(serverA.inboxUrl).pathname, () => origin(serverA)],
  [new URL(serverB.inboxUrl).pathname, () => origin(serverB)],
]);
const nativeFetch = globalThis.fetch.bind(globalThis);
const database = new MemoryIndexedDb();
globalThis.indexedDB = database;
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
globalThis.__AD_CRYPTO_WASM_BYTES__ = await readFile(resolve("apps/web/src/generated/ad_crypto_bg.wasm"));
let currentOrigin = origin(serverA);
globalThis.location = { hash: "", origin: currentOrigin, protocol: "http:" };
globalThis.fetch = (input, options) => {
  const value = typeof input === "string" ? input : input.url;
  const parsed = new URL(value, currentOrigin);
  if (parsed.port === "0") {
    for (const [inboxPath, getOrigin] of inboxOrigins) {
      if (parsed.pathname === inboxPath || parsed.pathname === `${inboxPath}/ack`) {
        parsed.host = new URL(getOrigin()).host;
        break;
      }
    }
  }
  return nativeFetch(parsed.href, options);
};
const runtime = await import(`../apps/web/src/web-runtime.js?local-acceptance=${Date.now()}`);
await runtime.ready;

const profiles = {
  alice: { passphrase: "alice-local-passphrase", relay: serverA },
  bob: { passphrase: "bob-local-passphrase", relay: serverB },
};
function select(name) {
  const profile = profiles[name];
  currentOrigin = origin(profile.relay);
  globalThis.location = {
    hash: `#relay=${encodeURIComponent(currentOrigin)}&local=${profile.relay.localAccessCapability}`,
    origin: currentOrigin,
    protocol: "http:",
  };
}
async function unlock(name) {
  select(name);
  return runtime.unlockProfile(name, profiles[name].passphrase);
}
async function pump(rounds = 6) {
  for (let round = 0; round < rounds; round += 1) {
    let progressed = false;
    for (const name of Object.keys(profiles)) {
      await unlock(name);
      const before = runtime.getSessionStatus();
      const count = await runtime.syncInbox();
      progressed ||= count > 0 || before !== runtime.getSessionStatus();
    }
    if (!progressed && Object.keys(profiles).every((name) => {
      const profile = profiles[name];
      return Boolean(profile.ready);
    })) break;
  }
}

try {
  select("alice");
  const alice = await runtime.createProfile("alice", profiles.alice.passphrase);
  profiles.alice.invite = await runtime.exportInvite();
  await runtime.lockProfile();
  select("bob");
  const bob = await runtime.createProfile("bob", profiles.bob.passphrase);
  profiles.bob.invite = await runtime.exportInvite();

  await unlock("alice");
  await runtime.importInvite(profiles.bob.invite);
  await unlock("bob");
  await runtime.importInvite(profiles.alice.invite);
  await pump();
  for (const name of Object.keys(profiles)) {
    const profile = await unlock(name);
    assert.equal(runtime.getSessionStatus(), "ready", `${name} handshake did not reach ready`);
    await runtime.confirmSafetyVerification(runtime.safetyPhrase(profile.selfInviteBody, profile.peer));
    profiles[name].ready = true;
    if (runtime.getPendingEnvelope()) await runtime.confirmPendingEnvelopeDelivered();
  }

  await unlock("alice");
  const outgoing = await runtime.sendEnvelope("local-only acceptance message");
  assert.match(outgoing, /^ADENVWEB3\./);
  await unlock("bob");
  assert.equal(await runtime.syncInbox(), 1);
  assert.equal((await runtime.listMessages()).at(-1).text, "local-only acceptance message");

  await serverB.server.close();
  const restarted = await createLocalServer({ port: 0, dataDir: join(root, "relay-b"), distDir: join(root, "missing-b") });
  await new Promise((resolve) => restarted.server.listen(0, "127.0.0.1", resolve));
  const health = await nativeFetch(`${origin(restarted)}/api/v1/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, protocol: 1 });
  await restarted.server.close();
  console.log("local-only acceptance passed: two profiles -> two local relays -> handshake -> safety -> HTTP delivery -> ack -> relay restart");
} finally {
  await Promise.allSettled([serverA.server.close(), serverB.server.close()]);
  await rm(root, { recursive: true, force: true });
}

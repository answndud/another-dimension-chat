#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "apps/web/public/sw.js"), "utf8");
const encoder = new TextEncoder();
const bytes = new Map([
  ["/index.html", encoder.encode("<html>shell</html>")],
  ["/manifest.webmanifest", encoder.encode('{"name":"Another Dimension"}')],
]);
const digest = (value) => createHash("sha256").update(value).digest("base64url");
const manifest = {
  format: "another-dimension-asset-integrity",
  version: 1,
  assets: Object.fromEntries([...bytes].map(([path, value]) => [path, { sha256: digest(value), bytes: value.byteLength }])),
};

class MockResponse {
  constructor(body, options = {}) { this.body = body; this.ok = options.ok ?? true; this.type = options.type ?? "basic"; }
  clone() { return new MockResponse(this.body, { ok: this.ok, type: this.type }); }
  async arrayBuffer() { return this.body instanceof Uint8Array ? this.body.slice().buffer : encoder.encode(String(this.body)).buffer; }
  async json() { return this.body; }
}

const cacheData = new Map();
const cacheNames = new Set(["stale-cache"]);
const cache = {
  async put(request, response) { cacheData.set(typeof request === "string" ? request : request.url, response); },
};
const cachesApi = {
  async open(name) { cacheNames.add(name); return cache; },
  async keys() { return [...cacheNames]; },
  async delete(name) { cacheNames.delete(name); return true; },
  async match(request) { return cacheData.get(typeof request === "string" ? request : request.url); },
};
const listeners = new Map();
const fetchCalls = [];
const clients = { claim: async () => { clients.claimed = true; } };
const context = {
  console,
  URL,
  Uint8Array,
  TextEncoder,
  crypto: globalThis.crypto,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  fetch: async (request, options = {}) => {
    const url = typeof request === "string" ? request : request.url;
    fetchCalls.push({ url, options });
    if (url === "/asset-integrity.json") return new MockResponse(manifest);
    if (url === "/api/v1/inbox") return new MockResponse(encoder.encode("api"));
    if (url === "/" || url === "/index.html") return new MockResponse(bytes.get("/index.html"));
    if (url === "/manifest.webmanifest") return new MockResponse(bytes.get("/manifest.webmanifest"));
    return new MockResponse(encoder.encode("asset"));
  },
  caches: cachesApi,
  clients,
  self: {
    location: { origin: "https://local.test" },
    clients,
    addEventListener(type, handler) { listeners.set(type, handler); },
  },
};
vm.runInNewContext(source, context, { filename: "apps/web/public/sw.js" });

const runLifecycle = async (type, event = {}) => {
  const waits = [];
  listeners.get(type)({ ...event, waitUntil(promise) { waits.push(Promise.resolve(promise)); } });
  await Promise.all(waits);
};
const assert = (condition, message) => { if (!condition) throw new Error(`service worker runtime: ${message}`); };

await runLifecycle("install");
assert(cacheData.has("/"), "install did not cache the shell root");
assert(cacheData.has("/index.html"), "install did not cache index.html");
await runLifecycle("activate");
assert(!cacheNames.has("stale-cache"), "activate did not remove stale caches");
assert(clients.claimed === true, "activate did not claim clients");

const navigationWaits = [];
listeners.get("fetch")({
  request: { method: "GET", url: "https://local.test/", mode: "navigate" },
  respondWith(promise) { navigationWaits.push(Promise.resolve(promise)); },
});
await Promise.all(navigationWaits);
assert(fetchCalls.some(({ url, options }) => url === "https://local.test/" && options.cache === "no-store"), "navigation was not revalidated with no-store");

let apiResponded = false;
listeners.get("fetch")({
  request: { method: "GET", url: "https://local.test/api/v1/inbox", mode: "cors" },
  respondWith() { apiResponded = true; },
});
assert(apiResponded === false, "API request entered the static cache handler");
console.log("service worker runtime passed: install, activate, navigation revalidation, stale-cache cleanup, and API bypass");

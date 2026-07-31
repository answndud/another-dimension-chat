const CACHE = "another-dimension-web-v6-integrity";
const INTEGRITY_URL = "/asset-integrity.json";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", INTEGRITY_URL];

async function integrityMap() {
  const response = await fetch(INTEGRITY_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("asset integrity manifest unavailable");
  const manifest = await response.json();
  if (manifest.format !== "another-dimension-asset-integrity" || manifest.version !== 1) throw new Error("asset integrity manifest invalid");
  return manifest.assets || {};
}

async function verifiedResponse(response, path, assets) {
  const expected = assets[path];
  if (!expected || !response.ok || response.type === "opaque") return response;
  const bytes = await response.clone().arrayBuffer();
  const digest = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const expectedDigest = expected.sha256.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  if (digest !== expectedDigest || bytes.byteLength !== expected.bytes) throw new Error("static asset integrity mismatch");
  return response;
}

async function verifiedShellResponse(response, assets) {
  return verifiedResponse(response, "/index.html", assets);
}

self.addEventListener("install", (event) => {
  // Do not take control of existing tabs until the browser completes a normal
  // lifecycle. This prevents a failed update from replacing a working room.
  event.waitUntil(
    integrityMap().then(async (assets) => {
      const cache = await caches.open(CACHE);
      for (const path of APP_SHELL) {
        const response = await fetch(path, { cache: "no-store" });
        await verifiedResponse(response, path === "/" ? "/index.html" : path, assets);
        await cache.put(path, response);
      }
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      integrityMap()
        .then((assets) => fetch(event.request, { cache: "no-store" }).then((response) => verifiedShellResponse(response, assets)).then((response) => ({ response, assets })))
        .then((response) => {
          if (response.response.ok && response.response.type !== "opaque") caches.open(CACHE).then((cache) => cache.put("/", response.response.clone()));
          return response.response;
        })
        .catch(async () => {
          const assets = await integrityMap();
          const cached = await caches.match("/");
          return cached ? verifiedShellResponse(cached, assets) : Response.error();
        }),
    );
    return;
  }
  event.respondWith(
    integrityMap().then((assets) => fetch(event.request).then((response) => verifiedResponse(response, url.pathname, assets)))
      .then((response) => {
        if (response.ok && response.type !== "opaque") caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

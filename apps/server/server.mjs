import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, realpathSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_ENVELOPE_BYTES = 96 * 1024;
const MAX_INBOX_ITEMS = 256;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_POSTS_PER_WINDOW = 30;
const MAX_LOCAL_READS_PER_WINDOW = 120;
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDist = resolve(__dirname, "../web/dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(payload);
}

function securityHeaders({ api = false, hsts = false } = {}) {
  return {
    "cache-control": api ? "no-store" : "no-cache",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    ...(hsts ? { "strict-transport-security": "max-age=31536000" } : {}),
  };
}

function corsHeaders(req, allowedOrigins, options = {}) {
  const headers = securityHeaders(options);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "content-type,x-ad-local-access";
    headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
    headers.vary = "Origin";
  }
  return headers;
}

function parseOrigins(value) {
  if (!value) return [];
  return String(value).split(",").map((origin) => normalizePublicUrl(origin.trim())).filter(Boolean);
}

async function readBody(req, limit = MAX_ENVELOPE_BYTES + 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeFile(distDir, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(distDir, normalize(relative));
  return candidate.startsWith(`${resolve(distDir)}${process.platform === "win32" ? "\\" : "/"}`) ? candidate : null;
}

function capability() {
  return randomBytes(32).toString("base64url");
}

function hasLocalAccess(req, expected) {
  const supplied = req.headers["x-ad-local-access"];
  if (typeof supplied !== "string") return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function capabilityPath(value) {
  return `/api/v1/inbox/${value}`;
}

function storeId(envelope) {
  return createHash("sha256").update(envelope).digest("hex");
}

function normalizePublicUrl(value) {
  if (!value) return "";
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("AD_PUBLIC_URL must be a valid HTTP(S) origin."); }
  if (
    !["http:", "https:"].includes(url.protocol)
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("AD_PUBLIC_URL must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }
  return url.origin;
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host);
}

function urlHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

export async function loadServerConfig(configFile) {
  const absoluteConfigFile = resolve(configFile);
  let parsed;
  try { parsed = JSON.parse(await readFile(absoluteConfigFile, "utf8")); } catch (error) {
    throw new Error(`Could not read server config ${absoluteConfigFile}: ${error.message}`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Server config must be a JSON object.");
  const allowed = new Set(["bindHost", "port", "dataDir", "distDir", "publicUrl", "corsOrigins", "trustProxy", "ttlMs", "tlsKeyFile", "tlsCertFile"]);
  const unknown = Object.keys(parsed).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`Unknown server config field: ${unknown.join(", ")}`);
  const relativePathKeys = ["dataDir", "distDir", "tlsKeyFile", "tlsCertFile"];
  for (const key of relativePathKeys) {
    if (parsed[key]) parsed[key] = resolve(dirname(absoluteConfigFile), String(parsed[key]));
  }
  return parsed;
}

export async function createLocalServer({
  bindHost = process.env.AD_BIND_HOST || "127.0.0.1",
  port = Number(process.env.AD_PORT || 1422),
  dataDir = process.env.AD_SERVER_DATA_DIR || resolve(process.cwd(), ".another-dimension-server"),
  distDir = process.env.AD_WEB_DIST_DIR || defaultDist,
  publicUrl = process.env.AD_PUBLIC_URL || "",
  corsOrigins = parseOrigins(process.env.AD_CORS_ORIGINS || ""),
  trustProxy = process.env.AD_TRUST_PROXY === "1",
  ttlMs = Number(process.env.AD_INBOX_TTL_MS || DEFAULT_TTL_MS),
  tlsKeyFile = process.env.AD_TLS_KEY_FILE || "",
  tlsCertFile = process.env.AD_TLS_CERT_FILE || "",
} = {}) {
  if (Boolean(tlsKeyFile) !== Boolean(tlsCertFile)) throw new Error("AD_TLS_KEY_FILE and AD_TLS_CERT_FILE must be configured together.");
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("AD_PORT must be an integer between 0 and 65535.");
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error("AD_INBOX_TTL_MS must be a positive number.");
  const normalizedPublicUrl = normalizePublicUrl(publicUrl);
  if (typeof trustProxy !== "boolean") throw new Error("AD_TRUST_PROXY must be boolean.");
  const allowedCorsOrigins = new Set([normalizedPublicUrl, ...corsOrigins].filter(Boolean));
  if (["0.0.0.0", "::"].includes(bindHost) && !normalizedPublicUrl) throw new Error("AD_PUBLIC_URL is required with a wildcard AD_BIND_HOST.");
  if (tlsKeyFile && normalizedPublicUrl.startsWith("http://")) throw new Error("AD_PUBLIC_URL must use HTTPS when direct TLS is enabled.");
  await mkdir(dataDir, { recursive: true });
  const capabilityFile = join(dataDir, "inbox-capability");
  const localAccessFile = join(dataDir, "local-access-capability");
  const queueFile = join(dataDir, "inbox.json");
  let inboxCapability;
  try { inboxCapability = (await readFile(capabilityFile, "utf8")).trim(); } catch { inboxCapability = capability(); await writeFile(capabilityFile, `${inboxCapability}\n`, { mode: 0o600 }); }
  let localAccessCapability;
  try { localAccessCapability = (await readFile(localAccessFile, "utf8")).trim(); } catch { localAccessCapability = capability(); await writeFile(localAccessFile, `${localAccessCapability}\n`, { mode: 0o600 }); }
  let inbox;
  try { inbox = JSON.parse(await readFile(queueFile, "utf8")); } catch { inbox = []; }
  const purge = () => {
    const cutoff = Date.now() - ttlMs;
    inbox = Array.isArray(inbox) ? inbox.filter((item) => Number.isSafeInteger(item.receivedAt) && item.receivedAt >= cutoff).slice(-MAX_INBOX_ITEMS) : [];
  };
  purge();

  let persistChain = Promise.resolve();
  const persist = () => {
    purge();
    const snapshot = JSON.stringify(inbox);
    const temporaryQueueFile = `${queueFile}.tmp`;
    const operation = persistChain.then(async () => {
      await writeFile(temporaryQueueFile, snapshot, { mode: 0o600 });
      await rename(temporaryQueueFile, queueFile);
    });
    persistChain = operation.catch(() => {});
    return operation;
  };
  const scheme = tlsKeyFile && tlsCertFile ? "https" : "http";
  const originFor = (address) => normalizedPublicUrl || `${scheme}://${urlHost(address)}:${port}`;
  const inboxUrlFor = (address) => `${originFor(address)}${capabilityPath(inboxCapability)}`;
  const rotateInboxCapability = async () => {
    inboxCapability = capability();
    await writeFile(capabilityFile, `${inboxCapability}\n`, { mode: 0o600 });
    return inboxCapability;
  };
  const requestWindows = new Map();
  const consumeRateLimit = (req, bucket, limit) => {
    const forwardedFor = trustProxy && typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : "";
    const key = `${bucket}:${forwardedFor || req.socket.remoteAddress || "unknown"}`;
    const now = Date.now();
    const timestamps = (requestWindows.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= limit) {
      requestWindows.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    requestWindows.set(key, timestamps);
    return true;
  };

  const handleRequest = async (req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${bindHost}:${port}`}`);
    const isApi = requestUrl.pathname.startsWith("/api/");
    const headers = corsHeaders(req, allowedCorsOrigins, { api: isApi, hsts: Boolean(tlsKeyFile || normalizedPublicUrl.startsWith("https://")) });
    if (isApi && req.headers.origin && !allowedCorsOrigins.has(req.headers.origin)) {
      json(res, 403, { error: "origin_not_allowed" }, headers);
      return;
    }
    if (req.method === "OPTIONS") {
      if (!isApi || !req.headers.origin || allowedCorsOrigins.has(req.headers.origin)) { res.writeHead(204, headers); res.end(); }
      else json(res, 403, { error: "origin_not_allowed" }, headers);
      return;
    }

    if (requestUrl.pathname === "/api/v1/health" && req.method === "GET") {
      json(res, 200, { ok: true, protocol: 1 }, headers);
      return;
    }
    if (requestUrl.pathname === "/api/v1/info" && req.method === "GET") {
      if (!hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      const publicOrigin = originFor(bindHost);
      json(res, 200, {
        protocol: 1,
        inboxUrl: inboxUrlFor(bindHost),
        publicOrigin,
        externalSecure: publicOrigin.startsWith("https://"),
        listenerTls: Boolean(tlsKeyFile && tlsCertFile),
        networkScope: isLoopbackHost(bindHost) ? "loopback" : "non-loopback",
        maxEnvelopeBytes: MAX_ENVELOPE_BYTES,
      }, headers);
      return;
    }

    const inboxPrefix = capabilityPath(inboxCapability);
    if (requestUrl.pathname === "/api/v1/inbox/rotate" && req.method === "POST") {
      if (!hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { rotated: false, error: "local_access_required" }, headers);
        return;
      }
      await rotateInboxCapability();
      json(res, 200, { rotated: true, inboxUrl: inboxUrlFor(bindHost) }, headers);
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "GET") {
      if (!consumeRateLimit(req, "inbox-read", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      purge();
      json(res, 200, { protocol: 1, items: inbox }, headers);
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "POST") {
      if (!consumeRateLimit(req, "inbox-post", MAX_POSTS_PER_WINDOW)) { json(res, 429, { accepted: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        const body = JSON.parse(await readBody(req));
        const envelope = String(body?.envelope || "").trim();
        if (!/^ADENVWEB(?:1|2|3)\./.test(envelope) || Buffer.byteLength(envelope) > MAX_ENVELOPE_BYTES) throw new Error("invalid_envelope");
        const id = storeId(envelope);
        if (!inbox.some((item) => item.id === id)) {
          if (inbox.length >= MAX_INBOX_ITEMS) {
            json(res, 429, { accepted: false, error: "queue_full" }, { ...headers, "retry-after": "60" });
            return;
          }
          inbox.push({ id, envelope, receivedAt: Date.now() });
          inbox = inbox.slice(-MAX_INBOX_ITEMS);
          await persist();
        }
        json(res, 202, { accepted: true, id }, headers);
      } catch (error) {
        json(res, error.message === "request_too_large" ? 413 : 400, { accepted: false, error: error.message }, headers);
      }
      return;
    }
    if (requestUrl.pathname === `${inboxPrefix}/ack` && req.method === "POST") {
      if (!consumeRateLimit(req, "inbox-ack", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { acknowledged: 0, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { acknowledged: 0, error: "local_access_required" }, headers);
        return;
      }
      try {
        const body = JSON.parse(await readBody(req, 32 * 1024));
        if (!Array.isArray(body?.ids) || body.ids.length > MAX_INBOX_ITEMS) throw new Error("too_many_ids");
        const ids = new Set(body.ids.map(String));
        const previousLength = inbox.length;
        inbox = inbox.filter((item) => !ids.has(item.id));
        await persist();
        json(res, 200, { acknowledged: previousLength - inbox.length }, headers);
      } catch (error) { json(res, 400, { acknowledged: 0, error: error.message }, headers); }
      return;
    }

    if (req.method !== "GET") { json(res, 405, { error: "method_not_allowed" }, headers); return; }
    const file = safeFile(distDir, requestUrl.pathname);
    try {
      const target = file && await readFile(file).then(() => file).catch(() => null);
      const fallback = target || safeFile(distDir, "/");
      if (!fallback) { json(res, 500, { error: "web_dist_unavailable" }); return; }
      res.writeHead(200, { ...securityHeaders({ hsts: Boolean(tlsKeyFile || normalizedPublicUrl.startsWith("https://")) }), "content-type": mimeTypes[extname(fallback)] || "application/octet-stream" });
      createReadStream(fallback).pipe(res);
    } catch { json(res, 500, { error: "web_dist_unavailable" }); }
  };

  const server = tlsKeyFile && tlsCertFile
    ? createHttpsServer({ key: await readFile(tlsKeyFile), cert: await readFile(tlsCertFile) }, handleRequest)
    : createServer(handleRequest);

  const localHost = ["0.0.0.0", "::"].includes(bindHost) ? "127.0.0.1" : bindHost;
  const localUiOrigin = tlsKeyFile && normalizedPublicUrl
    ? normalizedPublicUrl
    : `${scheme}://${urlHost(localHost)}:${port}`;
  return {
    server,
    bindHost,
    port,
    inboxCapability,
    inboxUrl: inboxUrlFor(bindHost),
    publicOrigin: originFor(bindHost),
    externalSecure: originFor(bindHost).startsWith("https://"),
    listenerTls: Boolean(tlsKeyFile && tlsCertFile),
    localAccessCapability,
    localUiUrl: `${localUiOrigin}/#local=${localAccessCapability}`,
  };
}

const launchedDirectly = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (launchedDirectly) {
  const launch = async () => {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== "--config")) {
      throw new Error("Usage: node apps/server/server.mjs [--config /path/to/server-config.json]");
    }
    const options = args.length ? await loadServerConfig(args[1]) : {};
    const runtime = await createLocalServer(options);
    runtime.server.listen(runtime.port, runtime.bindHost, () => {
      console.log(`Another Dimension local server listening at ${runtime.listenerTls ? "https" : "http"}://${runtime.bindHost}:${runtime.port}`);
      console.log(`Advertised origin: ${runtime.publicOrigin}`);
      console.log(`Open the private local UI: ${runtime.localUiUrl}`);
      console.log("The local UI URL grants access to inbox settings. Keep it out of logs, screenshots, and support reports.");
      if (!isLoopbackHost(runtime.bindHost)) console.warn("Warning: non-loopback bind exposes this server to the configured network.");
      if (!isLoopbackHost(runtime.bindHost) && !runtime.externalSecure) console.warn("Warning: remote browser Web Crypto requires an HTTPS public URL or reverse proxy.");
      if (runtime.externalSecure && !runtime.listenerTls) console.log(`External HTTPS is expected at ${runtime.publicOrigin}; keep the reverse proxy running.`);
    });
  };
  launch().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

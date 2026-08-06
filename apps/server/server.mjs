import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign, timingSafeEqual, X509Certificate } from "node:crypto";
import { createReadStream, realpathSync } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { consumeInviteCode, createInviteCode, inviteCodeHash, invitePayloadDigest, purgeInviteCodes, validateDaemonInvite } from "./invite-code.mjs";

const MAX_ENVELOPE_BYTES = 96 * 1024;
const MAX_INBOX_ITEMS = 256;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_POSTS_PER_WINDOW = 30;
const MAX_LOCAL_READS_PER_WINDOW = 120;
const CAPABILITY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_INVITE_CODE_RECORDS = 256;
const MAX_INVITE_CODE_BODY_BYTES = 96 * 1024 + 4096;
const MAX_BLOB_BYTES = 32 * 1024 * 1024;
const MAX_BLOB_CHUNK_BYTES = 64 * 1024;
const MAX_BLOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BLOB_STORE_BYTES = 128 * 1024 * 1024;
const MAX_BLOB_RECORDS = 256;
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDist = resolve(__dirname, "../web/dist");

async function loadRelayReceiptKey(dataDir, privateFileWriter, configuredFile = "") {
  const privateFile = configuredFile || join(dataDir, "relay-receipt-signing-key.pem");
  const existing = await readRegularPrivateFile(privateFile);
  if (configuredFile && !existing) {
    throw new Error(`Configured relay receipt signing key does not exist: ${configuredFile}`);
  }
  if (existing) {
    const privateKey = createPrivateKey(existing);
    const publicKey = createPublicKey(privateKey);
    const publicKeyHex = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
    return { privateKey, publicKeyHex, publicKeyFingerprint: createHash("sha256").update(Buffer.from(publicKeyHex, "hex")).digest("hex") };
  }
  const generated = generateKeyPairSync("ed25519");
  await privateFileWriter(privateFile, generated.privateKey.export({ type: "pkcs8", format: "pem" }));
  const publicKeyHex = generated.publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
  return { privateKey: generated.privateKey, publicKeyHex, publicKeyFingerprint: createHash("sha256").update(Buffer.from(publicKeyHex, "hex")).digest("hex") };
}

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
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function securityHeaders({ api = false, hsts = false } = {}) {
  return {
    "cache-control": api ? "no-store" : "no-cache",
    // WebAssembly compilation is required by the audited Rust/WASM crypto boundary.
    // `wasm-unsafe-eval` permits WASM compilation only; it does not enable JavaScript eval.
    "content-security-policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; worker-src 'self';",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "form-action": "'self'",
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

function hasJsonContentType(req) {
  return typeof req.headers["content-type"] === "string"
    && req.headers["content-type"].toLowerCase().startsWith("application/json");
}

function parseOrigins(value) {
  if (!value) return [];
  return String(value).split(",").map((origin) => normalizePublicUrl(origin.trim())).filter(Boolean);
}

async function readBody(req, limit = MAX_ENVELOPE_BYTES + 4096, timeoutMs = 15_000) {
  let timer;
  const read = (async () => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new Error("request_too_large");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  })();
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      req.destroy();
      req.socket.destroy();
      reject(new Error("request_timeout"));
    }, timeoutMs);
  });
  try { return await Promise.race([read, timeout]); } finally { clearTimeout(timer); }
}

async function readBodyBuffer(req, limit, timeoutMs = 15_000) {
  let timer;
  const read = (async () => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new Error("request_too_large");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  })();
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { req.destroy(); req.socket.destroy(); reject(new Error("request_timeout")); }, timeoutMs);
  });
  try { return await Promise.race([read, timeout]); } finally { clearTimeout(timer); }
}

function validBlobId(value) { return /^[A-Za-z0-9_-]{32,128}$/.test(String(value || "")); }

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
  const expectedBytes = Buffer.from(expected.token, "utf8");
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function hasRelayCapability(req, expected) {
  const supplied = req.headers["x-ad-relay-capability"];
  if (typeof supplied !== "string") return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected.token, "utf8");
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

async function ensurePrivateDirectory(dataDir) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const info = await lstat(dataDir);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Server data directory must be a real directory, not a symlink.");
  await chmod(dataDir, 0o700);
}

async function readRegularPrivateFile(file) {
  const info = await lstat(file).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Private server file is not a regular file: ${file}`);
  return readFile(file, "utf8");
}

async function writePrivateFile(file, contents) {
  const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, contents, { mode: 0o600 });
  await rename(temporary, file);
}

function newCapability(scope, now = Date.now()) {
  return { format: "another-dimension-capability", version: 1, token: capability(), scope, issuedAt: now, expiresAt: now + CAPABILITY_TTL_MS };
}

async function loadCapability(file, scope, writeFileFn = writePrivateFile) {
  const raw = await readRegularPrivateFile(file);
  if (!raw) {
    const created = newCapability(scope);
    await writeFileFn(file, `${JSON.stringify(created)}\n`);
    return created;
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = { token: raw.trim(), expiresAt: Date.now() + CAPABILITY_TTL_MS }; }
  if (
    !parsed || typeof parsed.token !== "string" || !CAPABILITY_PATTERN.test(parsed.token)
    || (parsed.format && parsed.format !== "another-dimension-capability")
    || (parsed.version && parsed.version !== 1)
    || (parsed.scope && parsed.scope !== scope)
    || !Number.isSafeInteger(parsed.expiresAt)
    || parsed.expiresAt <= Date.now()
  ) {
    const rotated = newCapability(scope);
    await writeFileFn(file, `${JSON.stringify(rotated)}\n`);
    return rotated;
  }
  const normalized = { format: "another-dimension-capability", version: 1, token: parsed.token, scope, issuedAt: Number.isSafeInteger(parsed.issuedAt) ? parsed.issuedAt : Date.now(), expiresAt: parsed.expiresAt };
  await writeFileFn(file, `${JSON.stringify(normalized)}\n`);
  return normalized;
}

function capabilityValid(record) {
  return record && Number.isSafeInteger(record.expiresAt) && record.expiresAt > Date.now();
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
  if (url.hostname.replace(/\.$/, "").endsWith(".onion")) throw new Error("Onion/Tor public URLs are not supported; high-risk transport is disabled.");
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

function isLoopbackHttpOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && isLoopbackHost(url.hostname);
  } catch { return false; }
}

function validateTlsCertificate(certificatePem, now = Date.now()) {
  let certificate;
  try { certificate = new X509Certificate(certificatePem); } catch { throw new Error("TLS certificate is not a valid X.509 certificate."); }
  const validFrom = Date.parse(certificate.validFrom);
  const validTo = Date.parse(certificate.validTo);
  if (!Number.isFinite(validFrom) || !Number.isFinite(validTo) || now < validFrom || now >= validTo) {
    throw new Error("TLS certificate is expired or not yet valid.");
  }
  return certificate;
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
  const allowed = new Set(["bindHost", "port", "dataDir", "distDir", "serveStatic", "publicUrl", "corsOrigins", "trustProxy", "ttlMs", "tlsKeyFile", "tlsCertFile"]);
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
  serveStatic = process.env.AD_SERVE_UI === "1",
  publicUrl = process.env.AD_PUBLIC_URL || "",
  corsOrigins = parseOrigins(process.env.AD_CORS_ORIGINS || ""),
  trustProxy = process.env.AD_TRUST_PROXY === "1",
  ttlMs = Number(process.env.AD_INBOX_TTL_MS || DEFAULT_TTL_MS),
  tlsKeyFile = process.env.AD_TLS_KEY_FILE || "",
  tlsCertFile = process.env.AD_TLS_CERT_FILE || "",
  requestTimeoutMs = 15_000,
  headersTimeoutMs = 10_000,
  keepAliveTimeoutMs = 5_000,
  privateFileWriter = writePrivateFile,
  relayReceiptSigningKeyFile = process.env.AD_RELAY_RECEIPT_SIGNING_KEY || "",
} = {}) {
  if (Boolean(tlsKeyFile) !== Boolean(tlsCertFile)) throw new Error("AD_TLS_KEY_FILE and AD_TLS_CERT_FILE must be configured together.");
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("AD_PORT must be an integer between 0 and 65535.");
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error("AD_INBOX_TTL_MS must be a positive number.");
  if (![requestTimeoutMs, headersTimeoutMs, keepAliveTimeoutMs].every((value) => Number.isInteger(value) && value > 0)) throw new Error("Server timeout values must be positive integers.");
  const normalizedPublicUrl = normalizePublicUrl(publicUrl);
  if (typeof trustProxy !== "boolean") throw new Error("AD_TRUST_PROXY must be boolean.");
  if (typeof serveStatic !== "boolean") throw new Error("serveStatic must be boolean.");
  if (trustProxy && !normalizedPublicUrl) throw new Error("trustProxy requires an explicitly configured publicUrl.");
  if (trustProxy && !normalizedPublicUrl.startsWith("https://")) throw new Error("trustProxy requires an HTTPS publicUrl.");
  if (!Array.isArray(corsOrigins)) throw new Error("corsOrigins must be an array of HTTP(S) origins.");
  const normalizedCorsOrigins = corsOrigins.map((origin) => normalizePublicUrl(origin));
  if (normalizedCorsOrigins.some((origin) => !origin.startsWith("https://") && !isLoopbackHttpOrigin(origin))) {
    throw new Error("corsOrigins must use HTTPS, except for loopback HTTP origins.");
  }
  const allowedCorsOrigins = new Set([normalizedPublicUrl, ...normalizedCorsOrigins].filter(Boolean));
  if (!isLoopbackHost(bindHost) && !normalizedPublicUrl) throw new Error("AD_PUBLIC_URL is required with a non-loopback AD_BIND_HOST.");
  if (!isLoopbackHost(bindHost) && !normalizedPublicUrl.startsWith("https://")) throw new Error("A non-loopback AD_BIND_HOST requires an HTTPS publicUrl.");
  if (tlsKeyFile && normalizedPublicUrl.startsWith("http://")) throw new Error("AD_PUBLIC_URL must use HTTPS when direct TLS is enabled.");
  if (tlsCertFile) validateTlsCertificate(await readFile(tlsCertFile, "utf8"));
  await ensurePrivateDirectory(dataDir);
  const blobDir = join(dataDir, "blobs");
  await ensurePrivateDirectory(blobDir);
  const purgeBlobs = async () => {
    for (const name of await readdir(blobDir)) {
      if (!name.endsWith(".meta.json")) continue;
      const metaFile = join(blobDir, name);
      try {
        const meta = JSON.parse(await readFile(metaFile, "utf8"));
        if (!Number.isSafeInteger(meta.expiresAt) || meta.expiresAt <= Date.now()) {
          await unlink(metaFile).catch(() => {});
          await unlink(join(blobDir, name.replace(/\.meta\.json$/, ".blob"))).catch(() => {});
        }
      } catch {
        await unlink(metaFile).catch(() => {});
      }
    }
  };
  const blobUsage = async (excludeBlobId = "") => {
    let bytes = 0;
    let records = 0;
    for (const name of await readdir(blobDir)) {
      if (!name.endsWith(".meta.json")) continue;
      const blobId = name.slice(0, -".meta.json".length);
      if (blobId === excludeBlobId) continue;
      try {
        const info = await stat(join(blobDir, `${blobId}.blob`));
        bytes += info.size;
        records += 1;
      } catch { /* metadata without a blob is repaired by the next upload */ }
    }
    return { bytes, records };
  };
  await purgeBlobs();
  const capabilityFile = join(dataDir, "inbox-capability");
  const localAccessFile = join(dataDir, "local-access-capability");
  const localUiUrlFile = join(dataDir, "local-ui-url");
  const queueFile = join(dataDir, "inbox.json");
  const inviteCodeFile = join(dataDir, "invite-codes.json");
  let inboxCapability = await loadCapability(capabilityFile, "inbox-write", privateFileWriter);
  const retiredInboxPrefixes = new Set();
  const relayReceiptKey = await loadRelayReceiptKey(dataDir, privateFileWriter, relayReceiptSigningKeyFile);
  let localAccessCapability = await loadCapability(localAccessFile, "local-control", privateFileWriter);
  let inbox;
  const queueContents = await readRegularPrivateFile(queueFile);
  if (queueContents === null) {
    const temporaryQueue = await readRegularPrivateFile(`${queueFile}.tmp`);
    if (temporaryQueue !== null) {
      try { JSON.parse(temporaryQueue); } catch { throw new Error("Server inbox recovery file is corrupt."); }
      await privateFileWriter(queueFile, temporaryQueue);
      inbox = JSON.parse(temporaryQueue);
    } else inbox = [];
  } else {
    try { inbox = JSON.parse(queueContents); } catch { throw new Error("Server inbox file is corrupt; refusing to discard it."); }
  }
  if (!Array.isArray(inbox)) throw new Error("Server inbox file must contain an array.");
  const inviteCodeContents = await readRegularPrivateFile(inviteCodeFile);
  let inviteCodes;
  if (inviteCodeContents === null) {
    const temporaryInviteCodes = await readRegularPrivateFile(`${inviteCodeFile}.tmp`);
    if (temporaryInviteCodes !== null) {
      try { inviteCodes = JSON.parse(temporaryInviteCodes); } catch { throw new Error("Server invite-code recovery file is corrupt."); }
      await privateFileWriter(inviteCodeFile, temporaryInviteCodes);
    } else inviteCodes = [];
  } else {
    try { inviteCodes = JSON.parse(inviteCodeContents); } catch { throw new Error("Server invite-code file is corrupt; refusing to discard it."); }
  }
  if (!Array.isArray(inviteCodes)) throw new Error("Server invite-code file must contain an array.");
  inviteCodes = purgeInviteCodes(inviteCodes).slice(-MAX_INVITE_CODE_RECORDS);
  const purge = () => {
    const cutoff = Date.now() - ttlMs;
    inbox = Array.isArray(inbox) ? inbox.filter((item) => Number.isSafeInteger(item.receivedAt) && item.receivedAt >= cutoff).slice(-MAX_INBOX_ITEMS) : [];
  };
  purge();

  let persistChain = Promise.resolve();
  const persist = () => {
    purge();
    const snapshot = JSON.stringify(inbox);
    const operation = persistChain.then(async () => {
      await privateFileWriter(queueFile, snapshot);
    });
    persistChain = operation.catch(() => {});
    return operation;
  };
  let invitePersistChain = Promise.resolve();
  const persistInviteCodes = () => {
    const snapshot = JSON.stringify(purgeInviteCodes(inviteCodes).slice(-MAX_INVITE_CODE_RECORDS));
    const operation = invitePersistChain.then(async () => {
      await privateFileWriter(inviteCodeFile, snapshot);
    });
    invitePersistChain = operation.catch(() => {});
    return operation;
  };
  const scheme = tlsKeyFile && tlsCertFile ? "https" : "http";
  const originFor = (address) => normalizedPublicUrl || `${scheme}://${urlHost(address)}:${port}`;
  const inboxUrlFor = (address) => `${originFor(address)}${capabilityPath(inboxCapability.token)}`;
  const rotateInboxCapability = async () => {
    retiredInboxPrefixes.add(capabilityPath(inboxCapability.token));
    inboxCapability = newCapability("inbox-write");
    await privateFileWriter(capabilityFile, `${JSON.stringify(inboxCapability)}\n`);
    return inboxCapability;
  };
  const requestWindows = new Map();
  const consumeRateLimit = (req, bucket, limit) => {
    // Forwarded headers are informational only. Trusting a client-supplied value
    // here would let a direct caller rotate identities and bypass local limits.
    const key = `${bucket}:${req.socket.remoteAddress || "unknown"}`;
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
      if (!consumeRateLimit(req, "local-info", 30)) { json(res, 429, { error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      const publicOrigin = originFor(bindHost);
      json(res, 200, {
        protocol: 1,
        protocolVersions: [1],
        inboxUrl: inboxUrlFor(bindHost),
        publicOrigin,
        externalSecure: publicOrigin.startsWith("https://"),
        listenerTls: Boolean(tlsKeyFile && tlsCertFile),
        serveStatic,
        highRiskAllowed: false,
        highRiskTransport: "disabled",
        supportedTransports: ["loopback", "direct-https-low-risk", "manual-envelope"],
        transportMode: publicOrigin.startsWith("https://") ? "direct-https-low-risk" : "local-or-http-low-risk",
        networkScope: isLoopbackHost(bindHost) ? "loopback" : "non-loopback",
        maxEnvelopeBytes: MAX_ENVELOPE_BYTES,
        maxTextBytes: 64 * 1024,
        maxAttachmentBytes: 32 * 1024 * 1024,
        relayReceiptPublicKey: relayReceiptKey.publicKeyHex,
        relayReceiptPublicKeyFingerprint: relayReceiptKey.publicKeyFingerprint,
        relayReceiptKeyId: relayReceiptKey.publicKeyFingerprint,
        relayReceiptKeySource: relayReceiptSigningKeyFile ? "external-configured" : "generated-development",
      }, headers);
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes" && req.method === "POST") {
      if (!consumeRateLimit(req, "invite-code-create", 5)) { json(res, 429, { created: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { created: false, error: "local_access_required" }, headers);
        return;
      }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_INVITE_CODE_BODY_BYTES, requestTimeoutMs));
        const created = createInviteCode({ invite: body?.invite, expectedRelayOrigin: originFor(bindHost), ttlMs: body?.ttlMs });
        if (inviteCodes.length >= MAX_INVITE_CODE_RECORDS) inviteCodes = purgeInviteCodes(inviteCodes).slice(-MAX_INVITE_CODE_RECORDS + 1);
        inviteCodes.push(created.record);
        try { await persistInviteCodes(); } catch (error) { inviteCodes = inviteCodes.filter((record) => record !== created.record); throw error; }
        // The clear-text code is returned exactly once. It is never persisted or logged.
        json(res, 201, { created: true, code: created.code, expiresAt: created.record.expiresAt, inviteDigest: created.record.inviteDigest }, headers);
      } catch (error) {
        const status = error.message === "request_too_large" ? 413 : error.message === "request_timeout" ? 408 : error.message === "content_type_not_allowed" ? 400 : 400;
        json(res, status, { created: false, error: error.message }, headers);
      }
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes/public" && req.method === "POST") {
      if (!consumeRateLimit(req, "public-invite-code-create", 10)) { json(res, 429, { created: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_INVITE_CODE_BODY_BYTES, requestTimeoutMs));
        validateDaemonInvite(body?.invite, originFor(bindHost));
        const created = createInviteCode({ invite: body.invite, expectedRelayOrigin: originFor(bindHost) });
        if (inviteCodes.length >= MAX_INVITE_CODE_RECORDS) inviteCodes = purgeInviteCodes(inviteCodes).slice(-MAX_INVITE_CODE_RECORDS + 1);
        inviteCodes.push(created.record);
        try { await persistInviteCodes(); } catch (error) { inviteCodes = inviteCodes.filter((record) => record !== created.record); throw error; }
        json(res, 201, { created: true, code: created.code, expiresAt: created.record.expiresAt, inviteDigest: created.record.inviteDigest }, headers);
      } catch (error) {
        const status = error.message === "request_too_large" ? 413 : error.message === "request_timeout" ? 408 : 400;
        json(res, status, { created: false, error: error.message }, headers);
      }
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes/consume" && req.method === "POST") {
      if (!consumeRateLimit(req, "invite-code-consume", 20)) { json(res, 429, { consumed: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, 8 * 1024, requestTimeoutMs));
        const before = inviteCodes.slice();
        const result = consumeInviteCode(inviteCodes, body?.code);
        if (!result.ok) { json(res, 404, { consumed: false, error: result.reason }, headers); return; }
        try { await persistInviteCodes(); } catch (error) { inviteCodes = before; throw error; }
        const receiptBody = `ADRECEIPT1.${relayReceiptKey.publicKeyFingerprint}.${Buffer.from(originFor(bindHost), "utf8").toString("hex")}.${inviteCodeHash(body?.code)}.${invitePayloadDigest(result.record.invite)}.${Math.floor(Date.now() / 1000)}`;
        const receipt = `${receiptBody}.${sign(null, Buffer.from(receiptBody), relayReceiptKey.privateKey).toString("hex")}`;
        json(res, 200, { consumed: true, invite: result.record.invite, inviteDigest: result.record.inviteDigest, receipt }, headers);
      } catch (error) {
        const status = error.message === "request_too_large" ? 413 : error.message === "request_timeout" ? 408 : 400;
        json(res, status, { consumed: false, error: error.message }, headers);
      }
      return;
    }

    const inboxPrefix = capabilityPath(inboxCapability.token);
    if (requestUrl.pathname === "/api/v1/inbox/rotate" && req.method === "POST") {
      if (!consumeRateLimit(req, "local-rotate", 10)) { json(res, 429, { rotated: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { rotated: false, error: "local_access_required" }, headers);
        return;
      }
      await rotateInboxCapability();
      json(res, 200, { rotated: true, inboxUrl: inboxUrlFor(bindHost) }, headers);
      return;
    }
    if (retiredInboxPrefixes.has(requestUrl.pathname.replace(/\/ack$/, ""))) {
      json(res, 410, req.method === "GET" ? { error: "capability_expired" } : { accepted: false, error: "capability_expired" }, headers);
      return;
    }
    const blobMatch = requestUrl.pathname.match(/^\/api\/v1\/blobs\/([A-Za-z0-9_-]{32,128})$/);
    if (blobMatch && ["POST", "GET", "DELETE"].includes(req.method)) {
      if (!capabilityValid(inboxCapability) || !hasRelayCapability(req, inboxCapability)) {
        json(res, 403, { error: "relay_capability_required" }, headers);
        return;
      }
      await purgeBlobs();
      const blobId = blobMatch[1];
      const blobFile = join(blobDir, `${blobId}.blob`);
      const metaFile = join(blobDir, `${blobId}.meta.json`);
      if (req.method === "GET") {
        try {
          const meta = JSON.parse(await readFile(metaFile, "utf8"));
          if (meta.expiresAt <= Date.now()) throw new Error("expired");
          const requestedOffset = Number(req.headers["x-ad-blob-offset"] || 0);
          const requestedLength = Number(req.headers["x-ad-blob-length"] || 0);
          if (![requestedOffset, requestedLength].every(Number.isSafeInteger) || requestedOffset < 0 || requestedLength < 0 || requestedLength > MAX_BLOB_CHUNK_BYTES) throw new Error("invalid_blob_range");
          const handle = await open(blobFile, "r");
          try {
            const size = (await handle.stat()).size;
            if (requestedOffset > size) throw new Error("invalid_blob_range");
            const length = requestedLength ? Math.min(requestedLength, size - requestedOffset) : size;
            if (!requestedLength && length > MAX_BLOB_BYTES) throw new Error("blob_too_large");
            const body = Buffer.alloc(length);
            if (length) await handle.read(body, 0, length, requestedOffset);
            res.writeHead(200, { ...headers, "cache-control": "no-store", "content-type": "application/octet-stream", "content-length": body.length, "x-ad-blob-offset": String(requestedOffset), "x-ad-blob-total": String(size), "x-ad-blob-complete": String(meta.complete) });
            res.end(body);
          } finally { await handle.close(); }
        } catch { json(res, 404, { error: "blob_not_found" }, headers); }
        return;
      }
      if (req.method === "DELETE") {
        await unlink(blobFile).catch(() => {});
        await unlink(metaFile).catch(() => {});
        json(res, 200, { deleted: true }, headers);
        return;
      }
      try {
        const offset = Number(req.headers["x-ad-blob-offset"] || 0);
        const total = Number(req.headers["x-ad-blob-total"] || 0);
        const requestedTtl = Number(req.headers["x-ad-blob-ttl-ms"] || MAX_BLOB_TTL_MS);
        if (![offset, total, requestedTtl].every(Number.isSafeInteger) || offset < 0 || total <= 0 || total > MAX_BLOB_BYTES || offset > total || requestedTtl <= 0) throw new Error("invalid_blob_metadata");
        const body = await readBodyBuffer(req, MAX_BLOB_CHUNK_BYTES, requestTimeoutMs);
        if (offset + body.length > total) throw new Error("blob_chunk_out_of_bounds");
        let meta = null;
        try { meta = JSON.parse(await readFile(metaFile, "utf8")); } catch { /* first chunk */ }
        if (meta && (meta.total !== total || meta.expiresAt <= Date.now())) throw new Error("blob_metadata_mismatch");
        if (!meta) {
          if (offset !== 0) throw new Error("blob_offset_mismatch");
          const usage = await blobUsage(blobId);
          if (usage.records >= MAX_BLOB_RECORDS || usage.bytes + total > MAX_BLOB_STORE_BYTES) throw new Error("blob_quota_exceeded");
          meta = { version: 1, total, received: 0, complete: false, expiresAt: Date.now() + Math.min(requestedTtl, MAX_BLOB_TTL_MS) };
        }
        const handle = await open(blobFile, offset === 0 ? "w" : "r+");
        try {
          const current = (await handle.stat()).size;
          if (current !== offset) throw new Error("blob_offset_mismatch");
          await handle.write(body, 0, body.length, offset);
        } finally { await handle.close(); }
        meta.received = offset + body.length;
        meta.complete = meta.received === meta.total;
        await writeFile(metaFile, `${JSON.stringify(meta)}\n`, { mode: 0o600 });
        json(res, meta.complete ? 201 : 202, { accepted: true, complete: meta.complete, received: meta.received, total: meta.total, expiresAt: meta.expiresAt, blobUrl: `/api/v1/blobs/${blobId}` }, headers);
      } catch (error) {
        const status = ["blob_offset_mismatch", "blob_metadata_mismatch"].includes(error.message) ? 409 : error.message === "request_too_large" ? 413 : error.message === "blob_quota_exceeded" ? 507 : 400;
        json(res, status, { accepted: false, error: error.message }, headers);
      }
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "GET") {
      if (!capabilityValid(inboxCapability)) { json(res, 410, { error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-read", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      const readAuthorized = (capabilityValid(localAccessCapability) && hasLocalAccess(req, localAccessCapability)) || hasRelayCapability(req, inboxCapability);
      if (!readAuthorized) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      purge();
      json(res, 200, { protocol: 1, items: inbox }, headers);
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "POST") {
      if (!capabilityValid(inboxCapability)) { json(res, 410, { accepted: false, error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-post", MAX_POSTS_PER_WINDOW)) { json(res, 429, { accepted: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_ENVELOPE_BYTES + 4096, requestTimeoutMs));
        const envelope = String(body?.envelope || "").trim();
        if (!/^(?:ADENVWEB(?:1|2|3)|ADENV1)\./.test(envelope) || Buffer.byteLength(envelope) > MAX_ENVELOPE_BYTES) throw new Error("invalid_envelope");
        const id = storeId(envelope);
        if (!inbox.some((item) => item.id === id)) {
        if (inbox.length >= MAX_INBOX_ITEMS) {
            json(res, 429, { accepted: false, error: "queue_full" }, { ...headers, "retry-after": "60" });
            return;
        }
        const previousInbox = inbox.slice();
        inbox.push({ id, envelope, receivedAt: Date.now() });
        inbox = inbox.slice(-MAX_INBOX_ITEMS);
        try { await persist(); } catch (error) { inbox = previousInbox; throw error; }
        }
        json(res, 202, { accepted: true, id }, headers);
      } catch (error) {
        json(res, error.message === "request_too_large" ? 413 : error.message === "request_timeout" ? 408 : 400, { accepted: false, error: error.message }, headers);
      }
      return;
    }
    if (requestUrl.pathname === `${inboxPrefix}/ack` && req.method === "POST") {
      if (!capabilityValid(inboxCapability)) { json(res, 410, { acknowledged: 0, error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-ack", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { acknowledged: 0, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      const ackAuthorized = (capabilityValid(localAccessCapability) && hasLocalAccess(req, localAccessCapability)) || hasRelayCapability(req, inboxCapability);
      if (!ackAuthorized) {
        json(res, 403, { acknowledged: 0, error: "local_access_required" }, headers);
        return;
      }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, 32 * 1024, requestTimeoutMs));
        if (!Array.isArray(body?.ids) || body.ids.length > MAX_INBOX_ITEMS) throw new Error("too_many_ids");
        const ids = new Set(body.ids.map(String));
        const previousInbox = inbox;
        const previousLength = inbox.length;
        inbox = inbox.filter((item) => !ids.has(item.id));
        try { await persist(); } catch (error) { inbox = previousInbox; throw error; }
        json(res, 200, { acknowledged: previousLength - inbox.length }, headers);
      } catch (error) { json(res, error.message === "request_timeout" ? 408 : 400, { acknowledged: 0, error: error.message }, headers); }
      return;
    }

    // TM-02: the relay must not become an implicit browser-code distribution boundary.
    if (!serveStatic) { json(res, 404, { error: "relay_only" }, headers); return; }
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

  const serverOptions = {
    requestTimeout: requestTimeoutMs,
    headersTimeout: headersTimeoutMs,
    keepAliveTimeout: keepAliveTimeoutMs,
    maxHeaderSize: 16 * 1024,
  };
  const server = tlsKeyFile && tlsCertFile
    ? createHttpsServer({ ...serverOptions, key: await readFile(tlsKeyFile), cert: await readFile(tlsCertFile) }, handleRequest)
    : createServer({ ...serverOptions }, handleRequest);
  server.setTimeout(requestTimeoutMs, (socket) => socket.destroy());

  const localHost = ["0.0.0.0", "::"].includes(bindHost) ? "127.0.0.1" : bindHost;
  const localUiOrigin = tlsKeyFile && normalizedPublicUrl
    ? normalizedPublicUrl
    : `${scheme}://${urlHost(localHost)}:${port}`;
  const localUiUrl = `${localUiOrigin}/#relay=${encodeURIComponent(originFor(bindHost))}&local=${localAccessCapability.token}`;
  await privateFileWriter(localUiUrlFile, `${localUiUrl}\n`);
  return {
    server,
    bindHost,
    port,
    inboxCapability: inboxCapability.token,
    inboxUrl: inboxUrlFor(bindHost),
    publicOrigin: originFor(bindHost),
    externalSecure: originFor(bindHost).startsWith("https://"),
    listenerTls: Boolean(tlsKeyFile && tlsCertFile),
    serveStatic,
    localAccessCapability: localAccessCapability.token,
    localUiUrl,
    localUiUrlFile,
    relayReceiptPublicKey: relayReceiptKey.publicKeyHex,
    relayReceiptPublicKeyFingerprint: relayReceiptKey.publicKeyFingerprint,
    relayReceiptKeyId: relayReceiptKey.publicKeyFingerprint,
    relayReceiptKeySource: relayReceiptSigningKeyFile ? "external-configured" : "generated-development",
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
      console.log(`Private local UI URL written to ${runtime.localUiUrlFile} (mode 600); do not print or share its contents.`);
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

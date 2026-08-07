import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, timingSafeEqual, X509Certificate } from "node:crypto";
import { realpathSync } from "node:fs";
import { chmod, lstat, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { purgeInviteCodes } from "./invite-code.mjs";
import { createSqliteRelayStore } from "./storage.mjs";
import { createRelayRequestHandler } from "./routes.mjs";

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
const MAX_BLOB_CHUNK_BYTES = 64 * 1024 + 16;
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

function parseOrigins(value) {
  if (!value) return [];
  return String(value).split(",").map((origin) => normalizePublicUrl(origin.trim())).filter(Boolean);
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
  beforeRelayCommit = null,
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
    const names = await readdir(blobDir);
    const nameSet = new Set(names);
    for (const name of names) {
      if (name.endsWith(".blob") && !nameSet.has(`${name.slice(0, -5)}.meta.json`)) {
        await unlink(join(blobDir, name)).catch(() => {});
        continue;
      }
      if (!name.endsWith(".meta.json")) continue;
      const metaFile = join(blobDir, name);
      const blobFile = join(blobDir, name.replace(/\.meta\.json$/, ".blob"));
      try {
        const meta = JSON.parse(await readFile(metaFile, "utf8"));
        const blobExists = await stat(blobFile).then(() => true).catch(() => false);
        if (!blobExists || !Number.isSafeInteger(meta.expiresAt) || meta.expiresAt <= Date.now()) {
          await unlink(metaFile).catch(() => {});
          await unlink(blobFile).catch(() => {});
        }
      } catch {
        await unlink(metaFile).catch(() => {});
        await unlink(blobFile).catch(() => {});
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
  const relayDatabaseFile = join(dataDir, "relay.sqlite");
  const capabilityState = { inbox: await loadCapability(capabilityFile, "inbox-write", privateFileWriter) };
  const retiredInboxPrefixes = new Set();
  const relayReceiptKey = await loadRelayReceiptKey(dataDir, privateFileWriter, relayReceiptSigningKeyFile);
  let localAccessCapability = await loadCapability(localAccessFile, "local-control", privateFileWriter);
  const relayStore = await createSqliteRelayStore({
    file: relayDatabaseFile,
    inboxLegacyFile: queueFile,
    inviteLegacyFile: inviteCodeFile,
    writeLegacy: privateFileWriter,
    beforeCommit: beforeRelayCommit,
  });
  relayStore.purgeInbox(Date.now() - ttlMs);
  relayStore.purgeInviteCodes(Date.now());
  relayStore.trimInbox(MAX_INBOX_ITEMS);
  const routeState = {
    inbox: relayStore.listInbox(),
    inviteCodes: purgeInviteCodes(relayStore.listInviteCodes()).slice(-MAX_INVITE_CODE_RECORDS),
  };
  const purge = () => {
    const cutoff = Date.now() - ttlMs;
    relayStore.purgeInbox(cutoff);
    routeState.inbox = Array.isArray(routeState.inbox) ? routeState.inbox.filter((item) => Number.isSafeInteger(item.receivedAt) && item.receivedAt >= cutoff).slice(-MAX_INBOX_ITEMS) : [];
  };
  purge();

  const persist = () => {
    purge();
    relayStore.replaceInbox(routeState.inbox);
  };
  const persistInviteCodes = () => {
    routeState.inviteCodes = purgeInviteCodes(routeState.inviteCodes).slice(-MAX_INVITE_CODE_RECORDS);
    relayStore.replaceInviteCodes(routeState.inviteCodes);
  };
  const scheme = tlsKeyFile && tlsCertFile ? "https" : "http";
  const originFor = (address) => normalizedPublicUrl || `${scheme}://${urlHost(address)}:${port}`;
  const inboxUrlFor = (address) => `${originFor(address)}${capabilityPath(capabilityState.inbox.token)}`;
  const rotateInboxCapability = async () => {
    retiredInboxPrefixes.add(capabilityPath(capabilityState.inbox.token));
    capabilityState.inbox = newCapability("inbox-write");
    await privateFileWriter(capabilityFile, `${JSON.stringify(capabilityState.inbox)}\n`);
    return capabilityState.inbox;
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

  const handleRequest = createRelayRequestHandler({
    allowedCorsOrigins,
    bindHost,
    blobDir,
    blobUsage,
    capabilityPath,
    capabilityState,
    capabilityValid,
    consumeRateLimit,
    distDir,
    hasLocalAccess,
    hasRelayCapability,
    inboxUrlFor,
    isLoopbackHost,
    localAccessCapability,
    normalizedPublicUrl,
    originFor,
    persist,
    persistInviteCodes,
    port,
    purge,
    purgeBlobs,
    relayReceiptKey,
    relayReceiptSigningKeyFile,
    requestTimeoutMs,
    retiredInboxPrefixes,
    rotateInboxCapability,
    routeState,
    serveStatic,
    storeId,
    tlsCertFile,
    tlsKeyFile,
    limits: {
      MAX_BLOB_BYTES,
      MAX_BLOB_CHUNK_BYTES,
      MAX_BLOB_RECORDS,
      MAX_BLOB_STORE_BYTES,
      MAX_BLOB_TTL_MS,
      MAX_ENVELOPE_BYTES,
      MAX_INBOX_ITEMS,
      MAX_INVITE_CODE_BODY_BYTES,
      MAX_INVITE_CODE_RECORDS,
      MAX_LOCAL_READS_PER_WINDOW,
      MAX_POSTS_PER_WINDOW,
    },
  });

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
  let relayStoreClosed = false;
  const closeRelayStore = () => {
    if (relayStoreClosed) return;
    relayStoreClosed = true;
    relayStore.close();
  };
  server.once("close", closeRelayStore);
  const close = async () => {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    } else {
      closeRelayStore();
    }
  };
  return {
    server,
    close,
    bindHost,
    port,
    inboxCapability: capabilityState.inbox.token,
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
    let stopping = false;
    const shutdown = async (signal) => {
      if (stopping) return;
      stopping = true;
      try { await runtime.close(); process.exitCode = 0; }
      catch (error) { console.error(`Server shutdown failed after ${signal}: ${error.message}`); process.exitCode = 1; }
    };
    process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
    process.once("SIGINT", () => { void shutdown("SIGINT"); });
    runtime.server.listen(runtime.port, runtime.bindHost, () => {
      console.log(`Another Dimension local server listening at ${runtime.listenerTls ? "https" : "http"}://${runtime.bindHost}:${runtime.port}`);
      console.log(`Advertised origin: ${runtime.publicOrigin}`);
      console.log(`Private local UI URL written to ${runtime.localUiUrlFile} (mode 600); do not print or share its contents.`);
      if (!isLoopbackHost(runtime.bindHost)) console.warn("Warning: non-loopback bind exposes this server to the configured network.");
      if (!isLoopbackHost(runtime.bindHost) && !runtime.externalSecure) console.warn("Warning: remote browser access requires an HTTPS public URL or reverse proxy.");
      if (runtime.externalSecure && !runtime.listenerTls) console.log(`External HTTPS is expected at ${runtime.publicOrigin}; keep the reverse proxy running.`);
    });
  };
  launch().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

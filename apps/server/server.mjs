import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_ENVELOPE_BYTES = 96 * 1024;
const MAX_INBOX_ITEMS = 256;
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDist = resolve(__dirname, "../web/dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(payload);
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "cache-control": "no-store",
  };
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

function capabilityPath(value) {
  return `/api/v1/inbox/${value}`;
}

function storeId(envelope) {
  return createHash("sha256").update(envelope).digest("hex");
}

export async function createLocalServer({
  bindHost = process.env.AD_BIND_HOST || "127.0.0.1",
  port = Number(process.env.AD_PORT || 1422),
  dataDir = process.env.AD_SERVER_DATA_DIR || resolve(process.cwd(), ".another-dimension-server"),
  distDir = process.env.AD_WEB_DIST_DIR || defaultDist,
  publicUrl = process.env.AD_PUBLIC_URL || "",
} = {}) {
  await mkdir(dataDir, { recursive: true });
  const capabilityFile = join(dataDir, "inbox-capability");
  const queueFile = join(dataDir, "inbox.json");
  let inboxCapability;
  try { inboxCapability = (await readFile(capabilityFile, "utf8")).trim(); } catch { inboxCapability = capability(); await writeFile(capabilityFile, `${inboxCapability}\n`, { mode: 0o600 }); }
  let inbox;
  try { inbox = JSON.parse(await readFile(queueFile, "utf8")); } catch { inbox = []; }

  const persist = () => writeFile(queueFile, JSON.stringify(inbox), { mode: 0o600 });
  const originFor = (address) => publicUrl || `http://${address}:${port}`;
  const inboxUrlFor = (address) => `${originFor(address)}${capabilityPath(inboxCapability)}`;

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${bindHost}:${port}`}`);
    const headers = corsHeaders();
    if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }

    if (requestUrl.pathname === "/api/v1/health" && req.method === "GET") {
      json(res, 200, { ok: true, protocol: 1 }, headers);
      return;
    }
    if (requestUrl.pathname === "/api/v1/info" && req.method === "GET") {
      json(res, 200, { protocol: 1, inboxUrl: inboxUrlFor(bindHost), maxEnvelopeBytes: MAX_ENVELOPE_BYTES }, headers);
      return;
    }

    const inboxPrefix = capabilityPath(inboxCapability);
    if (requestUrl.pathname === inboxPrefix && req.method === "GET") {
      json(res, 200, { protocol: 1, items: inbox }, headers);
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "POST") {
      try {
        const body = JSON.parse(await readBody(req));
        const envelope = String(body?.envelope || "").trim();
        if (!envelope.startsWith("ADENVWEB1.") || Buffer.byteLength(envelope) > MAX_ENVELOPE_BYTES) throw new Error("invalid_envelope");
        const id = storeId(envelope);
        if (!inbox.some((item) => item.id === id)) {
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
      try {
        const body = JSON.parse(await readBody(req, 32 * 1024));
        const ids = new Set(Array.isArray(body?.ids) ? body.ids.map(String) : []);
        inbox = inbox.filter((item) => !ids.has(item.id));
        await persist();
        json(res, 200, { acknowledged: ids.size }, headers);
      } catch (error) { json(res, 400, { acknowledged: 0, error: error.message }, headers); }
      return;
    }

    if (req.method !== "GET") { json(res, 405, { error: "method_not_allowed" }, headers); return; }
    const file = safeFile(distDir, requestUrl.pathname);
    try {
      const target = file && await readFile(file).then(() => file).catch(() => null);
      const fallback = target || safeFile(distDir, "/");
      if (!fallback) { json(res, 500, { error: "web_dist_unavailable" }); return; }
      res.writeHead(200, { "content-type": mimeTypes[extname(fallback)] || "application/octet-stream", "cache-control": "no-cache" });
      createReadStream(fallback).pipe(res);
    } catch { json(res, 500, { error: "web_dist_unavailable" }); }
  });

  return { server, bindHost, port, inboxCapability, inboxUrl: inboxUrlFor(bindHost) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtime = await createLocalServer();
  runtime.server.listen(runtime.port, runtime.bindHost, () => {
    console.log(`Another Dimension local server listening at http://${runtime.bindHost}:${runtime.port}`);
    console.log(`Inbox endpoint: ${runtime.inboxUrl}`);
    if (runtime.bindHost !== "127.0.0.1") console.warn("Warning: non-loopback bind exposes this server to the configured network.");
  });
}

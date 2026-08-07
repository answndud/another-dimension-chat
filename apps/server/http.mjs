import { normalize, resolve } from "node:path";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

export function securityHeaders({ api = false, hsts = false } = {}) {
  return {
    "cache-control": api ? "no-store" : "no-cache",
    "content-security-policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; worker-src 'self';",
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

export function corsHeaders(req, allowedOrigins, options = {}) {
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

export function hasJsonContentType(req) {
  return typeof req.headers["content-type"] === "string"
    && req.headers["content-type"].toLowerCase().startsWith("application/json");
}

export async function readBody(req, limit, timeoutMs = 15_000) {
  return readRequest(req, limit, timeoutMs, (chunks) => Buffer.concat(chunks).toString("utf8"));
}

export async function readBodyBuffer(req, limit, timeoutMs = 15_000) {
  return readRequest(req, limit, timeoutMs, (chunks) => Buffer.concat(chunks));
}

async function readRequest(req, limit, timeoutMs, collect) {
  let timer;
  const read = (async () => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new Error("request_too_large");
      chunks.push(chunk);
    }
    return collect(chunks);
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

export function safeFile(distDir, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(distDir, normalize(relative));
  return candidate.startsWith(`${resolve(distDir)}${process.platform === "win32" ? "\\" : "/"}`) ? candidate : null;
}

export function mimeTypeFor(file) {
  const extension = file.slice(file.lastIndexOf("."));
  return mimeTypes[extension] || "application/octet-stream";
}
